/** @type {import('tailwindcss').Config} */
// Colors point at CSS variables (see globals.css) so every utility follows the
// active light / dark theme. Opacity modifiers are intentionally not used.
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        fg: 'var(--text)',
        fg2: 'var(--text-2)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-solid': 'var(--accent-solid)',
        'on-accent': 'var(--on-accent)',
        'accent-soft': 'var(--accent-soft)',
      },
      fontFamily: {
        sans: ["'Inter'", 'system-ui', '-apple-system', "'Segoe UI'", 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
