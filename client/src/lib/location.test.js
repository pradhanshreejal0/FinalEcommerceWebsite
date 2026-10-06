import assert from "node:assert/strict";
import { formatNominatimAddress } from "./location.js";

const result = formatNominatimAddress({
  display_name: "Street, Ward, City",
  address: {
    house_number: "12",
    road: "Main Road",
    suburb: "Ward",
    city: "City",
    postcode: "12345",
    country: "Nepal",
  },
});

assert.deepEqual(result, {
  address: "12 Main Road, Ward",
  city: "City",
  postalCode: "12345",
  country: "Nepal",
});
assert.equal(
  formatNominatimAddress({ display_name: "Ward, City" }, "Ward, City").address,
  "Ward, City"
);
console.log("Location formatting checks passed");
