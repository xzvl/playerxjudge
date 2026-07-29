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
        // xzvlstore-derived token palette
        "on-secondary-container": "#b4b5b5",
        "on-primary-fixed": "#4a0000",
        primary: "#ed0d11",
        outline: "#b18780",
        "on-error": "#690005",
        "on-tertiary-container": "#00285b",
        "on-surface-variant": "#ebbbb4",
        "on-primary": "#ffffff",
        "secondary-fixed-dim": "#c6c6c7",
        "on-tertiary-fixed-variant": "#004491",
        "primary-container": "#b60b0e",
        "primary-fixed-dim": "#ff6a6d",
        "secondary-fixed": "#e2e2e2",
        "surface-bright": "#393939",
        "secondary-container": "#454747",
        background: "#131313",
        "inverse-surface": "#e2e2e2",
        surface: "#131313",
        "on-surface": "#e2e2e2",
        "on-tertiary-fixed": "#001a40",
        "error-container": "#93000a",
        "inverse-on-surface": "#303030",
        "on-secondary": "#2f3131",
        secondary: "#c6c6c7",
        "inverse-primary": "#ff6467",
        "outline-variant": "#603e39",
        "surface-container": "#1f1f1f",
        "surface-container-highest": "#353535",
        "on-secondary-fixed": "#1a1c1c",
        "surface-variant": "#353535",
        "on-primary-fixed-variant": "#7a0000",
        "surface-container-low": "#1b1b1b",
        "surface-container-lowest": "#0e0e0e",
        "on-background": "#e2e2e2",
        "surface-tint": "#ed0d11",
        error: "#ffb4ab",
        "surface-dim": "#131313",
        "on-tertiary": "#002f67",
        "tertiary-container": "#488fff",
        "surface-container-high": "#2a2a2a",
        "primary-fixed": "#ffd7d8",
        "on-primary-container": "#fff7f7",
        "tertiary-fixed-dim": "#acc7ff",
        tertiary: "#acc7ff",
        "on-secondary-fixed-variant": "#454747",
        "on-error-container": "#ffdad6",
        "tertiary-fixed": "#d7e2ff",
        // shadcn/ui semantic slots, mapped onto the same palette via CSS variables
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
