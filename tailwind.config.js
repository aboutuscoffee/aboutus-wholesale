export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#292524', soft: '#57534e', mute: '#8a837c' },
        cream: { DEFAULT: '#f4efe9', deep: '#ebe3d9', line: '#ddd3c6' },
        sea: { DEFAULT: '#5a8fa8', deep: '#3f6f87', pale: '#e3edf1' },
        gold: '#a8813f',
        rust: '#b0583f',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Shippori Mincho"', 'serif'],
        sans: ['"Zen Kaku Gothic New"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
