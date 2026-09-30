import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, Upload, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { PriceTag } from "@/components/PriceTag";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    descriptionSections: [{ title: "", content: "" }],
    descriptionStyle: "paragraphs",
    price: "",
    stock: "",
    category: "",
    images: [],
    isPublished: true,
    discountPercentage: "",
    hasVariants: false,
    variants: [],
  });
  const [vendorStatus, setVendorStatus] = useState(null);

  const { accessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const lowStockOnly = searchParams.get("lowStock") === "true";

  const loadProducts = useCallback(async () => {
    const query = lowStockOnly ? "?lowStock=true" : "";
    return api(`/products/vendor/my-products${query}`, { accessToken });
  }, [accessToken, lowStockOnly]);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [productsData, categoriesData, profile] = await Promise.all([
          loadProducts(),
          api("/categories"),
          api("/vendors/me", { accessToken }).catch(() => null),
        ]);

        if (!cancelled) {
          setProducts(productsData);
          setCategories(categoriesData);
          if (profile) setVendorStatus(profile.status || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [accessToken, lowStockOnly, loadProducts]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      title: "",
      descriptionSections: [{ title: "", content: "" }],
      descriptionStyle: "paragraphs",
      price: "",
      stock: "",
      category: "",
      images: [],
      isPublished: true,
      discountPercentage: "",
      hasVariants: false,
      variants: [],
    });
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    let sections = Array.isArray(product.descriptionSections)
      ? product.descriptionSections.map((s) => ({
          title: s.title || "",
          content: s.content || "",
        }))
      : [];
    if (sections.length === 0 && product.description) {
      sections = [{ title: "", content: product.description }];
    }
    if (sections.length === 0) {
      sections = [{ title: "", content: "" }];
    }
    setFormData({
      title: product.title,
      descriptionSections: sections,
      descriptionStyle: product.descriptionStyle || "paragraphs",
      price: product.price,
      stock: product.stock,
      category: product.category?._id || product.category || "",
      images: product.images || [],
      isPublished: product.isPublished,
      discountPercentage: product.discountPercentage || "",
      hasVariants: !!product.hasVariants,
      variants: Array.isArray(product.variants)
        ? product.variants.map((v) => ({
            attributes:
              Array.isArray(v.attributes) && v.attributes.length
                ? v.attributes.map((a) => ({
                    name: a.name || "",
                    value: a.value || "",
                  }))
                : [{ name: "", value: "" }],
            price: v.price ?? "",
            stock: v.stock ?? "",
            sku: v.sku || "",
          }))
        : [],
    });
    setError("");
    setDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const url = await uploadImage(file, accessToken);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, url],
      }));
    } catch (err) {
      setError(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.category) {
      setError("Please select a category");
      return;
    }

    const payload = {
      ...formData,
      price: Number(formData.price) || 0,
      stock: Number(formData.stock) || 0,
      discountPercentage:
        formData.discountPercentage === "" ? 0 : Number(formData.discountPercentage),
      hasVariants: !!formData.hasVariants,
      variants: formData.hasVariants
        ? (formData.variants || []).map((v) => ({
            attributes: (v.attributes || [])
              .filter((a) => a.name?.trim() && a.value?.trim())
              .map((a) => ({
                name: a.name.trim(),
                value: a.value.trim(),
              })),
            price: Number(v.price),
            stock: Number(v.stock),
            sku: v.sku || "",
          }))
        : [],
    };

    try {
      if (editingProduct) {
        await api(`/products/${editingProduct._id}`, {
          method: "PUT",
          accessToken,
          body: JSON.stringify(payload),
        });
      } else {
        await api("/products", {
          method: "POST",
          accessToken,
          body: JSON.stringify(payload),
        });
      }

      setDialogOpen(false);
      const data = await loadProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api(`/products/${id}`, {
        method: "DELETE",
        accessToken,
      });
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading products...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {lowStockOnly ? "Low Stock Products" : "My Products"}
          </h1>
          {lowStockOnly && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing products with stock ≤ 5
            </p>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreateDialog}
              disabled={vendorStatus && vendorStatus !== "approved"}
              title={
                vendorStatus && vendorStatus !== "approved"
                  ? "Store must be approved first"
                  : undefined
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Description sections</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={generatingAi || !formData.title.trim()}
                      onClick={async () => {
                        if (!formData.title.trim()) return;
                        setGeneratingAi(true);
                        setError("");
                        try {
                          const cat = categories.find(
                            (c) => c._id === formData.category
                          );
                          const data = await api(
                            "/products/generate-description",
                            {
                              method: "POST",
                              accessToken,
                              body: {
                                title: formData.title.trim(),
                                categoryName: cat?.name || "",
                                keywords: "",
                              },
                            }
                          );
                          if (data?.description) {
                            setFormData((prev) => {
                              const sections = [...prev.descriptionSections];
                              // Fill first empty section, or replace first
                              const emptyIdx = sections.findIndex(
                                (s) => !s.content.trim()
                              );
                              const idx = emptyIdx >= 0 ? emptyIdx : 0;
                              sections[idx] = {
                                title: sections[idx]?.title || "Overview",
                                content: data.description,
                              };
                              return { ...prev, descriptionSections: sections };
                            });
                          }
                        } catch (err) {
                          setError(
                            err.message ||
                              "Could not generate description. Try again."
                          );
                        } finally {
                          setGeneratingAi(false);
                        }
                      }}
                    >
                      {generatingAi ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {generatingAi ? "Generating…" : "Generate with AI"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={formData.descriptionSections.length >= 4}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          descriptionSections: [
                            ...prev.descriptionSections,
                            { title: "", content: "" },
                          ],
                        }))
                      }
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add section
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add up to 4 sections (e.g. Overview, Features, Specs, Care).
                  You choose how they look on the product page.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="descriptionStyle">How it looks</Label>
                  <Select
                    value={formData.descriptionStyle}
                    onValueChange={(value) =>
                      setFormData({ ...formData, descriptionStyle: value })
                    }
                  >
                    <SelectTrigger id="descriptionStyle">
                      <SelectValue placeholder="Choose layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paragraphs">
                        Paragraphs — clean stacked text
                      </SelectItem>
                      <SelectItem value="cards">
                        Cards — each section in its own card
                      </SelectItem>
                      <SelectItem value="tabs">
                        Tabs — switch between sections
                      </SelectItem>
                      <SelectItem value="accordion">
                        Accordion — expand one section at a time
                      </SelectItem>
                      <SelectItem value="list">
                        List — numbered sections
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.descriptionSections.map((section, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/30 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Section {index + 1} of 4
                      </Label>
                      {formData.descriptionSections.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              descriptionSections:
                                prev.descriptionSections.filter(
                                  (_, i) => i !== index
                                ),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Section title (optional) — e.g. Features"
                      value={section.title}
                      onChange={(e) => {
                        const next = [...formData.descriptionSections];
                        next[index] = { ...next[index], title: e.target.value };
                        setFormData({ ...formData, descriptionSections: next });
                      }}
                    />
                    <Textarea
                      placeholder="Write this section…"
                      value={section.content}
                      onChange={(e) => {
                        const next = [...formData.descriptionSections];
                        next[index] = {
                          ...next[index],
                          content: e.target.value,
                        };
                        setFormData({ ...formData, descriptionSections: next });
                      }}
                      rows={3}
                      className="min-h-20 resize-y"
                    />
                  </div>
                ))}
              </div>

              {/* Base price / stock — hidden detail when variants enabled */}
              {!formData.hasVariants && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (RS)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              )}

              {/* Flexible variants: color, size, volume, etc. */}
              <div className="space-y-3 rounded-xl border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="text-base">Options (size, color, etc.)</Label>
                    <p className="text-xs text-muted-foreground">
                      Optional. Add sizes, colors, or any option with its own price & stock.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={formData.hasVariants ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (formData.hasVariants) {
                        setFormData({
                          ...formData,
                          hasVariants: false,
                          variants: [],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          hasVariants: true,
                          variants:
                            formData.variants?.length > 0
                              ? formData.variants
                              : [
                                  {
                                    attributes: [{ name: "Size", value: "" }],
                                    price: formData.price || "",
                                    stock: formData.stock || "",
                                    sku: "",
                                  },
                                ],
                        });
                      }
                    }}
                  >
                    {formData.hasVariants ? "Using options" : "Enable options"}
                  </Button>
                </div>

                {formData.hasVariants && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            variants: [
                              {
                                attributes: [
                                  { name: "Color", value: "" },
                                  { name: "Size", value: "" },
                                ],
                                price: formData.price || "",
                                stock: "",
                                sku: "",
                              },
                            ],
                          })
                        }
                      >
                        Template: Clothing
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            variants: [
                              {
                                attributes: [{ name: "Size", value: "50ml" }],
                                price: formData.price || "",
                                stock: "",
                                sku: "",
                              },
                            ],
                          })
                        }
                      >
                        Template: Beauty size
                      </Button>
                    </div>

                    {(formData.variants || []).map((variant, vIndex) => (
                      <div
                        key={vIndex}
                        className="space-y-2 rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Option {vIndex + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              const next = formData.variants.filter(
                                (_, i) => i !== vIndex
                              );
                              setFormData({ ...formData, variants: next });
                            }}
                          >
                            Remove
                          </Button>
                        </div>

                        {(variant.attributes || []).map((attr, aIndex) => (
                          <div
                            key={aIndex}
                            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]"
                          >
                            <Input
                              placeholder="Type (e.g. Size, Color)"
                              value={attr.name}
                              onChange={(e) => {
                                const variants = [...formData.variants];
                                const attributes = [
                                  ...(variants[vIndex].attributes || []),
                                ];
                                attributes[aIndex] = {
                                  ...attributes[aIndex],
                                  name: e.target.value,
                                };
                                variants[vIndex] = {
                                  ...variants[vIndex],
                                  attributes,
                                };
                                setFormData({ ...formData, variants });
                              }}
                            />
                            <Input
                              placeholder="Value (e.g. M, Red, 100ml)"
                              value={attr.value}
                              onChange={(e) => {
                                const variants = [...formData.variants];
                                const attributes = [
                                  ...(variants[vIndex].attributes || []),
                                ];
                                attributes[aIndex] = {
                                  ...attributes[aIndex],
                                  value: e.target.value,
                                };
                                variants[vIndex] = {
                                  ...variants[vIndex],
                                  attributes,
                                };
                                setFormData({ ...formData, variants });
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="hidden sm:inline-flex"
                              onClick={() => {
                                const variants = [...formData.variants];
                                const attributes = (
                                  variants[vIndex].attributes || []
                                ).filter((_, i) => i !== aIndex);
                                variants[vIndex] = {
                                  ...variants[vIndex],
                                  attributes:
                                    attributes.length > 0
                                      ? attributes
                                      : [{ name: "", value: "" }],
                                };
                                setFormData({ ...formData, variants });
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const variants = [...formData.variants];
                            variants[vIndex] = {
                              ...variants[vIndex],
                              attributes: [
                                ...(variants[vIndex].attributes || []),
                                { name: "", value: "" },
                              ],
                            };
                            setFormData({ ...formData, variants });
                          }}
                        >
                          + Attribute (e.g. add Color)
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Price (RS)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variant.price}
                              onChange={(e) => {
                                const variants = [...formData.variants];
                                variants[vIndex] = {
                                  ...variants[vIndex],
                                  price: e.target.value,
                                };
                                setFormData({ ...formData, variants });
                              }}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Stock</Label>
                            <Input
                              type="number"
                              min="0"
                              value={variant.stock}
                              onChange={(e) => {
                                const variants = [...formData.variants];
                                variants[vIndex] = {
                                  ...variants[vIndex],
                                  stock: e.target.value,
                                };
                                setFormData({ ...formData, variants });
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      className="w-full"
                      variant="secondary"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          variants: [
                            ...(formData.variants || []),
                            {
                              attributes: [{ name: "Size", value: "" }],
                              price: formData.price || "",
                              stock: "",
                              sku: "",
                            },
                          ],
                        })
                      }
                    >
                      + Add option
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount (%)</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min="0"
                  max="90"
                  step="1"
                  placeholder="0"
                  value={formData.discountPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, discountPercentage: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave at 0 for no discount. Applies immediately to this product's listed price.
                </p>
                {Number(formData.discountPercentage) > 0 && formData.price && (
                  <p className="text-xs text-muted-foreground">
                    Customers will pay{" "}
                    <span className="font-medium text-foreground">
                      $
                      {(
                        Number(formData.price) -
                        (Number(formData.price) * Number(formData.discountPercentage)) / 100
                      ).toFixed(2)}
                    </span>{" "}
                    instead of ${Number(formData.price).toFixed(2)}.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No categories available
                      </SelectItem>
                    ) : (
                      categories.map((c) => (
                        <SelectItem key={c._id} value={String(c._id)}>
                          {c.parentCategory ? `— ${c.name}` : c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No categories found. Ask admin to create some first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Images</Label>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="product-image"
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Add Image
                      </>
                    )}
                  </Label>
                  <Input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </div>

                {formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.images.map((img, index) => (
                      <div key={index} className="relative">
                        <img
                          src={img}
                          alt=""
                          className="h-20 w-20 rounded object-cover border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-primary-foreground"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.isPublished ? "published" : "draft"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      isPublished: value === "published",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={uploading}>
                  {editingProduct ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                {lowStockOnly
                  ? "No low stock products."
                  : "No products yet. Create one to get started."}
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product._id}>
                <TableCell>
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium max-w-50 truncate" title={product.title}>
                  {product.title}
                </TableCell>
                <TableCell>
                  <PriceTag product={product} />
                </TableCell>
                <TableCell>
                  <span
                    className={
                      product.stock <= 5 ? "font-medium text-destructive" : ""
                    }
                  >
                    {product.stock}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={product.isPublished ? "default" : "secondary"}
                  >
                    {product.isPublished ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete "{product.title}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product._id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
