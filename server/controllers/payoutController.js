import Payout from "../models/Payout.js";
import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";

/**
 * Unpaid earnings for a vendor = sum of vendorEarnings on non-cancelled
 * delivered/processing items not yet in a paid payout (simplified: total
 * earnings minus sum of paid payouts).
 */
async function computeVendorBalance(vendorId) {
  const orders = await Order.find({
    "items.vendor": vendorId,
    status: { $ne: "cancelled" },
  });

  let grossEarnings = 0;
  let commission = 0;

  for (const order of orders) {
    for (const item of order.items) {
      if (String(item.vendor) !== String(vendorId)) continue;
      if (item.status === "cancelled") continue;
      grossEarnings += Number(item.vendorEarnings) || 0;
      commission += Number(item.platformCommission) || 0;
    }
  }

  const paid = await Payout.aggregate([
    {
      $match: {
        vendor: vendorId,
        status: { $in: ["paid", "processing", "pending"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const alreadyAllocated = paid[0]?.total || 0;
  const available = Math.round((grossEarnings - alreadyAllocated) * 100) / 100;

  return {
    grossEarnings: Math.round(grossEarnings * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    alreadyAllocated: Math.round(alreadyAllocated * 100) / 100,
    available: Math.max(0, available),
  };
}

export const getMyPayoutSummary = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      user: req.user._id,
      status: "approved",
    });
    if (!vendor) {
      return res.status(403).json({ message: "Vendor not approved" });
    }

    const balance = await computeVendorBalance(vendor._id);
    const history = await Payout.find({ vendor: vendor._id }).sort({
      createdAt: -1,
    });

    res.json({ vendorId: vendor._id, ...balance, history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminPayoutOverview = async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: "approved" }).select(
      "storeName storeSlug"
    );
    const rows = [];
    for (const v of vendors) {
      const balance = await computeVendorBalance(v._id);
      rows.push({
        vendor: v,
        ...balance,
      });
    }
    const payouts = await Payout.find()
      .populate("vendor", "storeName")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ vendors: rows, recentPayouts: payouts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPayout = async (req, res) => {
  try {
    const { vendorId, amount, method, reference, note } = req.body;
    if (!vendorId) {
      return res.status(400).json({ message: "vendorId required" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const balance = await computeVendorBalance(vendor._id);
    const payAmount =
      amount != null ? Number(amount) : balance.available;

    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: "Invalid payout amount" });
    }
    if (payAmount > balance.available + 0.01) {
      return res.status(400).json({
        message: `Amount exceeds available balance (RS ${balance.available})`,
      });
    }

    const payout = await Payout.create({
      vendor: vendor._id,
      amount: Math.round(payAmount * 100) / 100,
      platformCommission: 0,
      status: "pending",
      method: method || "bank_transfer",
      reference: reference || "",
      note: note || "",
      createdBy: req.user._id,
    });

    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePayoutStatus = async (req, res) => {
  try {
    const { status, reference, note } = req.body;
    const allowed = ["pending", "processing", "paid", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ message: "Payout not found" });

    payout.status = status;
    if (reference != null) payout.reference = reference;
    if (note != null) payout.note = note;
    if (status === "paid") payout.paidAt = new Date();

    await payout.save();
    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
