/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: '#F7F5F0',
        borde: '#E6E0D4',
        rojo: '#D63B2F',
        oferta: '#F2B705',
        corp: '#1B4D8F',
        ahorro: '#2E7D5B',
        urbano: '#2B2D33',
        tenue: '#6E6A63'
      },
      fontFamily: {
        display: ['"Archivo Black"', '"Arial Black"', 'Impact', 'sans-serif'],
        sans: ['Archivo', '"Segoe UI"', 'system-ui', 'sans-serif']
      },
      boxShadow: { card: '0 1px 2px rgba(43,45,51,.06), 0 6px 18px rgba(43,45,51,.06)' }
    }
  },
  plugins: []
}
