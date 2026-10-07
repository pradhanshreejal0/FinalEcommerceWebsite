import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import Category from "../models/Category.js";
import Order from "../models/Order.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { buildBestSellerPipeline, orderProductsBySales } from "../utils/productRanking.js";


// Normalize vendor description sections (max 4). Also builds a plain-text description for search.
const normalizeDescriptionSections = (sections, fallbackDescription = "") => {
  let list = Array.isArray(sections) ? sections : [];
  list = list
    .slice(0, 4)
    .map((s) => ({
      title: s?.title != null ? String(s.title).trim() : "",
      content: s?.content != null ? String(s.content).trim() : "",
    }))
    .filter((s) => s.title || s.content);

  // If no structured sections but a plain description was provided, treat it as one section
  if (list.length === 0 && fallbackDescription && String(fallbackDescription).trim()) {
    list = [{ title: "", content: String(fallbackDescription).trim() }];
  }

  const plain = list
    .map((s) => [s.title, s.content].filter(Boolean).join(": "))
    .filter(Boolean)
    .join("\n\n");

  return { sections: list, plain };
};

const VALID_DESCRIPTION_STYLES = ["paragraphs", "cards", "tabs", "accordion", "list"];

// Build stable variant key + label from attribute list
const buildVariantKeyAndLabel = (attributes) => {
  const cleaned = (Array.isArray(attributes) ? attributes : [])
    .map((a) => ({
      name: String(a?.name || "").trim(),
      value: String(a?.value || "").trim(),
    }))
    .filter((a) => a.name && a.value)
    .sort((a, b) => a.name.localeCompare(b.name));

  const key = cleaned.map((a) => `${a.name}:${a.value}`).join("|");
  const label = cleaned.map((a) => `${a.name}: ${a.value}`).join(" / ");
  return { key, label, attributes: cleaned };
};

/** Normalize vendor-submitted variants. Returns { hasVariants, variants, price, stock }. */
const normalizeProductVariants = ({
  hasVariants,
  variants,
  price,
  stock,
}) => {
  const enabled =
    hasVariants === true ||
    hasVariants === "true" ||
    hasVariants === 1 ||
    hasVariants === "1";

  if (!enabled) {
    return {
      hasVariants: false,
      variants: [],
      // caller still validates base price/stock
      price: price,
      stock: stock,
    };
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    const err = new Error(
      "Add at least one variant (e.g. size or color) when variants are enabled"
    );
    err.statusCode = 400;
    throw err;
  }

  if (variants.length > 100) {
    const err = new Error("Maximum 100 variants per product");
    err.statusCode = 400;
    throw err;
  }

  const seen = new Set();
  const normalized = [];

  for (const raw of variants) {
    const { key, label, attributes } = buildVariantKeyAndLabel(
      raw?.attributes
    );

    if (!key || attributes.length === 0) {
      const err = new Error(
        "Each variant needs at least one option (name + value), e.g. Size / M"
      );
      err.statusCode = 400;
      throw err;
    }

    if (seen.has(key)) {
      const err = new Error(`Duplicate variant: ${label}`);
      err.statusCode = 400;
      throw err;
    }
    seen.add(key);

    const vPrice = Number(raw?.price);
    const vStock = Number(raw?.stock);

    if (!Number.isFinite(vPrice) || vPrice < 0) {
      const err = new Error(`Invalid price for variant "${label}"`);
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isFinite(vStock) || vStock < 0 || !Number.isInteger(vStock)) {
      const err = new Error(
        `Invalid stock for variant "${label}" (must be whole number ≥ 0)`
      );
      err.statusCode = 400;
      throw err;
    }

    normalized.push({
      key,
      label,
      attributes,
      price: vPrice,
      stock: vStock,
      sku: raw?.sku != null ? String(raw.sku).trim() : "",
    });
  }

  const totalStock = normalized.reduce((s, v) => s + v.stock, 0);
  const minPrice = Math.min(...normalized.map((v) => v.price));

  return {
    hasVariants: true,
    variants: normalized,
    price: minPrice,
    stock: totalStock,
  };
};




// Helper: get approved vendor profile of logged-in user
const getVendorByUser = async (userId) => {
  return Vendor.findOne({
    user: userId,
    status: "approved",
  });
};

