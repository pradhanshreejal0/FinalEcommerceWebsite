export const buildBestSellerPipeline = () => [
  { $match: { status: "delivered" } },
  { $unwind: "$items" },
  { $match: { "items.status": "delivered", "items.product": { $ne: null } } },
  { $group: { _id: "$items.product", unitsSold: { $sum: "$items.quantity" } } },
  { $sort: { unitsSold: -1 } },
];

export const orderProductsBySales = (products, sales) => {
  const rank = new Map(sales.map((item, index) => [String(item._id), index]));
  return [...products].sort((a, b) => rank.get(String(a._id)) - rank.get(String(b._id)));
};
