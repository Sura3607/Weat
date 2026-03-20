import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      maxWidth: {
        'app': '400px',
      },
      colors: {
        primary: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#ffcdc9',
          300: '#fda4a4',
          400: '#f97066',
          500: '#f04438',
          600: '#de3024',
          700: '#bb241a',
          800: '#9a221a',
          900: '#80231c',
        },
      },
      animation: {
        'firework': 'firework 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
      keyframes: {
        firework: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
