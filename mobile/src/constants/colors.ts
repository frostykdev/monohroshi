export const colors = {
  // Backgrounds
  background: "#1B1F2E",
  backgroundElevated: "#252A3A",
  backgroundSurface: "#2E3447",

  // Brand
  accent: "#F0B90B",
  accentPressed: "#D4A800",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.55)",
  textTertiary: "rgba(255, 255, 255, 0.35)",
  textDisabled: "rgba(255, 255, 255, 0.25)",
  textOnAccent: "#1B1F2E",

  // Borders
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.2)",

  // Semantic
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",

  // Icon backgrounds (iOS system palette)
  iconBlue: "#007AFF",
  iconPurple: "#AF52DE",
  iconTeal: "#32ADE6",
  iconYellow: "#FFCC00",

  // Pro banner
  proBannerBackground: "#1B3A28",

  // Misc
  transparent: "transparent",
} as const;

export type AppColor = keyof typeof colors;
