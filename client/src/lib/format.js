// Format order amounts using the Nepalese locale and the app's currency label.
export const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-NP")}`;
