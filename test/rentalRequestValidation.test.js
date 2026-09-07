import assert from "node:assert/strict";
import test from "node:test";

import {
  createRentalRequestSchema,
  reviewRentalRequestSchema,
} from "../src/validations/schema.js";

test("validates rental request dates and review actions", () => {
  assert.equal(
    createRentalRequestSchema.parse({
      propertyId: 1,
      startDate: "2026-10-01",
      endDate: "2026-11-01",
    }).propertyId,
    1,
  );
  assert.throws(() =>
    createRentalRequestSchema.parse({
      propertyId: 1,
      startDate: "2026-10-01",
      endDate: "2026-09-01",
    }),
  );
  assert.throws(() => reviewRentalRequestSchema.parse({ action: "CANCEL" }));
});
