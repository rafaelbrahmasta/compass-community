import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens COMPASS
        primary: {
          DEFAULT: '#0B3D2E',
          dark: '#072A20',
          light: '#1a5c46',
        },
        gold: {
          DEFAULT: '#B8860B',
          light: '#D4A017',
          dark: '#A67C00',
        },
        dark: {
          DEFAULT: '#0A0A0A',
          surface: '#111111',
          card: '#1a1a1a',
        },
      },
      fontFamily: {
        heading: ['Oswald', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(184, 134, 11, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(184, 134, 11, 0)' },
        },
      },
    },
  },
  plugins: [typography],
}
