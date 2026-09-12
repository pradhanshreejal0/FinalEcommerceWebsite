import Settings from "../models/Settings.js";

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();

    res.json({
      platformName: settings.platformName,
      supportEmail: settings.supportEmail,
    });
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

    await settings.save();

    res.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: error.message || "Failed to update settings" });
  }
};