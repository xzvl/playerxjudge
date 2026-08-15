import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // xzvlstore-derived M3 token palette. Each one is a CSS variable
        // holding a raw "R G B" triple (not a hex string) specifically so
        // Tailwind's `/<alpha>` opacity modifiers keep working (`rgb(var(...)
        // / <alpha-value>)` — the same trick the shadcn slots below already
        // use with HSL triples). The variables themselves live in
        // app/globals.css: dark values on `:root` (the original/default
        // theme, unchanged from before this ever had variables), light
        // values on `:root[data-theme="light"]` — see ThemeToggle.
        "on-secondary-container": "rgb(var(--m3-on-secondary-container) / <alpha-value>)",
        "on-primary-fixed": "rgb(var(--m3-on-primary-fixed) / <alpha-value>)",
        primary: "rgb(var(--m3-primary) / <alpha-value>)",
        outline: "rgb(var(--m3-outline) / <alpha-value>)",
        "on-error": "rgb(var(--m3-on-error) / <alpha-value>)",
        "on-tertiary-container": "rgb(var(--m3-on-tertiary-container) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--m3-on-surface-variant) / <alpha-value>)",
        "on-primary": "rgb(var(--m3-on-primary) / <alpha-value>)",
        "secondary-fixed-dim": "rgb(var(--m3-secondary-fixed-dim) / <alpha-value>)",
        "on-tertiary-fixed-variant": "rgb(var(--m3-on-tertiary-fixed-variant) / <alpha-value>)",
        "primary-container": "rgb(var(--m3-primary-container) / <alpha-value>)",
        "primary-fixed-dim": "rgb(var(--m3-primary-fixed-dim) / <alpha-value>)",
        "secondary-fixed": "rgb(var(--m3-secondary-fixed) / <alpha-value>)",
        "surface-bright": "rgb(var(--m3-surface-bright) / <alpha-value>)",
        "secondary-container": "rgb(var(--m3-secondary-container) / <alpha-value>)",
        background: "rgb(var(--m3-background) / <alpha-value>)",
        "inverse-surface": "rgb(var(--m3-inverse-surface) / <alpha-value>)",
        surface: "rgb(var(--m3-surface) / <alpha-value>)",
        "on-surface": "rgb(var(--m3-on-surface) / <alpha-value>)",
        "on-tertiary-fixed": "rgb(var(--m3-on-tertiary-fixed) / <alpha-value>)",
        "error-container": "rgb(var(--m3-error-container) / <alpha-value>)",
        "inverse-on-surface": "rgb(var(--m3-inverse-on-surface) / <alpha-value>)",
        "on-secondary": "rgb(var(--m3-on-secondary) / <alpha-value>)",
        secondary: "rgb(var(--m3-secondary) / <alpha-value>)",
        "inverse-primary": "rgb(var(--m3-inverse-primary) / <alpha-value>)",
        "outline-variant": "rgb(var(--m3-outline-variant) / <alpha-value>)",
        "surface-container": "rgb(var(--m3-surface-container) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--m3-surface-container-highest) / <alpha-value>)",
        "on-secondary-fixed": "rgb(var(--m3-on-secondary-fixed) / <alpha-value>)",
        "surface-variant": "rgb(var(--m3-surface-variant) / <alpha-value>)",
        "on-primary-fixed-variant": "rgb(var(--m3-on-primary-fixed-variant) / <alpha-value>)",
        "surface-container-low": "rgb(var(--m3-surface-container-low) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--m3-surface-container-lowest) / <alpha-value>)",
        "on-background": "rgb(var(--m3-on-background) / <alpha-value>)",
        "surface-tint": "rgb(var(--m3-surface-tint) / <alpha-value>)",
        error: "rgb(var(--m3-error) / <alpha-value>)",
        "surface-dim": "rgb(var(--m3-surface-dim) / <alpha-value>)",
        "on-tertiary": "rgb(var(--m3-on-tertiary) / <alpha-value>)",
        "tertiary-container": "rgb(var(--m3-tertiary-container) / <alpha-value>)",
        "surface-container-high": "rgb(var(--m3-surface-container-high) / <alpha-value>)",
        "primary-fixed": "rgb(var(--m3-primary-fixed) / <alpha-value>)",
        "on-primary-container": "rgb(var(--m3-on-primary-container) / <alpha-value>)",
        "tertiary-fixed-dim": "rgb(var(--m3-tertiary-fixed-dim) / <alpha-value>)",
        tertiary: "rgb(var(--m3-tertiary) / <alpha-value>)",
        "on-secondary-fixed-variant": "rgb(var(--m3-on-secondary-fixed-variant) / <alpha-value>)",
        "on-error-container": "rgb(var(--m3-on-error-container) / <alpha-value>)",
        "tertiary-fixed": "rgb(var(--m3-tertiary-fixed) / <alpha-value>)",
        // shadcn/ui semantic slots, mapped onto the same palette via CSS variables
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
      spacing: {
        "container-max": "1440px",
        unit: "4px",
        "margin-mobile": "16px",
        "margin-desktop": "64px",
        gutter: "24px",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "fade-in": "fade-in 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        blink: "blink 1s step-start infinite",
        marquee: "marquee 30s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
