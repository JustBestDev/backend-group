const ZODIAC_METADATA = {
  ARIES: { element: "FIRE", modality: "CARDINAL", polarity: "POSITIVE", index: 0 },
  TAURUS: { element: "EARTH", modality: "FIXED", polarity: "NEGATIVE", index: 1 },
  GEMINI: { element: "AIR", modality: "MUTABLE", polarity: "POSITIVE", index: 2 },
  CANCER: { element: "WATER", modality: "CARDINAL", polarity: "NEGATIVE", index: 3 },
  LEO: { element: "FIRE", modality: "FIXED", polarity: "POSITIVE", index: 4 },
  VIRGO: { element: "EARTH", modality: "MUTABLE", polarity: "NEGATIVE", index: 5 },
  LIBRA: { element: "AIR", modality: "CARDINAL", polarity: "POSITIVE", index: 6 },
  SCORPIO: { element: "WATER", modality: "FIXED", polarity: "NEGATIVE", index: 7 },
  SAGITTARIUS: { element: "FIRE", modality: "MUTABLE", polarity: "POSITIVE", index: 8 },
  CAPRICORN: { element: "EARTH", modality: "CARDINAL", polarity: "NEGATIVE", index: 9 },
  AQUARIUS: { element: "AIR", modality: "FIXED", polarity: "POSITIVE", index: 10 },
  PISCES: { element: "WATER", modality: "MUTABLE", polarity: "NEGATIVE", index: 11 },
};

const ZODIAC_BY_MONTH = [
  [20, "CAPRICORN", "AQUARIUS"],
  [19, "AQUARIUS", "PISCES"],
  [21, "PISCES", "ARIES"],
  [20, "ARIES", "TAURUS"],
  [21, "TAURUS", "GEMINI"],
  [21, "GEMINI", "CANCER"],
  [23, "CANCER", "LEO"],
  [23, "LEO", "VIRGO"],
  [23, "VIRGO", "LIBRA"],
  [23, "LIBRA", "SCORPIO"],
  [22, "SCORPIO", "SAGITTARIUS"],
  [22, "SAGITTARIUS", "CAPRICORN"],
];

const ELEMENT_PAIRS = {
  "AIR|EARTH": [-12, "Earth and air elements can create tension"],
  "AIR|FIRE": [12, "Fire and air elements are traditionally complementary"],
  "EARTH|WATER": [12, "Water and earth elements are traditionally complementary"],
  "FIRE|WATER": [-12, "Water and fire elements can create tension"],
};

const SAME_MODALITY = {
  CARDINAL: [-3, "Both cardinal signs may compete for direction"],
  FIXED: [-5, "Both fixed signs may be less flexible"],
  MUTABLE: [1, "Both mutable signs tend to be adaptable"],
};

const ASPECTS = [
  [10, "Same-sign conjunction"],
  [-3, "Adjacent sign relationship"],
  [12, "Sextile sign relationship"],
  [-12, "Square sign relationship"],
  [20, "Trine sign relationship"],
  [-5, "Quincunx sign relationship"],
  [-8, "Opposition sign relationship"],
];

export function getZodiacSign(birthdate) {
  if (birthdate == null) return null;

  let parsedDate;
  try {
    parsedDate = new Date(birthdate);
  } catch {
    return null;
  }

  if (Number.isNaN(parsedDate.getTime())) return null;

  const month = parsedDate.getUTCMonth();
  const day = parsedDate.getUTCDate();
  const [cutoff, before, after] = ZODIAC_BY_MONTH[month];
  return day < cutoff ? before : after;
}

// Astrology-based product heuristic, not a scientific prediction.
export function getCompatibility(signA, signB) {
  if (
    typeof signA !== "string" ||
    typeof signB !== "string" ||
    !Object.hasOwn(ZODIAC_METADATA, signA) ||
    !Object.hasOwn(ZODIAC_METADATA, signB)
  ) return null;

  const zodiacA = ZODIAC_METADATA[signA];
  const zodiacB = ZODIAC_METADATA[signB];

  let score = 50;
  const reasons = [];

  if (zodiacA.element === zodiacB.element) {
    score += 15;
    reasons.push(`Same ${zodiacA.element.toLowerCase()} element`);
  } else {
    const elementPair = [zodiacA.element, zodiacB.element].sort().join("|");
    const elementRule = ELEMENT_PAIRS[elementPair];
    if (elementRule) {
      score += elementRule[0];
      reasons.push(elementRule[1]);
    }
  }

  if (zodiacA.modality === zodiacB.modality) {
    const modalityRule = SAME_MODALITY[zodiacA.modality];
    score += modalityRule[0];
    reasons.push(modalityRule[1]);
  } else {
    score += 5;
    reasons.push("Different modalities can balance each other");
  }

  if (zodiacA.polarity === zodiacB.polarity) {
    score += 5;
    reasons.push(
      zodiacA.polarity === "POSITIVE"
        ? "Shared expressive polarity"
        : "Shared receptive polarity",
    );
  }

  const distance = Math.abs(zodiacA.index - zodiacB.index);
  const aspectRule = ASPECTS[Math.min(distance, 12 - distance)];
  score += aspectRule[0];
  reasons.push(aspectRule[1]);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
  };
}

export function getCompatibilityScore(signA, signB) {
  const compatibility = getCompatibility(signA, signB);
  return compatibility?.score ?? null;
}