// Helper: validate category
const getValidCategory = async (categoryId) => {
  if (!categoryId) {
    return null;
  }

  return Category.findById(categoryId);
};

// Vendor: Create product
export const createProduct = async (req, res) => {
  try {
    const vendor = await getVendorByUser(req.user._id);

    if (!vendor) {
      return res.status(403).json({
        message: "Vendor account not approved",
      });
    }

    const {
      title,
      description,
      descriptionSections,
      descriptionStyle,
      price,
      stock,
      images,
      category,
      discountPercentage,
      hasVariants,
      variants,
    } = req.body;

    // Validate title
    if (!title || !String(title).trim()) {
      return res.status(400).json({
        message: "Product title is required",
      });
    }

    // Validate price
    const productPrice = Number(price);

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid number greater than or equal to 0",
      });
    }

    // Validate stock
    const productStock = Number(stock);

    if (!Number.isFinite(productStock) || productStock < 0) {
      return res.status(400).json({
        message: "Stock must be a valid number greater than or equal to 0",
      });
    }

    // Validate category
    if (!category) {
      return res.status(400).json({
        message: "Product category is required",
      });
    }

    const validCategory = await getValidCategory(category);

    if (!validCategory) {
      return res.status(400).json({
        message: "Selected category does not exist",
      });
    }

    // Validate images
    if (images !== undefined && !Array.isArray(images)) {
      return res.status(400).json({
        message: "Images must be an array",
      });
    }

    // Validate discount
    let productDiscount = 0;

    if (discountPercentage !== undefined && discountPercentage !== "") {
      productDiscount = Number(discountPercentage);

      if (
        !Number.isFinite(productDiscount) ||
        productDiscount < 0 ||
        productDiscount > 90
      ) {
        return res.status(400).json({
          message: "Discount percentage must be a number between 0 and 90",
        });
      }
    }

    const { sections, plain } = normalizeDescriptionSections(
      descriptionSections,
      description
    );
    const style = VALID_DESCRIPTION_STYLES.includes(descriptionStyle)
      ? descriptionStyle
      : "paragraphs";

    let finalPrice = productPrice;
    let finalStock = productStock;
    let finalHasVariants = false;
    let finalVariants = [];

    try {
      const normalized = normalizeProductVariants({
        hasVariants,
        variants,
        price: productPrice,
        stock: productStock,
      });
      finalHasVariants = normalized.hasVariants;
      finalVariants = normalized.variants;
      if (normalized.hasVariants) {
        finalPrice = normalized.price;
        finalStock = normalized.stock;
      }
    } catch (normErr) {
      return res.status(normErr.statusCode || 400).json({
        message: normErr.message,
      });
    }

    const product = await Product.create({
      title: String(title).trim(),
      description: plain,
      descriptionSections: sections,
      descriptionStyle: style,
      price: finalPrice,
      stock: finalStock,
      images: Array.isArray(images) ? images : [],
      category: validCategory._id,
      vendor: vendor._id,
      discountPercentage: productDiscount,
      hasVariants: finalHasVariants,
      variants: finalVariants,
    });

    const createdProduct = await Product.findById(product._id)
      .populate("category", "name parentCategory")
      .populate({
        path: "vendor",
        select: "storeName storeSlug logo banner",
      });

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Create product error:", error);

    // Invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid category or product ID",
      });
    }

    res.status(500).json({
      message: error.message || "Failed to create product",
    });
  }
};

// Vendor: Get own products
export const getMyProducts = async (req, res) => {
  try {
    const vendor = await getVendorByUser(req.user._id);

    if (!vendor) {
      return res.status(403).json({
        message: "Vendor account not approved",
      });
    }

    const filter = {
      vendor: vendor._id,
    };

    // Low-stock filter
    if (req.query.lowStock === "true") {
      filter.stock = {
        $lte: 5,
      };
    }

    const products = await Product.find(filter)
      .populate("category", "name parentCategory")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("Get vendor products error:", error);

    res.status(500).json({
      message: error.message || "Failed to load products",
    });
  }
};

