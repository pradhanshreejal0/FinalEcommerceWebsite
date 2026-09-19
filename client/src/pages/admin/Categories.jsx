import { useState, useEffect } from "react";
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
import { Pencil, Trash2, Plus, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { CategoryIcon } from "@/components/CategoryIcon";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    parentCategory: "",
    image: "",
  });
  const { accessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const data = await api("/categories");
        if (!cancelled) {
          setCategories(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError("Failed to load categories");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", parentCategory: "", image: "" });
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentCategory: category.parentCategory?._id || "",
      image: category.image || "",
    });
    setError("");
    setDialogOpen(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const url = await uploadImage(file, accessToken);
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (err) {
      setError(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        name: formData.name,
        parentCategory: formData.parentCategory || null,
        image: formData.image || "",
      };

      if (editingCategory) {
        await api(`/categories/${editingCategory._id}`, {
          method: "PUT",
          accessToken,
          body: JSON.stringify(payload),
        });
      } else {
        await api("/categories", {
          method: "POST",
          accessToken,
          body: JSON.stringify(payload),
        });
      }

      setDialogOpen(false);
      const data = await api("/categories");
      setCategories(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api(`/categories/${id}`, {
        method: "DELETE",
        accessToken,
      });
      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  const topLevelCategories = categories.filter((c) => !c.parentCategory);

  if (loading) {
    return <p className="text-muted-foreground">Loading categories...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "New Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Category Image (optional)</Label>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="category-image"
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
                        {formData.image ? "Change Image" : "Upload Image"}
                      </>
                    )}
                  </Label>
                  <Input
                    id="category-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={uploading}
                  />
                </div>

                {formData.image && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="h-16 w-16 rounded-full border object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, image: "" }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Parent Category (optional)</Label>
                <Select
                  value={formData.parentCategory || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parentCategory: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {topLevelCategories
                      .filter((c) => c._id !== editingCategory?._id)
                      .map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={uploading}>
                  {editingCategory ? "Save" : "Create"}
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
            <TableHead>Name</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                No categories yet. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category._id}>
                <TableCell>
                  <CategoryIcon category={category} size="sm" />
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {category.parentCategory?.name || "—"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(category)}
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
                          Delete "{category.name}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This can't be undone. Categories with subcategories
                          can't be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(category._id)}
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

      {error && !dialogOpen && (
        <p className="text-sm text-destructive mt-4">{error}</p>
      )}
    </div>
  );
}
