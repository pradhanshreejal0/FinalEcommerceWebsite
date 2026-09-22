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
import { Pencil, Trash2, Plus, Upload, Loader2 } from "lucide-react";
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    images: [],
    isPublished: true,
    discountPercentage: "",
  });

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
        const [productsData, categoriesData] = await Promise.all([
          loadProducts(),
          api("/categories"),
        ]);

        if (!cancelled) {
          setProducts(productsData);
          setCategories(categoriesData);
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
      description: "",
      price: "",
      stock: "",
      category: "",
      images: [],
      isPublished: true,
      discountPercentage: "",
    });
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      category: product.category?._id || product.category || "",
      images: product.images || [],
      isPublished: product.isPublished,
      discountPercentage: product.discountPercentage || "",
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
      price: Number(formData.price),
      stock: Number(formData.stock),
      discountPercentage:
        formData.discountPercentage === "" ? 0 : Number(formData.discountPercentage),
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
            <Button onClick={openCreateDialog}>
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
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