// Public: "Search as you type" suggestions for the navbar search box.
// Returns a small handful of best matches plus the total match count,
// so the UI can show "See all N results" once there are more matches
// than fit in the dropdown.
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const term = String(q).trim();

    // Skip 1-character queries — they'd match almost everything and
    // fire an expensive, mostly-useless request on every keystroke.
    if (term.length < 2) {
      return res.json({ query: term, results: [], total: 0 });
    }

    const SUGGESTION_LIMIT = 8;

    // The main product listing uses $text search (see getProducts below)
    // because it's fast and index-backed, but $text only matches whole
    // (stemmed) words. Typeahead needs *partial*-word matching — typing
    // "sun" should already match "Sunglasses" — so we use a regex here
    // instead. escapeRegex keeps user input safe to drop into a RegExp,
    // and capping the result set with .limit() keeps each query cheap
    // even without an index behind it.
    const safeTerm = escapeRegex(term);
    const pattern = new RegExp(safeTerm, "i");

    const filter = {
      isPublished: true,
      $or: [{ title: pattern }, { description: pattern }],
    };

    const [total, results] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("title price discountPercentage images stock")
        .sort({ createdAt: -1 })
        .limit(SUGGESTION_LIMIT)
        .lean(),
    ]);

    res.json({ query: term, results, total });
  } catch (error) {
    console.error("Search suggestions error:", error);
    res.status(500).json({
      message: error.message || "Failed to load search suggestions",
    });
  }
};

/**
 * Vendor: Generate a product description with AI (Gemini).
 * Requires GEMINI_API_KEY in server env. Falls back to a template if missing.
 */
