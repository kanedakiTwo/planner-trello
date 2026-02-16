/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aikit': {
          50: '#EAEEFD',
          100: '#D6DEFB',
          200: '#AFBEF5',
          300: '#8198EB',
          400: '#4569FC',
          500: '#2E56FC',
          600: '#1238D5',
          700: '#18319A',
          800: '#1B2B64',
          900: '#111936',
        },
        'priority-low': '#12B76A',
        'priority-medium': '#FFA90A',
        'priority-high': '#ff9f1a',
        'priority-urgent': '#F14437',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Hedvig Letters Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
