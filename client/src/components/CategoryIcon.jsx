import { ImageOff } from "lucide-react";

const sizes = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export function CategoryIcon({
  category,
  size = "md",
  className = "",
}) {
  const icon =
    category?.icon ||
    category?.image;

  const sizeClass =
    sizes[size] || sizes.md;

  if (!icon) {
    return (
      <div
        className={`${sizeClass} ${className} flex items-center justify-center rounded-full border bg-muted`}
      >
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${className} flex items-center justify-center overflow-hidden rounded-full border bg-white`}
    >
      <img
        src={icon}
        alt={`${category?.name || "Category"} icon`}
        className="h-full w-full object-contain p-2"
        loading="lazy"
        draggable="false"
      />
    </div>
  );
}
