/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#7C3AED',
          600: '#7C5CFC',
          700: '#6C5CE7',
        },
        surface: {
          bg: '#F4F5FB',
          card: '#FFFFFF',
          textPrimary: '#1E1B4B',
          textSecondary: '#64748B',
          border: '#E2E8F0',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(124, 92, 252, 0.08)',
        'pill': '0 4px 14px 0 rgba(108, 92, 231, 0.35)',
      }
    },
  },
  plugins: [],
}
