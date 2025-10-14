/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        'float-slow': {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "33%": { transform: "translateY(-20px) translateX(10px)" },
          "66%": { transform: "translateY(20px) translateX(-10px)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.2" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)", opacity: "0.3" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)", opacity: "0.1" },
          "100%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.2" },
        },
        'blob-reverse': {
          "0%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.2" },
          "33%": { transform: "translate(-30px, 50px) scale(0.9)", opacity: "0.3" },
          "66%": { transform: "translate(20px, -20px) scale(1.1)", opacity: "0.1" },
          "100%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.2" },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '0.6' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 20s ease-in-out infinite',
        blob: 'blob 15s infinite ease-in-out',
        'blob-reverse': 'blob-reverse 15s infinite ease-in-out reverse',
        'pulse-slow': 'pulse-slow 20s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin-slow 40s linear infinite',
      },
    },
  },
  darkMode: "class",
  plugins: [],
};