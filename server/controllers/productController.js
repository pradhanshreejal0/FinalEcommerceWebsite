import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import Category from "../models/Category.js";
// import { escapeRegex } from "../utils/escapeRegex.js";

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
      price,
      stock,
      images,
      category,
      discountPercentage,
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

    const product = await Product.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      price: productPrice,
      stock: productStock,
      images: Array.isArray(images) ? images : [],
      category: validCategory._id,
      vendor: vendor._id,
      discountPercentage: productDiscount,
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

// Public: Get all published products (with pagination)
export const getProducts = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      minPrice = "",
      maxPrice = "",
      sort = "newest",
      page = 1,
      limit = 20,          // default 20 products per page
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20)); // max 50
    const skip = (pageNum - 1) * limitNum;

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
      const validCategory = await Category.findById(category);
      if (!validCategory) {
        return res.status(400).json({ message: "Selected category does not exist" });
      }

      const children = await Category.find({ parentCategory: category }).select("_id");
      const categoryIds = [validCategory._id, ...children.map((c) => c._id)];
      filter.category = { $in: categoryIds };
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

    // Run count + find in parallel for speed
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter, projection)
        .populate("category", "name parentCategory")
        .populate({
          path: "vendor",
          select: "storeName storeSlug logo banner ",
        })
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
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

    // Customer interest tracker
    await Product.findByIdAndUpdate(product._id, {
      $inc: {
        views: 1,
      },
    });

    res.json(product);
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
      price,
      stock,
      images,
      category,
      isPublished,
      discountPercentage,
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

    // Description
    if (description !== undefined) {
      product.description = String(description).trim();
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