export const generateProductDescription = async (req, res) => {
  try {
    const { title = "", categoryName = "", keywords = "" } = req.body || {};
    const productTitle = String(title).trim();

    if (!productTitle) {
      return res.status(400).json({
        message: "Product title is required to generate a description",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      // Graceful offline/template fallback so the UI still works without a key
      const fallback = [
        `${productTitle} is a carefully selected product designed for everyday use.`,
        categoryName
          ? `Perfect for customers looking for quality ${categoryName.toLowerCase()}.`
          : "Built with attention to detail and lasting performance.",
        keywords
          ? `Highlights include: ${keywords}.`
          : "Order now and enjoy reliable quality with fast fulfillment.",
      ]
        .filter(Boolean)
        .join(" ");

      return res.json({
        description: fallback,
        source: "template",
        message:
          "GEMINI_API_KEY not set — returned a template description. Add the key for AI-generated copy.",
      });
    }

    const prompt = `Write a compelling e-commerce product description (2–4 short paragraphs, max 120 words) for this product.
Title: ${productTitle}
${categoryName ? `Category: ${categoryName}` : ""}
${keywords ? `Keywords / features: ${keywords}` : ""}

Tone: professional, persuasive, customer-focused. Do not use markdown headings. Do not invent fake certifications or prices. Return only the description text.`;

    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("Gemini API error:", response.status, errText);
      return res.status(502).json({
        message: "AI service failed. Please try again or write the description manually.",
      });
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n")
        ?.trim() || "";

    if (!text) {
      return res.status(502).json({
        message: "AI returned an empty description. Try again.",
      });
    }

    res.json({ description: text, source: "gemini" });
  } catch (error) {
    console.error("generateProductDescription error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate description",
    });
  }
};

// Public: Get all published products (with pagination)
export const getProducts = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      minPrice = "",
      maxPrice = "",
      sort = "newest",
      section = "",
      page = 1,
      limit = 20,
      includeTotal = "true",
      compact = "false",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    const shouldIncludeTotal = includeTotal !== "false";
    const compactResponse = compact === "true";

    const filter = {
      isPublished: true,
    };

    // Full-text search using the text index already defined on the schema
    // (`{ title: "text", description: "text" }`). Uses the index, gives
    // relevance ranking (via textScore) and basic word-stemming
    // (e.g. "shoe" also matches "shoes").
    const searchTerm = search.trim();
    if (searchTerm) {
      filter.$text = { $search: searchTerm };
    }

    // Category filter
    if (category) {
      // One query instead of a parent lookup followed by a child lookup.
      // This matters on every filtered Shop request.
      const categoryIds = await Category.find({
        $or: [{ _id: category }, { parentCategory: category }],
      })
        .select("_id")
        .lean();

      if (categoryIds.length === 0) {
        return res.status(400).json({ message: "Selected category does not exist" });
      }

      filter.category = {
        $in: categoryIds.map((item) => item._id),
      };
    }

    // Price filter
    if (minPrice !== "" || maxPrice !== "") {
      filter.price = {};
      if (minPrice !== "") {
        const minimum = Number(minPrice);
        if (!Number.isFinite(minimum) || minimum < 0) {
          return res.status(400).json({ message: "Invalid minimum price" });
        }
        filter.price.$gte = minimum;
      }
      if (maxPrice !== "") {
        const maximum = Number(maxPrice);
        if (!Number.isFinite(maximum) || maximum < 0) {
          return res.status(400).json({ message: "Invalid maximum price" });
        }
        filter.price.$lte = maximum;
      }
      if (
        filter.price.$gte !== undefined &&
        filter.price.$lte !== undefined &&
        filter.price.$gte > filter.price.$lte
      ) {
        return res.status(400).json({
          message: "Minimum price cannot be greater than maximum price",
        });
      }
    }

    // Sorting — default to relevance when searching (unless the caller
    // explicitly asked for a price/oldest sort, which still wins).
    let sortOption = { createdAt: -1 };
    let projection = null;

    if (searchTerm) {
      projection = { score: { $meta: "textScore" } };
      sortOption = { score: { $meta: "textScore" } };
    }

    if (sort === "price_asc") sortOption = { price: 1 };
    if (sort === "price_desc") sortOption = { price: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };

    let findProjection = projection;

    if (compactResponse) {
      // Product cards do not need descriptions, variants, timestamps, views,
      // or other large fields. Keep the full response available for detail/admin pages.
      findProjection = {
        title: 1,
        price: 1,
        images: 1,
        category: 1,
        vendor: 1,
        discountPercentage: 1,
        ratings: 1,
        stock: 1,
        ...(searchTerm ? { score: { $meta: "textScore" } } : {}),
      };
    }

    const productsQuery = Product.find(filter, findProjection)
      .populate("category", "name parentCategory")
      .populate({
        path: "vendor",
        select: compactResponse ? "storeName storeSlug logo" : "storeName storeSlug logo banner",
      })
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean();

    let products;
    let total = null;

    if (shouldIncludeTotal) {
      [products, total] = await Promise.all([
        productsQuery,
        Product.countDocuments(filter),
      ]);
    } else {
      products = await productsQuery;
    }

    // Home sections share the public listing filters; only their ranking differs.
    if (["bestsellers", "featured"].includes(section)) {
      if (section === "bestsellers") {
        const sales = await Order.aggregate(buildBestSellerPipeline());
        const rankedIds = sales.map((item) => item._id);
        const rankedProducts = await Product.find({
          ...filter,
          _id: { $in: rankedIds },
        }, findProjection)
          .populate("category", "name parentCategory")
          .populate({
            path: "vendor",
            select: compactResponse ? "storeName storeSlug logo" : "storeName storeSlug logo banner",
          })
          .lean();
        products = orderProductsBySales(rankedProducts, sales).slice(skip, skip + limitNum);
      } else {
        products = await Product.find(filter, findProjection)
          .populate("category", "name parentCategory")
          .populate({
            path: "vendor",
            select: compactResponse ? "storeName storeSlug logo" : "storeName storeSlug logo banner",
          })
          .sort({ "ratings.average": -1, "ratings.count": -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
      }
    }

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: total == null ? null : Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid category ID" });
    }
    res.status(500).json({
      message: error.message || "Failed to load products",
    });
  }
};

// Public: Get single product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name parentCategory")
      .populate({
        path: "vendor",
        select: "storeName storeSlug logo banner phone",
      })
      .lean();

    if (!product || !product.isPublished) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Do not make the customer wait for analytics. The product response is
    // the critical path; view tracking can finish in the background.
    res.json(product);

    void Product.updateOne(
      { _id: product._id },
      { $inc: { views: 1 } }
    ).catch((error) => {
      console.error("Failed to update product view:", error);
    });
  } catch (error) {
    console.error("Get product error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    res.status(500).json({
      message: error.message || "Failed to load product",
    });
  }
};

