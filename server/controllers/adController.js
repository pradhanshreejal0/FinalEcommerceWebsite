import Ad from "../models/Ad.js";

export const createAd = async (req, res) => {
  try {
    const { title, image, link, position, isActive } = req.body;

    const ad = await Ad.create({
      title,
      image,
      link: link || "",
      position: position || "homepage",
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });

    res.status(201).json(ad);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAds = async (req, res) => {
  try {
    // If user is admin → return all, otherwise only active
    const filter = req.user?.role === "admin" ? {} : { isActive: true };
    const ads = await Ad.find(filter).sort({ createdAt: -1 });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdById = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });
    res.json(ad);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    const { title, image, link, position, isActive } = req.body;

    if (title !== undefined) ad.title = title;
    if (image !== undefined) ad.image = image;
    if (link !== undefined) ad.link = link;
    if (position !== undefined) ad.position = position;
    if (isActive !== undefined) ad.isActive = isActive;

    await ad.save();
    res.json(ad);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });
    res.json({ message: "Ad deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};