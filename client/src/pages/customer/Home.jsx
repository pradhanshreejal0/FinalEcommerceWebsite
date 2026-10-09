import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { cloudinaryImage } from "@/lib/cloudinary";
import { getFinalPrice } from "@/lib/utils";
import { AdBanner } from "@/components/AdBanner";

const FALLBACK_CATEGORIES = [
  {
    name: "Electronics",
    line: "Thoughtful tech",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900",
  },
  {
    name: "Fashion",
    line: "Wear it well",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900",
  },
  {
    name: "Home",
    line: "Make room for calm",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900",
  },
  {
    name: "Accessories",
    line: "The finishing touch",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900",
  },
];

const DEFAULT_HERO = {
  visible: true,
  kicker: "The good find starts here",
  title: "Find your everyday, elevated.",
  subtitle:
    "Considered finds for the way you live, work, move and make a home.",
  ctaText: "Shop the collection",
  ctaLink: "/products",
  imageUrl:
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1900",
  captionLeft: "Made for everyday",
  captionRight: "01 / 04",
};

const DEFAULT_PROMO = {
  visible: true,
  badge: "THE FOUNDRY EDIT",
  title: "Good design\nis for living.",
  subtitle: "Meet pieces with a little more thought behind them.",
  ctaText: "Shop the edit",
  ctaLink: "/products",
  imageUrl:
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
};

function getProductImage(product) {
  const image = product?.images?.[0];
  const url = typeof image === "string" ? image : image?.url || null;
  return url ? cloudinaryImage(url, { width: 600, height: 700 }) : null;
}

