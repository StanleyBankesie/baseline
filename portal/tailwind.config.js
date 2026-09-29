/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    fontFamily: {
      sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
    },
    extend: {
      colors: {
        // User-defined Brand Blend: #0E3646, #F57C00, #2E8B1F
        brand: {
          DEFAULT: "#0E3646", // Deep Teal / Navy Base
          50: "#f0f7fa",
          100: "#e1eff5",
          200: "#c2deeb",
          300: "#94c3db",
          400: "#5fa2c4",
          500: "#3b86a8",
          600: "#296d8f",
          700: "#215876",
          800: "#173d50",
          900: "#0E3646",
          950: "#061a22",
        },
        // Primary Action Color (Mapped to brand-900)
        primary: {
          DEFAULT: "#0E3646",
          light: "#173d50",
          dark: "#061a22",
          50: "#f0f7fa",
        },
        // Secondary Color (Custom Golden Yellow)
        secondary: {
          DEFAULT: "#F9B514",
          light: "#FBCD49",
          dark: "#E59E04",
          50: "#FFFDF2",
        },
        // Status Colors
        status: {
          success: "#2E8B1F",
          warning: "#F57C00",
          error: "#ef4444",
          info: "#0E3646",
          pending: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};
