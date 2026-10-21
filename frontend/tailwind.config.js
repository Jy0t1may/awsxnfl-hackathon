/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        field: {
          dark: '#0f291e',
          turf: '#16382b',
          line: '#385848',
          hash: 'rgba(255, 255, 255, 0.45)',
          endzone: '#0b1d15',
        },
        origin: {
          ngs: '#10b981', // Emerald
          nflverse: '#0ea5e9', // Sky Blue
          pfr: '#f59e0b', // Amber
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
