import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#05080f', 2: '#070d18', 3: '#0b1424' },
        frost: '#eaf2ff',
        aqua: { DEFAULT: '#79e6ff', deep: '#3aa9d6', pale: '#c7f4ff' },
        azure: '#5b8cff',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      screens: { xs: '420px' },
    },
  },
  plugins: [],
} satisfies Config;
