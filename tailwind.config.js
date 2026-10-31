/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--nc-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nc: {
          cyan: token('cyan'),
          blue: token('blue'),
          bg: token('bg'),
          surface: token('surface'),
          raised: token('raised'),
          text: token('text'),
          muted: token('muted'),
          out: token('out'),
          in: token('in'),
          chat: token('chat'),
          danger: token('danger'),
          warning: token('warning'),
          success: token('success'),
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 2px 8px -2px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
