import assert from "node:assert/strict";
import test from "node:test";

import { createPropertySchema, updatePropertySchema } from "../src/validations/schema.js";

const validProperty = {
  title: "Test property",
  description: "Test description",
  propertyType: "CONDO",
  rentType: "WHOLE_UNIT",
  monthlyRent: 10000,
  totalBedrooms: 1,
};

test("property amenities and house rules remain optional", () => {
  assert.deepEqual(createPropertySchema.parse(validProperty), validProperty);
});

test("property relations accept unique IDs and reject duplicates", () => {
  assert.equal(
    updatePropertySchema.parse({
      amenityIds: [1, 2],
      houseRules: [{ houseRuleId: 1 }, { houseRuleId: 2, value: "22:00-07:00" }],
    }).houseRules[1].value,
    "22:00-07:00",
  );
  assert.throws(() => updatePropertySchema.parse({ amenityIds: [1, 1] }));
  assert.throws(() =>
    updatePropertySchema.parse({
      houseRules: [{ houseRuleId: 1 }, { houseRuleId: 1 }],
    }),
  );
});
