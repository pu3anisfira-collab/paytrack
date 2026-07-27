/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paytrack: {
          navy: '#0F234F',
          blue: '#2F6BFF',
          'blue-dark': '#1E52D8',
          teal: '#15C7B8',
          'teal-dark': '#0FB0A3',
          emerald: '#00D4A3',
          purple: '#6C3BFF',
          orange: '#FFA51F',
        },
        gray: {
          light: '#F5F7FB',
          medium: '#D8E0EA',
          dark: '#5F6C7B',
        },
        // Semantic aliases
        'text-primary': '#0F234F',
        'text-secondary': '#5F6C7B',
        'text-light': '#9EAFBF',
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        card: 'hsl(var(--card))',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
