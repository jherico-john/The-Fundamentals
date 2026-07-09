/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00FF87', dark: '#00C46A', deeper: '#007A42',
          bg: '#051A0D', surface: '#0A2E18', card: '#0D3B20', border: '#1A5C35',
        },
      },
    },
  },
  plugins: [],
};
