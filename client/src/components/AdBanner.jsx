import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdBanner({ ads = [], variant = "carousel" }) {
  const [current, setCurrent] = useState(0);

  // Auto-play only for carousel with more than 1 ad
  useEffect(() => {
    if (variant !== "carousel" || ads.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ads.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [ads.length, variant]);

  if (!ads || ads.length === 0) return null;

  // ========== SIDEBAR VERSION ==========
  if (variant === "sidebar") {
    return (
      <div className="space-y-4">
        {ads.map((ad) => (
          <div
            key={ad._id}
            className="relative overflow-hidden rounded-lg border border-border group"
          >
            {ad.link ? (
              <Link to={ad.link}>
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-40 object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-2 left-2 right-2 text-white text-sm font-medium line-clamp-2">
                  {ad.title}
                </p>
              </Link>
            ) : (
              <>
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-2 left-2 right-2 text-white text-sm font-medium line-clamp-2">
                  {ad.title}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ========== SINGLE BANNER (category page) ==========
  if (variant === "banner" || ads.length === 1) {
    const ad = ads[0];
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-border">
        {ad.link ? (
          <Link to={ad.link} className="block">
            <img
              src={ad.image}
              alt={ad.title}
              className="w-full h-48 md:h-64 object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 md:left-6 text-white">
              <p className="text-xs uppercase tracking-widest opacity-80 mb-1">
                Featured
              </p>
              <h3 className="text-xl md:text-2xl font-bold">{ad.title}</h3>
            </div>
          </Link>
        ) : (
          <>
            <img
              src={ad.image}
              alt={ad.title}
              className="w-full h-48 md:h-64 object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 md:left-6 text-white">
              <p className="text-xs uppercase tracking-widest opacity-80 mb-1">
                Featured
              </p>
              <h3 className="text-xl md:text-2xl font-bold">{ad.title}</h3>
            </div>
          </>
        )}
      </div>
    );
  }

  // ========== CAROUSEL (homepage) ==========
  const goTo = (index) => setCurrent(index);
  const prev = () => setCurrent((c) => (c - 1 + ads.length) % ads.length);
  const next = () => setCurrent((c) => (c + 1) % ads.length);

  return (
    <div className="relative w-full overflow-hidden bg-black">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {ads.map((ad) => (
          <div key={ad._id} className="w-full shrink-0 relative">
            {ad.link ? (
              <Link to={ad.link} className="block">
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-55 sm:h-70 md:h-85 object-cover"
                />
              </Link>
            ) : (
              <img
                src={ad.image}
                alt={ad.title}
                className="w-full h-55 sm:h-70 md:h-85 object-cover"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 md:left-10 text-white pointer-events-none">
              <p className="text-xs uppercase tracking-widest mb-1 opacity-80">
                Special Offer
              </p>
              <h2 className="text-2xl md:text-4xl font-bold max-w-xl">
                {ad.title}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      {ads.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center hover:bg-white transition shadow"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center hover:bg-white transition shadow"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {ads.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === current ? "bg-white scale-110" : "bg-white/50"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
