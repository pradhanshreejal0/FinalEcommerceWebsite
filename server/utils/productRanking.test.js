import test from "node:test";
import assert from "node:assert/strict";
import { buildBestSellerPipeline, orderProductsBySales } from "./productRanking.js";

test("best-seller ranking counts only delivered order lines", () => {
  const pipeline = buildBestSellerPipeline();

  assert.deepEqual(pipeline[0], { $match: { status: "delivered" } });
  assert.deepEqual(pipeline[1], { $unwind: "$items" });
  assert.deepEqual(pipeline[2], {
    $match: { "items.status": "delivered", "items.product": { $ne: null } },
  });
  assert.deepEqual(pipeline.at(-1), { $sort: { unitsSold: -1 } });
});

test("best sellers preserve sales ranking after product lookup", () => {
  const products = [{ _id: "p2" }, { _id: "p1" }];
  const sales = [{ _id: "p1", unitsSold: 9 }, { _id: "p2", unitsSold: 4 }];

  assert.deepEqual(orderProductsBySales(products, sales), [{ _id: "p1" }, { _id: "p2" }]);
});