// Vendor: Update own product
export const updateProduct = async (req, res) => {
  try {
    const vendor = await getVendorByUser(req.user._id);

    if (!vendor) {
      return res.status(403).json({
        message: "Vendor account not approved",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      vendor: vendor._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const {
      title,
      description,
      descriptionSections,
      descriptionStyle,
      price,
      stock,
      images,
      category,
      isPublished,
      discountPercentage,
      hasVariants,
      variants,
    } = req.body;

    // Validate title
    if (title !== undefined) {
      const trimmedTitle = String(title).trim();

      if (!trimmedTitle) {
        return res.status(400).json({
          message: "Product title cannot be empty",
        });
      }

      product.title = trimmedTitle;
    }

    // Description sections + style (vendor-controlled layout)
    if (descriptionSections !== undefined || description !== undefined) {
      const { sections, plain } = normalizeDescriptionSections(
        descriptionSections !== undefined
          ? descriptionSections
          : product.descriptionSections,
        description !== undefined ? description : product.description
      );
      product.descriptionSections = sections;
      product.description = plain;
    }
    if (descriptionStyle !== undefined) {
      product.descriptionStyle = VALID_DESCRIPTION_STYLES.includes(descriptionStyle)
        ? descriptionStyle
        : product.descriptionStyle || "paragraphs";
    }

    // Price
    if (price !== undefined) {
      const productPrice = Number(price);

      if (!Number.isFinite(productPrice) || productPrice < 0) {
        return res.status(400).json({
          message:
            "Price must be a valid number greater than or equal to 0",
        });
      }

      product.price = productPrice;
    }

    // Stock
    if (stock !== undefined) {
      const productStock = Number(stock);

      if (!Number.isFinite(productStock) || productStock < 0) {
        return res.status(400).json({
          message:
            "Stock must be a valid number greater than or equal to 0",
        });
      }

      product.stock = productStock;
    }

    // Variants (size, color, volume, etc.)
    if (hasVariants !== undefined || variants !== undefined) {
      try {
        const normalized = normalizeProductVariants({
          hasVariants:
            hasVariants !== undefined ? hasVariants : product.hasVariants,
          variants: variants !== undefined ? variants : product.variants,
          price: price !== undefined ? Number(price) : product.price,
          stock: stock !== undefined ? Number(stock) : product.stock,
        });
        product.hasVariants = normalized.hasVariants;
        product.variants = normalized.variants;
        if (normalized.hasVariants) {
          product.price = normalized.price;
          product.stock = normalized.stock;
        } else if (price === undefined && stock === undefined) {
          // cleared variants — keep existing base price/stock unless provided
        }
      } catch (normErr) {
        return res.status(normErr.statusCode || 400).json({
          message: normErr.message,
        });
      }
    }

    // Images
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          message: "Images must be an array",
        });
      }

      product.images = images;
    }

    // Category
    if (category !== undefined) {
      const validCategory = await getValidCategory(category);

      if (!validCategory) {
        return res.status(400).json({
          message: "Selected category does not exist",
        });
      }

      product.category = validCategory._id;
    }

    // Publish/unpublish
    if (isPublished !== undefined) {
      product.isPublished = Boolean(isPublished);
    }

    // Discount
    if (discountPercentage !== undefined) {
      const productDiscount = Number(discountPercentage);

      if (
        !Number.isFinite(productDiscount) ||
        productDiscount < 0 ||
        productDiscount > 90
      ) {
        return res.status(400).json({
          message: "Discount percentage must be a number between 0 and 90",
        });
      }

      product.discountPercentage = productDiscount;
    }

    await product.save();

    const updatedProduct = await Product.findById(product._id)
      .populate("category", "name parentCategory")
      .populate({
        path: "vendor",
        select: "storeName storeSlug logo banner phone",
      });

    res.json(updatedProduct);
  } catch (error) {
    console.error("Update product error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid product or category ID",
      });
    }

    res.status(500).json({
      message: error.message || "Failed to update product",
    });
  }
};

// Vendor: Delete own product
export const deleteProduct = async (req, res) => {
  try {
    const vendor = await getVendorByUser(req.user._id);

    if (!vendor) {
      return res.status(403).json({
        message: "Vendor account not approved",
      });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      vendor: vendor._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    res.status(500).json({
      message: error.message || "Failed to delete product",
    });
  }
};
