/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#1F2937',       // dark blue-gray
        'accent-blue': '#3B82F6',  // blue
        'accent-green': '#10B981', // green
        'background-light': '#F9FAFB',
        'background-dark': '#111827',
        // You can also map these to existing Tailwind color names if preferred
        // e.g., gray: { 50: '#F9FAFB', 900: '#111827' }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['monospace'], // Basic monospace, or you could specify another like 'Manrope' if desired for mono
      },
    },
  },
  plugins: [],
} 