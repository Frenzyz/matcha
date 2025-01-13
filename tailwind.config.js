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
        theme: {
          primary: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)'
        }
      },
      animation: {
        'calendar-glow': 'calendar-glow 2s ease-in-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
      keyframes: {
        'calendar-glow': {
          '0%': { boxShadow: '0 0 0 rgba(16, 185, 129, 0)' },
          '50%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' },
          '100%': { boxShadow: '0 0 0 rgba(16, 185, 129, 0)' }
        },
        'slide-up': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    },
  },
  plugins: [],
};
