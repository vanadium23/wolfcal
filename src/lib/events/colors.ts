/**
 * Color palette and utilities for multi-account event color coding
 */

/**
 * Preset color palette for account differentiation
 * Using a vibrant, accessible color scheme with good contrast
 */
export const ACCOUNT_COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#eab308', // Yellow
] as const;

/**
 * Assign a color from the palette to an account based on index
 * Cycles through palette if more accounts than colors
 */
export function getAccountColor(accountIndex: number): string {
  return ACCOUNT_COLOR_PALETTE[accountIndex % ACCOUNT_COLOR_PALETTE.length];
}

/**
 * Assign colors to accounts based on their order
 * Returns a map of accountId -> color
 */
export function assignAccountColors(accountIds: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();

  accountIds.forEach((accountId, index) => {
    colorMap.set(accountId, getAccountColor(index));
  });

  return colorMap;
}
