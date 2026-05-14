/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./assets/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1b5cff', hover: '#1648cc', foreground: '#ffffff' },
        secondary: { DEFAULT: '#36a2bc', foreground: '#ffffff' },
        accent: { DEFAULT: '#f4da40', foreground: '#1f2937' },
        muted: { DEFAULT: '#f1f5f9', foreground: '#64748b' },
        border: '#e2e8f0',
        background: '#ffffff',
        foreground: '#0f172a',
        card: '#ffffff',
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
    },
  },
  plugins: [],
}
