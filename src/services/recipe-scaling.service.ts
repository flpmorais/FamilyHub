const NUMERIC_REGEX = /^(\d+\.?\d*)\s*/;

/**
 * Scale an ingredient quantity proportionally based on servings ratio.
 * Non-numeric quantities (e.g., "q.b.", "a gosto") are returned unchanged.
 */
export function scaleQuantity(
  originalQty: string | null,
  originalServings: number,
  targetServings: number,
): string | null {
  if (originalQty == null) return null;
  if (originalServings === targetServings) return originalQty;
  if (originalServings <= 0) return originalQty;

  const match = originalQty.match(NUMERIC_REGEX);
  if (!match) return originalQty;

  const numericValue = parseFloat(match[1]);
  const scaled = (numericValue * targetServings) / originalServings;
  const rounded = Math.round(scaled * 10) / 10;
  const suffix = originalQty.slice(match[0].length);

  const display =
    rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded);
  return display + suffix;
}
