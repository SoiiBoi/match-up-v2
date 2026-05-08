/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        background: '#050a05',
        surface: '#0d1f0d',
        'surface-2': '#162816',
        border: '#1e3a1e',
        primary: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          foreground: '#050a05',
        },
        muted: {
          DEFAULT: '#9ca3af',
          foreground: '#6b7280',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fef2f2',
        },
        accent: {
          DEFAULT: '#162816',
          foreground: '#22c55e',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
