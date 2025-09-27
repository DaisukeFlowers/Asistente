/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui','sans-serif']
      },
      colors: {
        brand: {
          50: '#F0F8FB',
          100: '#D9ECF3',
          200: '#B3D9E7',
          300: '#8CC5DA',
          400: '#2D84A4',
            500: '#176688',
          600: '#14506B',
          700: '#0F3D56',
          800: '#0C2F42',
          900: '#091F2C'
        },
        accent: {
          500: '#23A6C8',
          600: '#1F8EAD'
        },
        surface: {
          base: '#F5F8FA',
          alt: '#FFFFFF',
          muted: '#EEF3F6'
        }
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(circle at 25% 20%, rgba(35,166,200,0.18), transparent 62%), radial-gradient(circle at 85% 55%, rgba(20,80,107,0.20), transparent 68%)'
      },
      boxShadow: {
        card: '0 4px 16px -4px rgba(15,61,86,0.10), 0 2px 6px -1px rgba(15,61,86,0.06)',
        cardHover: '0 8px 28px -6px rgba(15,61,86,0.18), 0 4px 10px -2px rgba(15,61,86,0.10)'
      },
      fontSize: {
        'body-sm': ['0.8125rem', { lineHeight: '1.4' }],
        'body': ['0.9375rem', { lineHeight: '1.55' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.55' }],
        'display': ['2.625rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }]
      }
    }
  },
  plugins: []
};