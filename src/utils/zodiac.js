const ZODIAC_SIGNS = [
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

const COMPATIBILITY_SCORES = [
  [78, 68, 88, 55, 90, 65, 75, 60, 85, 62, 80, 58],
  [84, 65, 82, 70, 88, 76, 90, 58, 86, 63, 86],
  [76, 60, 82, 84, 90, 68, 88, 62, 74, 52],
  [85, 72, 80, 88, 58, 92, 70, 66, 95],
  [86, 70, 83, 72, 84, 64, 78, 60],
  [82, 85, 86, 62, 88, 72, 80],
  [83, 74, 87, 68, 90, 65],
  [88, 72, 84, 66, 94],
  [82, 64, 86, 48],
  [85, 70, 82],
  [80, 60],
  [86],
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

export function getCompatibilityScore(signA, signB) {
  const indexA = ZODIAC_SIGNS.indexOf(signA);
  const indexB = ZODIAC_SIGNS.indexOf(signB);
  if (indexA === -1 || indexB === -1) return null;

  const first = Math.min(indexA, indexB);
  const second = Math.max(indexA, indexB);
  return COMPATIBILITY_SCORES[first][second - first];
}
