import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      screens: {
        xl: '992px',
      },
    },
    extend: {
      colors: {
        brand: {
          pink: '#e02ecf',
          purple: '#8a2be2',
          yellow: '#cba727',
          green: '#50ba9a',
          black: '#14161b',
          red: '#e02e2e',
          gray: '#666666',
        },
        surface: {
          light: '#ffffff',
          med: '#fcfcfc',
          dark: '#f5f5f5',
        },
        border: {
          light: 'rgba(0, 0, 0, 0.04)',
          med: 'rgba(0, 0, 0, 0.1)',
          dark: 'rgba(102, 102, 102, 0.25)',
        },
      },
      boxShadow: {
        low: '0px 4px 12px rgba(0, 0, 0, 0.03)',
        high: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['PT Root UI', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        londrina: ['Londrina Solid', 'cursive'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
