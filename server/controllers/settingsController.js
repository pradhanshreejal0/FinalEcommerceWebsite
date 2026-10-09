import Settings from "../models/Settings.js";

function pickStorefront(settings) {
  return {
    platformName: settings.platformName,
    supportEmail: settings.supportEmail,
    hero: settings.hero || {},
    promo: settings.promo || {},
  };
}

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    res.json(pickStorefront(settings));
  } catch (error) {
    console.error("Get public settings error:", error);
    res.status(500).json({ message: error.message || "Failed to load settings" });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: error.message || "Failed to load settings" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();

    const {
      commissionPercentage,
      platformName,
      supportEmail,
      lowStockThreshold,
      hero,
      promo,
    } = req.body;

    if (commissionPercentage !== undefined) {
      const value = Number(commissionPercentage);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({
          message: "Commission percentage must be a number between 0 and 100",
        });
      }
      settings.commissionPercentage = value;
    }

    if (platformName !== undefined) {
      const trimmed = String(platformName).trim();
      if (!trimmed) {
        return res.status(400).json({ message: "Platform name cannot be empty" });
      }
      settings.platformName = trimmed;
    }

    if (supportEmail !== undefined) {
      settings.supportEmail = String(supportEmail).trim();
    }

    if (lowStockThreshold !== undefined) {
      const value = Number(lowStockThreshold);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          message: "Low stock threshold must be a number greater than or equal to 0",
        });
      }
      settings.lowStockThreshold = value;
    }

    // Admin-only storefront content (hero + promo band)
    if (hero && typeof hero === "object") {
      const h = settings.hero || {};
      if (hero.visible !== undefined) h.visible = Boolean(hero.visible);
      if (hero.kicker !== undefined) h.kicker = String(hero.kicker).slice(0, 120);
      if (hero.title !== undefined) h.title = String(hero.title).slice(0, 200);
      if (hero.subtitle !== undefined) h.subtitle = String(hero.subtitle).slice(0, 400);
      if (hero.ctaText !== undefined) h.ctaText = String(hero.ctaText).slice(0, 80);
      if (hero.ctaLink !== undefined) h.ctaLink = String(hero.ctaLink).slice(0, 300);
      if (hero.imageUrl !== undefined) h.imageUrl = String(hero.imageUrl).slice(0, 800);
      if (hero.captionLeft !== undefined) h.captionLeft = String(hero.captionLeft).slice(0, 80);
      if (hero.captionRight !== undefined) h.captionRight = String(hero.captionRight).slice(0, 40);
      settings.hero = h;
      settings.markModified("hero");
    }

    if (promo && typeof promo === "object") {
      const p = settings.promo || {};
      if (promo.visible !== undefined) p.visible = Boolean(promo.visible);
      if (promo.badge !== undefined) p.badge = String(promo.badge).slice(0, 80);
      if (promo.title !== undefined) p.title = String(promo.title).slice(0, 200);
      if (promo.subtitle !== undefined) p.subtitle = String(promo.subtitle).slice(0, 400);
      if (promo.ctaText !== undefined) p.ctaText = String(promo.ctaText).slice(0, 80);
      if (promo.ctaLink !== undefined) p.ctaLink = String(promo.ctaLink).slice(0, 300);
      if (promo.imageUrl !== undefined) p.imageUrl = String(promo.imageUrl).slice(0, 800);
      settings.promo = p;
      settings.markModified("promo");
    }

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: error.message || "Failed to update settings" });
  }
};
