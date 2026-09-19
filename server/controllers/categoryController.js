import Category from "../models/Category.js";
import cloudinary from "../config/cloudinary.js";

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
};

/**
 * Validate parent category.
 *
 * Rules:
 * 1. Parent must exist.
 * 2. A category cannot be its own parent.
 * 3. Only top-level categories can be parents.
 */
const validateParentCategory = async (categoryId, parentCategory) => {
  if (!parentCategory) {
    return null;
  }

  if (!isValidObjectId(parentCategory)) {
    return "Invalid parent category";
  }

  if (
    categoryId &&
    String(categoryId) === String(parentCategory)
  ) {
    return "A category cannot be its own parent";
  }

  const parent = await Category.findById(parentCategory);

  if (!parent) {
    return "Parent category not found";
  }

  // Prevent:
  // Electronics
  //   -> Mobile
  //       -> Android
  //
  // We only want two levels.
  if (parent.parentCategory) {
    return "Only top-level categories can be selected as parents";
  }

  return null;
};

/**
 * CREATE CATEGORY
 */
export const createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

    const parentCategory =
      req.body.parentCategory || null;

    const image = req.body.image || "";

    const icon = req.body.icon || "";

    const iconPublicId =
      req.body.iconPublicId || "";

    if (!name) {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    const slug = slugify(name);

    if (!slug) {
      return res.status(400).json({
        message: "Invalid category name",
      });
    }

    // Check duplicate name OR slug
    const existing = await Category.findOne({
      $or: [
        { name },
        { slug },
      ],
    });

    if (existing) {
      return res.status(400).json({
        message: "Category already exists",
      });
    }

    // Validate parent
    const parentError =
      await validateParentCategory(
        null,
        parentCategory
      );

    if (parentError) {
      return res.status(400).json({
        message: parentError,
      });
    }

    // SVG only allowed for parent categories
    if (parentCategory && icon) {
      return res.status(400).json({
        message:
          "SVG icons can only be added to parent categories",
      });
    }

    const category = await Category.create({
      name,
      slug,
      image,

      // Child categories cannot have SVG icons
      icon: parentCategory ? "" : icon,

      iconPublicId: parentCategory
        ? ""
        : iconPublicId,

      parentCategory,

      createdBy: req.user._id,
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error(
      "Create category error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Failed to create category",
    });
  }
};

/**
 * GET ALL CATEGORIES
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate(
        "parentCategory",
        "name slug icon"
      )
      .sort({
        name: 1,
      });

    return res.json(categories);
  } catch (error) {
    console.error(
      "Get categories error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Failed to load categories",
    });
  }
};

/**
 * UPDATE CATEGORY
 */
export const updateCategory = async (req, res) => {
  try {
    const category =
      await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const name =
      req.body.name !== undefined
        ? String(req.body.name).trim()
        : category.name;

    const parentCategory =
      req.body.parentCategory !== undefined
        ? req.body.parentCategory || null
        : category.parentCategory;

    const image =
      req.body.image !== undefined
        ? req.body.image
        : category.image;

    const icon =
      req.body.icon !== undefined
        ? req.body.icon
        : category.icon;

    const iconPublicId =
      req.body.iconPublicId !== undefined
        ? req.body.iconPublicId
        : category.iconPublicId;

    if (!name) {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    const parentError =
      await validateParentCategory(
        category._id,
        parentCategory
      );

    if (parentError) {
      return res.status(400).json({
        message: parentError,
      });
    }

    // Subcategories cannot have SVG icons
    if (parentCategory && icon) {
      return res.status(400).json({
        message:
          "SVG icons can only be added to parent categories",
      });
    }

    const slug = slugify(name);

    // Check duplicate name/slug excluding current category
    const duplicate =
      await Category.findOne({
        _id: {
          $ne: category._id,
        },

        $or: [
          { name },
          { slug },
        ],
      });

    if (duplicate) {
      return res.status(400).json({
        message:
          "Another category with this name already exists",
      });
    }

    /*
     * If this category is being changed from:
     *
     * Parent
     *   ↓
     * Subcategory
     *
     * remove its old SVG from Cloudinary.
     */
    if (
      parentCategory &&
      category.iconPublicId
    ) {
      try {
        await cloudinary.uploader.destroy(
          category.iconPublicId,
          {
            resource_type: "image",
          }
        );
      } catch (error) {
        console.error(
          "Failed to remove old category icon:",
          error.message
        );
      }

      category.icon = "";
      category.iconPublicId = "";
    }

    category.name = name;
    category.slug = slug;
    category.image = image;
    category.parentCategory =
      parentCategory;

    /*
     * Parent category
     */
    if (!parentCategory) {
      category.icon = icon;
      category.iconPublicId =
        iconPublicId;
    }

    await category.save();

    return res.json(category);
  } catch (error) {
    console.error(
      "Update category error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Failed to update category",
    });
  }
};

/**
 * DELETE CATEGORY
 */
export const deleteCategory = async (req, res) => {
  try {
    const category =
      await Category.findById(
        req.params.id
      );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // Don't allow deleting a category
    // while it still has children.
    const hasChildren =
      await Category.exists({
        parentCategory:
          category._id,
      });

    if (hasChildren) {
      return res.status(400).json({
        message:
          "Cannot delete a category that has subcategories",
      });
    }

    // Remove SVG from Cloudinary
    if (category.iconPublicId) {
      try {
        await cloudinary.uploader.destroy(
          category.iconPublicId,
          {
            resource_type: "image",
          }
        );
      } catch (error) {
        console.error(
          "Failed to remove category icon:",
          error.message
        );
      }
    }

    await Category.findByIdAndDelete(
      category._id
    );

    return res.json({
      message: "Category deleted",
    });
  } catch (error) {
    console.error(
      "Delete category error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Failed to delete category",
    });
  }
};
