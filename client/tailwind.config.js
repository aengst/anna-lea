/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--color-bg-primary, #ffffff)',
          surface: 'var(--color-bg-secondary, #faf9f7)',
          ink: 'var(--color-text-primary, #2f2e2e)',
          muted: 'var(--color-text-muted, #605e5e)',
          accent: 'var(--color-accent, #8c6d5a)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading, "Jost")', 'sans-serif'],
        body: ['var(--font-body, "Jost")', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
