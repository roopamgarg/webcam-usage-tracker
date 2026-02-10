/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Soft Sage
        sage: {
          50: '#F0F7F5',
          100: '#E0EFEB',
          200: '#C0DFD7',
          300: '#9FCFC3',
          400: '#6FAF9A',
          500: '#5A9F8A',
          600: '#4A8F7A',
          700: '#3A7F6A',
          800: '#2A6F5A',
          900: '#1A5F4A',
        },

        // Neutrals - Spotify-style
        neutral: {
          0: '#FFFFFF',
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EBEBEB',
          300: '#D1D1D1',
          400: '#A7A7A7',
          500: '#727272',
          600: '#535353',
          700: '#404040',
          800: '#282828',
          900: '#121212',
        },

        // Semantic
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
      },

      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.05em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.05em' }],
      },

      borderRadius: {
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'base': '0 2px 4px 0 rgb(0 0 0 / 0.06)',
        'card': '0 4px 16px 0 rgb(0 0 0 / 0.08)',
        'card-hover': '0 8px 32px 0 rgb(0 0 0 / 0.12)',
        'dropdown': '0 4px 24px 0 rgb(0 0 0 / 0.16)',
        'modal': '0 16px 64px 0 rgb(0 0 0 / 0.24)',
        'sage-sm': '0 2px 8px 0 rgb(111 175 154 / 0.25)',
        'sage-md': '0 4px 16px 0 rgb(111 175 154 / 0.35)',
        'sage-lg': '0 8px 32px 0 rgb(111 175 154 / 0.40)',
      },
    },
  },
  plugins: [],
}
