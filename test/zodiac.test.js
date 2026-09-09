import assert from "node:assert/strict";
import test from "node:test";

import {
  getCompatibility,
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

test("calculates exact Pisces compatibility scores", () => {
  for (const [sign, expected] of [
    ["CANCER", 95],
    ["SCORPIO", 95],
    ["TAURUS", 84],
    ["CAPRICORN", 84],
    ["GEMINI", 39],
    ["SAGITTARIUS", 27],
  ]) {
    assert.equal(getCompatibilityScore("PISCES", sign), expected);
  }

  assert.ok(
    getCompatibilityScore("PISCES", "CANCER") >
      getCompatibilityScore("PISCES", "TAURUS"),
  );
  assert.ok(
    getCompatibilityScore("PISCES", "TAURUS") >
      getCompatibilityScore("PISCES", "GEMINI"),
  );
  assert.ok(
    getCompatibilityScore("PISCES", "GEMINI") >
      getCompatibilityScore("PISCES", "SAGITTARIUS"),
  );
});

test("returns a score and meaningful reasons", () => {
  const compatibility = getCompatibility("PISCES", "CANCER");

  assert.equal(compatibility.score, 95);
  assert.ok(Array.isArray(compatibility.reasons));
  for (const expected of [/same water/i, /different modalities/i, /receptive polarity/i, /trine/i]) {
    assert.ok(compatibility.reasons.some((reason) => expected.test(reason)));
  }
});

test("calculates the same-sign conjunction score", () => {
  assert.equal(getCompatibilityScore("PISCES", "PISCES"), 81);
});

test("covers every pair with symmetrical integer scores from 0 to 100", () => {
  for (const signA of SIGNS) {
    for (const signB of SIGNS) {
      const compatibility = getCompatibility(signA, signB);
      assert.deepEqual(compatibility, getCompatibility(signB, signA));
      assert.equal(compatibility.score, getCompatibilityScore(signA, signB));
      assert.ok(Number.isInteger(compatibility.score));
      assert.ok(compatibility.score >= 0 && compatibility.score <= 100);
      assert.ok(Array.isArray(compatibility.reasons));
    }
  }
});

test("returns null for invalid signs", () => {
  for (const invalid of ["OPHIUCHUS", null, undefined]) {
    assert.equal(getCompatibility("PISCES", invalid), null);
    assert.equal(getCompatibility(invalid, "PISCES"), null);
    assert.equal(getCompatibilityScore("PISCES", invalid), null);
    assert.equal(getCompatibilityScore(invalid, "PISCES"), null);
  }
});
