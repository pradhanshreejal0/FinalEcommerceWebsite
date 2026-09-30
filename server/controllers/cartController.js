import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

/*
|--------------------------------------------------------------------------
| Get Cart
|--------------------------------------------------------------------------
*/

export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user._id,
    }).populate({
      path: "items.product",
      populate: [
        {
          path: "vendor",
          select: "storeName storeSlug logo",
        },
        {
          path: "category",
          select: "name",
        },
      ],
    });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
      });
    }

    res.json(cart);
  } catch (error) {
    console.error("Get cart error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Add Product To Cart
|--------------------------------------------------------------------------
|
| IMPORTANT:
| We intentionally DO NOT check product.stock here.
|
| A customer can order more than the currently listed stock.
| The vendor decides later whether the order can be fulfilled.
|--------------------------------------------------------------------------
*/

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variantKey = "" } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (!product.isPublished) {
      return res.status(400).json({
        message: "This product is not available",
      });
    }

    let resolvedVariantKey = String(variantKey || "").trim();
    let resolvedVariantLabel = "";

    if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
      if (!resolvedVariantKey) {
        return res.status(400).json({
          message: "Please select a product option (size, color, etc.)",
        });
      }
      const match = product.variants.find((v) => v.key === resolvedVariantKey);
      if (!match) {
        return res.status(400).json({
          message: "Selected option is not available",
        });
      }
      if (Number(match.stock) < 1) {
        return res.status(400).json({
          message: "Selected option is out of stock",
        });
      }
      resolvedVariantLabel = match.label || resolvedVariantKey;
    } else {
      resolvedVariantKey = "";
      resolvedVariantLabel = "";
    }

    let cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId.toString() &&
        String(item.variantKey || "") === resolvedVariantKey
    );

    if (existingItem) {
      existingItem.quantity += parsedQuantity;
      if (resolvedVariantLabel) existingItem.variantLabel = resolvedVariantLabel;
    } else {
      cart.items.push({
        product: product._id,
        quantity: parsedQuantity,
        variantKey: resolvedVariantKey,
        variantLabel: resolvedVariantLabel,
      });
    }

    await cart.save();

    await cart.populate({
      path: "items.product",
      populate: [
        {
          path: "vendor",
          select: "storeName storeSlug logo",
        },
        {
          path: "category",
          select: "name",
        },
      ],
    });

    res.status(200).json(cart);
  } catch (error) {
    console.error("Add to cart error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Cart Item Quantity
|--------------------------------------------------------------------------
|
| Again, no stock restriction.
|--------------------------------------------------------------------------
*/

export const updateCartItem = async (req, res) => {
  try {
    // Frontend sends productId in the request body
    const { productId, quantity, variantKey = "" } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const key = String(variantKey || "").trim();
    const item = cart.items.find(
      (item) =>
        item.product.toString() === productId.toString() &&
        String(item.variantKey || "") === key
    );

    if (!item) {
      return res.status(404).json({
        message: "Product is not in cart",
      });
    }

    // No stock restriction
    item.quantity = parsedQuantity;

    await cart.save();

    await cart.populate({
      path: "items.product",
      populate: [
        {
          path: "vendor",
          select: "storeName storeSlug logo",
        },
        {
          path: "category",
          select: "name",
        },
      ],
    });

    res.json(cart);
  } catch (error) {
    console.error("Update cart error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Remove Cart Item
|--------------------------------------------------------------------------
*/

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const key = String(req.query.variantKey || req.body?.variantKey || "").trim();
    cart.items = cart.items.filter((item) => {
      if (item.product.toString() !== productId.toString()) return true;
      // If a variantKey is provided, only remove that variant line
      if (key) return String(item.variantKey || "") !== key;
      // No key: remove all lines for this product
      return false;
    });

    await cart.save();

    await cart.populate({
      path: "items.product",
      populate: [
        {
          path: "vendor",
          select: "storeName storeSlug logo",
        },
        {
          path: "category",
          select: "name",
        },
      ],
    });

    res.json(cart);
  } catch (error) {
    console.error("Remove cart item error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Clear Cart
|--------------------------------------------------------------------------
*/

export const clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
      });
    } else {
      cart.items = [];
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    console.error("Clear cart error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};
