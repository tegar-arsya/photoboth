import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";
import { default as flattenColorPalette } from "tailwindcss/lib/util/flattenColorPalette";
// Custom plugin to add each Tailwind color as a CSS variable
function addVariablesForColors({ addBase, theme }: any) {
  const allColors = flattenColorPalette(theme("colors"));
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Custom CSS variable-based colors
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Use default theme colors
        gray: colors.gray,
        blue: colors.blue,
        red: colors.red,
        // Additional color options if needed
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans], // Add custom fonts with fallbacks
      },
    },
  },
  plugins: [
    // Add the custom color variables plugin
    addVariablesForColors,
  ],
};

export default config;
