/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'priority-low': '#61bd4f',
        'priority-medium': '#f2d600',
        'priority-high': '#ff9f1a',
        'priority-urgent': '#eb5a46',
      }
    },
  },
  plugins: [],
}
