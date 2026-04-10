/** @type {import('tailwindcss').Config} */
// NOTE: This project uses Tailwind CSS v4 with @tailwindcss/vite.
// In v4, design tokens (colors, fonts, spacing, etc.) are defined via
// the @theme block in src/index.css — NOT in this config file.
// This file is kept for compatibility; only content + darkMode are used.
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
