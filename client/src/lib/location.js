// Normalize Nominatim address fields while allowing callers to keep their fallback rules.
export function formatNominatimAddress(result, fallback = result.display_name || "", includeCounty = false) {
  const address = result.address || {};
  const road = address.road || address.pedestrian || address.footway || address.path || "";
  const houseNumber = address.house_number || "";
  const neighbourhood = address.neighbourhood || address.suburb || address.quarter || address.residential || "";
  const city = address.city || address.town || address.municipality || address.village || (includeCounty ? address.county : "") || "";
  const street = [houseNumber, road].filter(Boolean).join(" ");
  const generatedAddress = [street, neighbourhood].filter(Boolean).join(", ");

  return {
    address: generatedAddress || fallback,
    city,
    postalCode: address.postcode || "",
    country: address.country || "Nepal",
  };
}
