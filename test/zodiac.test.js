import assert from "node:assert/strict";
import test from "node:test";

import {
  getCompatibilityScore,
  getZodiacSign,
} from "../src/utils/zodiac.js";

const SIGNS = [
  "ARIES",
  "TAURUS",
  "GEMINI",
  "CANCER",
  "LEO",
  "VIRGO",
  "LIBRA",
  "SCORPIO",
  "SAGITTARIUS",
  "CAPRICORN",
  "AQUARIUS",
  "PISCES",
];

test("calculates zodiac signs at required date boundaries", () => {
  for (const [birthdate, expected] of [
    [new Date("1998-03-12T00:00:00.000Z"), "PISCES"],
    ["2000-03-20", "PISCES"],
    ["2000-03-21", "ARIES"],
    ["2000-04-19", "ARIES"],
    ["2000-04-20", "TAURUS"],
    ["2000-06-21", "CANCER"],
    ["2000-11-21", "SCORPIO"],
    ["2000-11-22", "SAGITTARIUS"],
    ["2000-12-21", "SAGITTARIUS"],
    ["2000-12-22", "CAPRICORN"],
    ["2000-01-19", "CAPRICORN"],
    ["2000-01-20", "AQUARIUS"],
  ]) {
    assert.equal(getZodiacSign(birthdate), expected);
  }
});

test("returns null for missing or invalid birthdates", () => {
  for (const birthdate of [null, undefined, "not-a-date", new Date("invalid")]) {
    assert.equal(getZodiacSign(birthdate), null);
  }
});

test("ranks Pisces compatibility for the matching dataset", () => {
  assert.ok(getCompatibilityScore("PISCES", "CANCER") >= 90);
  assert.ok(getCompatibilityScore("PISCES", "SCORPIO") >= 90);
  assert.ok(
    getCompatibilityScore("PISCES", "TAURUS") >
      getCompatibilityScore("PISCES", "GEMINI"),
  );
  assert.ok(
    getCompatibilityScore("PISCES", "CAPRICORN") >
      getCompatibilityScore("PISCES", "SAGITTARIUS"),
  );
});

test("returns valid same-sign scores", () => {
  for (const sign of SIGNS) {
    const score = getCompatibilityScore(sign, sign);
    assert.ok(Number.isInteger(score));
    assert.ok(score >= 0 && score <= 100);
  }
});

test("covers every pair with symmetrical integer scores from 0 to 100", () => {
  for (const signA of SIGNS) {
    for (const signB of SIGNS) {
      const score = getCompatibilityScore(signA, signB);
      assert.equal(score, getCompatibilityScore(signB, signA));
      assert.ok(Number.isInteger(score));
      assert.ok(score >= 0 && score <= 100);
    }
  }
});

test("returns null for invalid signs", () => {
  assert.equal(getCompatibilityScore("PISCES", "OPHIUCHUS"), null);
  assert.equal(getCompatibilityScore(null, "PISCES"), null);
});
