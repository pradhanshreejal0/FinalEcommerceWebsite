import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

export const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: "products",
      populate: [
        { path: "category", select: "name" },
        { path: "vendor", select: "storeName" },
      ],
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isPublished) {
      return res.status(404).json({ message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [productId],
      });
    } else {
      const exists = wishlist.products.some(
        (id) => id.toString() === productId
      );
      if (!exists) {
        wishlist.products.push(productId);
        await wishlist.save();
      }
    }

    const populated = await Wishlist.findById(wishlist._id).populate({
      path: "products",
      populate: [
        { path: "category", select: "name" },
        { path: "vendor", select: "storeName" },
      ],
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id).populate({
      path: "products",
      populate: [
        { path: "category", select: "name" },
        { path: "vendor", select: "storeName" },
      ],
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};