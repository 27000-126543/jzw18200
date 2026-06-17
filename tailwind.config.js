/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        farm: {
          primary: "rgb(45 106 79 / <alpha-value>)",
          "primary-light": "rgb(64 145 108 / <alpha-value>)",
          "primary-dark": "rgb(27 67 50 / <alpha-value>)",
          secondary: "rgb(212 163 115 / <alpha-value>)",
          "secondary-light": "rgb(233 196 106 / <alpha-value>)",
          accent: "rgb(119 73 54 / <alpha-value>)",
          "accent-light": "rgb(169 123 95 / <alpha-value>)",
          bg: "rgb(250 248 245 / <alpha-value>)",
          surface: "rgb(255 255 255 / <alpha-value>)",
          "surface-alt": "rgb(245 241 235 / <alpha-value>)",
          border: "rgb(232 224 213 / <alpha-value>)",
          success: "rgb(82 183 136 / <alpha-value>)",
          warning: "rgb(244 162 97 / <alpha-value>)",
          danger: "rgb(231 111 81 / <alpha-value>)",
          info: "rgb(69 123 157 / <alpha-value>)",
        },
      },
      fontFamily: {
        display: [
          '"LXGW WenKai"',
          '"霞鹜文楷"',
          '"KaiTi"',
          '"STKaiti"',
          "serif",
        ],
        sans: [
          '"Microsoft YaHei UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(45, 106, 79, 0.06), 0 1px 2px rgba(45, 106, 79, 0.04)",
        "card-hover":
          "0 10px 25px -5px rgba(45, 106, 79, 0.1), 0 8px 10px -6px rgba(45, 106, 79, 0.08)",
        soft: "0 4px 12px rgba(45, 106, 79, 0.08)",
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)",
        "gradient-secondary":
          "linear-gradient(135deg, #D4A373 0%, #E9C46A 100%)",
        "gradient-accent":
          "linear-gradient(135deg, #774936 0%, #A97B5F 100%)",
        "gradient-success":
          "linear-gradient(135deg, #40916C 0%, #52B788 100%)",
        "grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease-out both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
