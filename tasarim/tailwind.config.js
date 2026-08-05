/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: {
          50: '#f6f1ee',
          100: '#e8dbd3',
          200: '#d0b8a8',
          300: '#b08e76',
          400: '#8a6a4f',
          500: '#6b4f3a',
          600: '#523d2d',
          700: '#3c2a21',
          800: '#2c1a1d',
          900: '#1e1013',
        },
        cream: {
          50: '#fffdf9',
          100: '#faf6f0',
          200: '#f5ebe0',
          300: '#f0ddc8',
          400: '#e8caa8',
          500: '#dfb27e',
        },
        caramel: {
          50: '#fbf3ed',
          100: '#f5e0cf',
          200: '#ebbf9c',
          300: '#e0a372',
          400: '#d4a373',
          500: '#c08550',
          600: '#a66b3e',
          700: '#845532',
          800: '#6b4529',
          900: '#523620',
        },
        ember: {
          400: '#e07a5f',
          500: '#d5684f',
          600: '#bd5340',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
