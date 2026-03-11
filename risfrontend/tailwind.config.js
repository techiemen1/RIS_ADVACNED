// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", // <-- IMPORTANT!
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0f172a",
          DEFAULT: "#334155",
          light: "#94a3b8",
        },
        medical: {
          blue: "#0ea5e9",
          cyan: "#06b6d4",
          success: "#10b981",
          gold: "#f59e0b",
        }
      },
      boxShadow: {
        'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}

