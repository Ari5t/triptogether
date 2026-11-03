import localFont from "next/font/local";

export const inter = localFont({
  src: [
    { path: "./fonts/Inter/Inter-VariableFont_opsz,wght.ttf", style: "normal" },
    { path: "./fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf", style: "italic" },
  ],
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  // Italic is rarely used; preloading it triggers "preloaded but not used" warnings.
  preload: false,
});

export const manrope = localFont({
  src: "./fonts/Manrope/Manrope-VariableFont_wght.ttf",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: "./fonts/JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  display: "swap",
});
