import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  FolderTree,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/context/AuthContext";
import { api, uploadCategoryIcon } from "@/lib/api";
import { CategoryIcon } from "@/components/CategoryIcon";

const EMPTY_FORM = {
  name: "",
  parentCategory: "",
  image: "",
  icon: "",
  iconPublicId: "",
};

export default function Categories() {
  const { accessToken } = useAuth();

  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  /*
   * =========================================================
   * NORMALIZE API RESPONSE
   * =========================================================
   */

  const normalizeCategories = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.categories)) {
      return response.categories;
    }

    return [];
  };

  /*
   * =========================================================
   * LOAD CATEGORIES
   * =========================================================
   */

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api("/categories");

      console.log("GET /categories:", response);

      const data = normalizeCategories(response);

      setCategories(data);
    } catch (err) {
      console.error("Load categories error:", err);

      setError(
        err?.message ||
          "Failed to load categories."
      );

      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  /*
   * =========================================================
   * ONLY TOP LEVEL CATEGORIES CAN BE PARENTS
   * =========================================================
   */

  const parentCategories = useMemo(() => {
    return categories.filter((category) => {
      const parentId =
        typeof category?.parentCategory === "object"
          ? category?.parentCategory?._id
          : category?.parentCategory;

      return (
        !parentId &&
        category?._id !== editingCategory?._id
      );
    });
  }, [categories, editingCategory]);

  /*
   * =========================================================
   * RESET FORM
   * =========================================================
   */

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingCategory(null);
    setError("");
  };

  /*
   * =========================================================
   * CREATE
   * =========================================================
   */

  const openCreateDialog = () => {
    resetForm();
    setSuccess("");
    setDialogOpen(true);
  };

  /*
   * =========================================================
   * EDIT
   * =========================================================
   */

  const openEditDialog = (category) => {
    const parentId =
      typeof category?.parentCategory === "object"
        ? category?.parentCategory?._id
        : category?.parentCategory;

    setEditingCategory(category);

    setFormData({
      name: category?.name || "",
      parentCategory: parentId || "",
      image: category?.image || "",
      icon: category?.icon || "",
      iconPublicId: category?.iconPublicId || "",
    });

    setError("");
    setSuccess("");
    setDialogOpen(true);
  };

  /*
   * =========================================================
   * CLOSE DIALOG
   * =========================================================
   */

  const closeDialog = () => {
    if (
      saving ||
      uploadingIcon ||
      uploadingImage
    ) {
      return;
    }

    setDialogOpen(false);
    resetForm();
  };

  /*
   * =========================================================
   * INPUT CHANGE
   * =========================================================
   */

  const handleInputChange = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /*
   * =========================================================
   * PARENT CHANGE
   * =========================================================
   */

  const handleParentChange = (value) => {
    /*
     * NONE = create parent category
     */

    if (value === "none") {
      setFormData((previous) => ({
        ...previous,
        parentCategory: "",
      }));

      return;
    }

    /*
     * Selected parent = create subcategory
     *
     * Subcategories cannot have SVG icons.
     */

    setFormData((previous) => ({
      ...previous,
      parentCategory: value,
      icon: "",
      iconPublicId: "",
    }));
  };

  /*
   * =========================================================
   * SVG UPLOAD
   * =========================================================
   */

  const handleSvgUpload = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (formData.parentCategory) {
      setError(
        "SVG icons are only allowed for parent categories."
      );
      return;
    }

    if (file.type !== "image/svg+xml") {
      setError(
        "Only SVG files are allowed for category icons."
      );
      return;
    }

    if (file.size > 500 * 1024) {
      setError(
        "SVG icon must be smaller than 500KB."
      );
      return;
    }

    try {
      setUploadingIcon(true);
      setError("");
      setSuccess("");

      const result = await uploadCategoryIcon(
        file,
        accessToken
      );

      console.log("SVG upload result:", result);

      const iconUrl =
        result?.url ||
        result?.secure_url ||
        result?.data?.url ||
        result?.data?.secure_url ||
        "";

      const publicId =
        result?.public_id ||
        result?.data?.public_id ||
        "";

      if (!iconUrl) {
        throw new Error(
          "SVG uploaded but no URL was returned."
        );
      }

      setFormData((previous) => ({
        ...previous,
        icon: iconUrl,
        iconPublicId: publicId,
      }));

      setSuccess(
        "SVG icon uploaded successfully."
      );
    } catch (err) {
      console.error("SVG upload error:", err);

      setError(
        err?.message ||
          "Failed to upload SVG icon."
      );
    } finally {
      setUploadingIcon(false);
    }
  };

  /*
   * =========================================================
   * IMAGE UPLOAD
   * =========================================================
   */

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file."
      );
      return;
    }

    try {
      setUploadingImage(true);
      setError("");
      setSuccess("");

      const form = new FormData();

      form.append("image", file);

      const apiBase =
        import.meta.env.VITE_API_URL ||
        "https://finalecommercewebsite-backend.onrender.com/api";

      const response = await fetch(
        `${apiBase}/upload`,
        {
          method: "POST",
          credentials: "include",

          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {},

          body: form,
        }
      );

      const text = await response.text();

      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = {
          message: text,
        };
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Image upload failed."
        );
      }

      const imageUrl =
        data?.url ||
        data?.secure_url ||
        data?.data?.url ||
        data?.data?.secure_url;

      if (!imageUrl) {
        throw new Error(
          "Image uploaded but no image URL was returned."
        );
      }

      setFormData((previous) => ({
        ...previous,
        image: imageUrl,
      }));

      setSuccess(
        "Category image uploaded successfully."
      );
    } catch (err) {
      console.error(
        "Category image upload error:",
        err
      );

      setError(
        err?.message ||
          "Failed to upload category image."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  /*
   * =========================================================
   * REMOVE SVG
   * =========================================================
   */

  const removeSvg = () => {
    setFormData((previous) => ({
      ...previous,
      icon: "",
      iconPublicId: "",
    }));
  };

  /*
   * =========================================================
   * REMOVE IMAGE
   * =========================================================
   */

  const removeImage = () => {
    setFormData((previous) => ({
      ...previous,
      image: "",
    }));
  };

  /*
   * =========================================================
   * CREATE / UPDATE
   * =========================================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = formData.name.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    /*
     * Subcategories cannot have SVG icons.
     */

    if (
      formData.parentCategory &&
      formData.icon
    ) {
      setError(
        "Subcategories cannot have SVG icons."
      );
      return;
    }

    /*
     * Build payload.
     */

    const payload = {
      name,

      image:
        formData.image?.trim() || "",

      parentCategory:
        formData.parentCategory || null,
    };

    /*
     * Parent categories can have SVG icons.
     */

    if (!formData.parentCategory) {
      payload.icon =
        formData.icon?.trim() || "";

      payload.iconPublicId =
        formData.iconPublicId?.trim() || "";
    }

    console.log("CATEGORY PAYLOAD:", payload);

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      let response;

      if (editingCategory) {
        response = await api(
          `/categories/${editingCategory._id}`,
          {
            method: "PUT",
            accessToken,
            body: payload,
          }
        );
      } else {
        response = await api(
          "/categories",
          {
            method: "POST",
            accessToken,
            body: payload,
          }
        );
      }

      console.log(
        "CATEGORY SAVE RESPONSE:",
        response
      );

      setSuccess(
        editingCategory
          ? "Category updated successfully."
          : "Category created successfully."
      );

      await loadCategories();

      setTimeout(() => {
        setDialogOpen(false);
        resetForm();
      }, 500);
    } catch (err) {
      console.error(
        "Save category error:",
        err
      );

      setError(
        err?.message ||
          "Failed to save category."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

  const openDeleteDialog = (category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api(
        `/categories/${categoryToDelete._id}`,
        {
          method: "DELETE",
          accessToken,
        }
      );

      setSuccess(
        "Category deleted successfully."
      );

      setDeleteDialogOpen(false);
      setCategoryToDelete(null);

      await loadCategories();
    } catch (err) {
      console.error(
        "Delete category error:",
        err
      );

      setError(
        err?.message ||
          "Failed to delete category."
      );
    }
  };

  /*
   * =========================================================
   * PARENT NAME
   * =========================================================
   */

  const getParentName = (category) => {
    if (!category?.parentCategory) {
      return null;
    }

    if (
      typeof category.parentCategory === "object"
    ) {
      return (
        category.parentCategory?.name ||
        "Unknown"
      );
    }

    const parent = categories.find(
      (item) =>
        String(item._id) ===
        String(category.parentCategory)
    );

    return parent?.name || "Unknown";
  };

  /*
   * =========================================================
   * SUBCATEGORY
   * =========================================================
   */

  const isSubcategory = (category) => {
    if (!category?.parentCategory) {
      return false;
    }

    if (
      typeof category.parentCategory === "object"
    ) {
      return Boolean(
        category.parentCategory?._id
      );
    }

    return Boolean(category.parentCategory);
  };

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="w-full space-y-6 p-4 md:p-6 lg:p-8">

      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="h-6 w-6" />

            <h1 className="text-2xl font-bold tracking-tight">
              Categories
            </h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage parent categories and
            subcategories for your store.
          </p>
        </div>

        <Button
          onClick={openCreateDialog}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* SUCCESS */}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ERROR */}

      {error && !dialogOpen && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* TABLE */}

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">

        <Table>

          <TableHeader>
            <TableRow>

              <TableHead className="w-20">
                Icon
              </TableHead>

              <TableHead>
                Category
              </TableHead>

              <TableHead>
                Type
              </TableHead>

              <TableHead>
                Parent
              </TableHead>

              <TableHead>
                Image
              </TableHead>

              <TableHead className="text-right">
                Actions
              </TableHead>

            </TableRow>
          </TableHeader>

          <TableBody>

            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading categories...
                  </div>
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">

                    <FolderTree className="h-8 w-8" />

                    <p>
                      No categories found.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateDialog}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first category
                    </Button>

                  </div>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => {
                const subcategory =
                  isSubcategory(category);

                return (
                  <TableRow
                    key={category._id}
                  >

                    {/* ICON */}

                    <TableCell>
                      <CategoryIcon
                        category={category}
                        size="sm"
                      />
                    </TableCell>

                    {/* NAME */}

                    <TableCell>
                      <div
                        className={
                          subcategory
                            ? "pl-5"
                            : ""
                        }
                      >
                        <div className="flex items-center gap-2">

                          {subcategory && (
                            <span className="text-muted-foreground">
                              └
                            </span>
                          )}

                          <span className="font-medium">
                            {category.name}
                          </span>

                        </div>
                      </div>
                    </TableCell>

                    {/* TYPE */}

                    <TableCell>
                      {subcategory ? (
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                          Subcategory
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          Parent
                        </span>
                      )}
                    </TableCell>

                    {/* PARENT */}

                    <TableCell>
                      {getParentName(category) || (
                        <span className="text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* IMAGE */}

                    <TableCell>
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-10 w-10 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>

                    {/* ACTIONS */}

                    <TableCell>
                      <div className="flex justify-end gap-2">

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            openEditDialog(category)
                          }
                          title="Edit category"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            openDeleteDialog(category)
                          }
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                      </div>
                    </TableCell>

                  </TableRow>
                );
              })
            )}

          </TableBody>

        </Table>

      </div>

      {/* =====================================================
          CREATE / EDIT DIALOG
          ===================================================== */}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
      >

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-150">

          <DialogHeader>

            <DialogTitle>
              {editingCategory
                ? "Edit Category"
                : "Create Category"}
            </DialogTitle>

            <DialogDescription>
              Create a parent category or place
              this category under an existing
              parent.
            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* ERROR */}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* NAME */}

            <div className="space-y-2">

              <Label htmlFor="category-name">
                Category Name
              </Label>

              <Input
                id="category-name"
                placeholder="e.g. Electronics"
                value={formData.name}
                onChange={(event) =>
                  handleInputChange(
                    "name",
                    event.target.value
                  )
                }
                disabled={saving}
              />

            </div>

            {/* PARENT */}

            <div className="space-y-2">

              <Label>
                Parent Category
              </Label>

              <Select
                value={
                  formData.parentCategory ||
                  "none"
                }
                onValueChange={
                  handleParentChange
                }
                disabled={saving}
              >

                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="none">
                    None — Parent Category
                  </SelectItem>

                  {parentCategories.map(
                    (category) => (
                      <SelectItem
                        key={category._id}
                        value={String(
                          category._id
                        )}
                      >
                        {category.name}
                      </SelectItem>
                    )
                  )}

                </SelectContent>

              </Select>

              <p className="text-xs text-muted-foreground">
                Select None to create a parent
                category. Select an existing
                parent to create a subcategory.
              </p>

            </div>

            {/* SVG */}

            {!formData.parentCategory && (
              <div className="space-y-3 rounded-xl border p-4">

                <div className="flex items-start gap-3">

                  <div className="rounded-lg bg-primary/10 p-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1">

                    <h3 className="font-medium">
                      Parent Category SVG Icon
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      SVG icons are available only
                      for parent categories.
                    </p>

                  </div>

                </div>

                {formData.icon ? (
                  <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-center">

                    <CategoryIcon
                      category={{
                        name:
                          formData.name ||
                          "Category",
                        icon:
                          formData.icon,
                      }}
                      size="md"
                    />

                    <div className="flex-1">

                      <p className="text-sm font-medium">
                        SVG icon uploaded
                      </p>

                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {formData.icon}
                      </p>

                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeSvg}
                      disabled={
                        uploadingIcon ||
                        saving
                      }
                    >
                      Remove
                    </Button>

                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition hover:bg-muted/50">

                    {uploadingIcon ? (
                      <>
                        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />

                        <span className="text-sm text-muted-foreground">
                          Uploading SVG...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-muted-foreground" />

                        <span className="text-sm font-medium">
                          Upload SVG icon
                        </span>

                        <span className="text-xs text-muted-foreground">
                          SVG only • maximum 500KB
                        </span>
                      </>
                    )}

                    <input
                      type="file"
                      accept=".svg,image/svg+xml"
                      className="hidden"
                      onChange={
                        handleSvgUpload
                      }
                      disabled={
                        uploadingIcon ||
                        saving
                      }
                    />

                  </label>
                )}

              </div>
            )}

            {/* SUBCATEGORY MESSAGE */}

            {formData.parentCategory && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">

                <div className="font-medium">
                  SVG icon unavailable
                </div>

                <p className="mt-1 text-xs">
                  Subcategories cannot have SVG
                  icons. Only parent categories
                  can have them.
                </p>

              </div>
            )}

            {/* IMAGE */}

            <div className="space-y-3 rounded-xl border p-4">

              <div className="flex items-start gap-3">

                <div className="rounded-lg bg-muted p-2">
                  <ImageIcon className="h-5 w-5" />
                </div>

                <div>

                  <h3 className="font-medium">
                    Category Image
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Optional image for the
                    category.
                  </p>

                </div>

              </div>

              {formData.image ? (
                <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-center">

                  <img
                    src={formData.image}
                    alt="Category preview"
                    className="h-20 w-20 rounded-lg border object-cover"
                  />

                  <div className="flex-1">

                    <p className="text-sm font-medium">
                      Category image uploaded
                    </p>

                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {formData.image}
                    </p>

                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeImage}
                    disabled={
                      uploadingImage ||
                      saving
                    }
                  >
                    Remove
                  </Button>

                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition hover:bg-muted/50">

                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />

                      <span className="text-sm text-muted-foreground">
                        Uploading image...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-muted-foreground" />

                      <span className="text-sm font-medium">
                        Upload category image
                      </span>

                      <span className="text-xs text-muted-foreground">
                        PNG, JPG, WEBP, etc.
                      </span>
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      handleImageUpload
                    }
                    disabled={
                      uploadingImage ||
                      saving
                    }
                  />

                </label>
              )}

            </div>

            {/* PREVIEW */}

            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">

              <Label>
                Preview
              </Label>

              <div className="flex items-center gap-4">

                <CategoryIcon
                  category={{
                    name:
                      formData.name ||
                      "Category",
                    icon:
                      formData.icon ||
                      formData.image,
                    image:
                      formData.image,
                  }}
                  size="md"
                />

                <div>

                  <p className="font-medium">
                    {formData.name ||
                      "Category Name"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formData.parentCategory
                      ? "Subcategory"
                      : "Parent Category"}
                  </p>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <DialogFooter className="gap-2">

              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={
                  saving ||
                  uploadingIcon ||
                  uploadingImage
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  saving ||
                  uploadingIcon ||
                  uploadingImage ||
                  !formData.name.trim()
                }
              >

                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                    {editingCategory
                      ? "Updating..."
                      : "Creating..."}
                  </>
                ) : editingCategory ? (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    Update Category
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Category
                  </>
                )}

              </Button>

            </DialogFooter>

          </form>

        </DialogContent>

      </Dialog>

      {/* DELETE */}

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              Delete Category?
            </AlertDialogTitle>

            <AlertDialogDescription>

              Are you sure you want to delete{" "}
              <strong>
                {categoryToDelete?.name}
              </strong>
              ?

              <br />
              <br />

              If this category contains
              subcategories, the backend will
              prevent deletion.

            </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel
              onClick={() =>
                setCategoryToDelete(null)
              }
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </div>
  );
}