function ProductCard({ product }) {
  const img = getProductImage(product);
  const inStock =
    product.stock == null || Number(product.stock) > 0 || product.inStock;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <Link
        to={`/products/${product._id || product.slug}`}
        className="relative block aspect-4/5 overflow-hidden bg-muted"
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded bg-card/95 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary shadow-sm">
          {product.featured
            ? "Curated pick"
            : inStock
              ? "Ready to ship"
              : "Sold out"}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5 pt-3.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {product.category?.name || product.category || "Collection"}
        </span>
        <Link
          to={`/products/${product._id || product.slug}`}
          className="line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-snug text-foreground hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-heading text-[15px] font-bold text-foreground">
            RS {getFinalPrice(product).toFixed(0)}
          </span>
          {Number(product.discountPercentage) > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              RS {Number(product.price).toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductShelf({ title, note, items, loading, link = "/products" }) {
  return (
    <section className="mx-auto max-w-310 px-6 pb-12 pt-20 sm:px-8">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] text-muted-foreground">{note}</p>
          <h2 className="font-heading text-[28px] font-bold tracking-tight text-foreground sm:text-[32px]">
            {title}
          </h2>
        </div>
        <Link
          to={link}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary transition-colors hover:opacity-80"
        >
          View everything <ArrowRight size={17} />
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="skeleton h-82 rounded-lg" />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.slice(0, 4).map((item, index) => (
            <ProductCard
              key={item._id || item.slug || index}
              product={item}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-8 py-8 text-[13px] text-muted-foreground">
          Nothing here just yet.{" "}
          <Link to="/products" className="ml-1 font-semibold text-primary">
            Explore the collection
          </Link>
        </div>
      )}
    </section>
  );
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.ads)) return data.ads;
  if (Array.isArray(data?.categories)) return data.categories;
  return [];
}

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [newest, setNewest] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [homeAds, setHomeAds] = useState([]);
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [promo, setPromo] = useState(DEFAULT_PROMO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      api("/products?limit=8&compact=true&includeTotal=false&section=featured"),
      api("/products?limit=8&compact=true&includeTotal=false&sort=newest"),
      api(
        "/products?limit=8&compact=true&includeTotal=false&section=bestsellers"
      ),
      api("/categories"),
      api("/ads"),
      api("/settings/public"),
    ]).then((results) => {
      if (cancelled) return;

      const list = (result) =>
        result.status === "fulfilled" ? normalizeList(result.value) : [];

      setFeatured(list(results[0]));
      setNewest(list(results[1]));
      setBestsellers(list(results[2]));

      const cats = list(results[3]);
      const parents = cats.filter((c) => !c.parentCategory);
      setCategories(parents.length ? parents.slice(0, 4) : []);

      const ads = list(results[4]).filter(
        (ad) =>
          ad.isActive !== false &&
          (ad.position === "homepage" || !ad.position)
      );
      setHomeAds(ads);

      if (results[5].status === "fulfilled" && results[5].value) {
        const s = results[5].value;
        if (s.hero) setHero({ ...DEFAULT_HERO, ...s.hero });
        if (s.promo) setPromo({ ...DEFAULT_PROMO, ...s.promo });
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryTiles =
    categories.length >= 4
      ? categories.slice(0, 4).map((c, i) => ({
          name: c.name,
          line: FALLBACK_CATEGORIES[i]?.line || "Explore",
          image:
            c.image ||
            c.banner ||
            FALLBACK_CATEGORIES[i]?.image ||
            FALLBACK_CATEGORIES[0].image,
          id: c._id,
        }))
      : FALLBACK_CATEGORIES.map((c) => ({ ...c, id: null }));

  const topAds = homeAds.slice(0, 1);
  const midAds = homeAds.length > 1 ? homeAds.slice(1) : homeAds;
  const heroImage = hero.imageUrl || DEFAULT_HERO.imageUrl;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* —— Hero (admin-editable) —— */}
      {hero.visible !== false && (
        <section
          className="relative mx-auto flex min-h-116 max-w-360 items-center bg-primary bg-cover bg-center px-[max(7.1%,calc((100vw-1240px)/2))] py-15 text-primary-foreground"
          style={{
            backgroundImage: `linear-gradient(100deg, color-mix(in srgb, var(--primary) 85%, black), transparent), url("${heroImage}")`,
          }}
        >
          <div className="max-w-lg">
            <span className="mb-5 flex items-center gap-2 text-xs opacity-90">
              <Sparkles size={15} /> {hero.kicker || DEFAULT_HERO.kicker}
            </span>
            <h1 className="mb-4 max-w-120 whitespace-pre-line font-heading text-[clamp(42px,5.1vw,67px)] font-bold leading-[1.08] tracking-[-0.04em]">
              {hero.title || DEFAULT_HERO.title}
            </h1>
            <p className="mb-7 max-w-98 text-[15px] leading-[1.7] opacity-90">
              {hero.subtitle || DEFAULT_HERO.subtitle}
            </p>
            <Link
              to={hero.ctaLink || "/products"}
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-card px-5 text-[13px] font-semibold text-card-foreground transition hover:-translate-y-px hover:bg-secondary"
            >
              {hero.ctaText || DEFAULT_HERO.ctaText} <ArrowRight size={17} />
            </Link>
          </div>
          <div className="absolute bottom-5 left-[max(32px,calc((100vw-1240px)/2))] right-[max(32px,calc((100vw-1240px)/2))] flex justify-between text-[10px] tracking-wider opacity-80">
            <span>{hero.captionLeft || DEFAULT_HERO.captionLeft}</span>
            <span>{hero.captionRight || DEFAULT_HERO.captionRight}</span>
          </div>
        </section>
      )}

      {/* —— Trust strip —— */}
      <div className="flex min-h-16 flex-wrap items-center justify-center gap-8 bg-secondary px-4 text-[11px] text-secondary-foreground sm:gap-22">
        <span>
          <i className="mr-1.5 text-[15px] not-italic text-primary">✓</i> A
          little better, every day
        </span>
        <span>
          <i className="mr-1.5 text-[15px] not-italic text-primary">✓</i> Easy,
          reliable delivery
        </span>
        <span>
          <i className="mr-1.5 text-[15px] not-italic text-primary">✓</i> Help from
          real people
        </span>
      </div>

      {/* —— Ad slot A —— */}
      {topAds.length > 0 && (
        <div className="mx-auto max-w-310 px-6 pt-8 sm:px-8">
          <AdBanner ads={topAds} variant="banner" />
        </div>
      )}

      {/* —— Category grid —— */}
      <section className="mx-auto max-w-310 px-6 pb-12 pt-20 sm:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">
              A good place to begin
            </p>
            <h2 className="font-heading text-[28px] font-bold tracking-tight text-foreground sm:text-[32px]">
              Browse by mood
            </h2>
          </div>
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary transition-colors hover:opacity-80"
          >
            All departments <ArrowRight size={17} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {categoryTiles.map((item, index) => (
            <Link
              key={item.name + index}
              to={
                item.id
                  ? `/products?category=${item.id}`
                  : `/products?q=${encodeURIComponent(item.name)}`
              }
              className="group relative flex min-h-55 flex-col justify-end overflow-hidden rounded-lg bg-cover bg-center p-4 text-primary-foreground sm:min-h-65"
              style={{
                backgroundImage: `linear-gradient(0deg, color-mix(in srgb, var(--foreground) 55%, transparent), transparent 74%), url("${item.image}")`,
              }}
            >
              <span className="text-[11px] opacity-80">{item.line}</span>
              <strong className="mt-0.5 font-heading text-lg font-bold tracking-tight sm:text-xl">
                {item.name}
              </strong>
              <ArrowUpRight
                className="absolute right-3 top-3 opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                size={19}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* —— Featured —— */}
      <ProductShelf
        title="Worth a closer look"
        note="Picked with intention"
        items={featured.length ? featured : bestsellers}
        loading={loading}
        link="/products?sort=featured"
      />

      {/* —— Ad slot B —— */}
      {midAds.length > 0 && (
        <div className="mx-auto max-w-310 px-6 py-6 sm:px-8">
          <AdBanner
            ads={midAds}
            variant={midAds.length > 1 ? "carousel" : "banner"}
          />
        </div>
      )}

      {/* —— Promo band (admin-editable) —— */}
      {promo.visible !== false && (
        <section className="mx-auto my-10 grid min-h-83 max-w-294 overflow-hidden bg-secondary md:grid-cols-2">
          <div className="flex flex-col justify-center px-8 py-11 text-secondary-foreground sm:px-13">
            <span className="inline-block w-fit bg-accent px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.08em] text-accent-foreground">
              {promo.badge || DEFAULT_PROMO.badge}
            </span>
            <h2 className="mt-5 mb-2.5 whitespace-pre-line font-heading text-[36px] font-bold leading-[1.12] tracking-tight text-foreground sm:text-[40px]">
              {promo.title || DEFAULT_PROMO.title}
            </h2>
            <p className="mb-5 text-xs text-muted-foreground">
              {promo.subtitle || DEFAULT_PROMO.subtitle}
            </p>
            <Link
              to={promo.ctaLink || "/products"}
              className="inline-flex w-fit min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition hover:-translate-y-px hover:opacity-90"
            >
              {promo.ctaText || DEFAULT_PROMO.ctaText}{" "}
              <ChevronRight size={17} />
            </Link>
          </div>
          <img
            src={promo.imageUrl || DEFAULT_PROMO.imageUrl}
            alt="Promotional"
            loading="lazy"
            className="h-full min-h-70 w-full object-cover md:min-h-83"
          />
        </section>
      )}

      {/* —— New arrivals —— */}
      <ProductShelf
        title="Fresh to the shelves"
        note="Just landed"
        items={newest}
        loading={loading}
        link="/products?sort=newest"
      />

      {bestsellers.length > 0 && (
        <ProductShelf
          title="Loved by many"
          note="Crowd favorites"
          items={bestsellers}
          loading={loading}
          link="/products?sort=bestsellers"
        />
      )}

      <div className="h-12" />
    </div>
  );
}
