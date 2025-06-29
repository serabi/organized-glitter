import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      spacing: {
        '120': '30rem', // 480px for tablet wheel size
        '140': '35rem', // 560px for desktop wheel size
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Custom colors for Organized Glitter
        diamond: {
          50: '#f8f5ff', // Very light lavender
          100: '#f3ebff',
          200: '#e9d7ff', // Light lavender (#e9d7ff)
          300: '#d8b4ff', // Medium lavender (#d8b4ff)
          400: '#c084fc', // Lavender (#c084fc)
          500: '#a855f7', // Primary lavender (#a855f7)
          600: '#9333ea', // Medium dark lavender (#9333ea)
          700: '#7e22ce', // Dark lavender (#7e22ce)
          800: '#6b21a8', // Very dark lavender (#6b21a8)
          900: '#581c87', // Blackish lavender (#581c87)
        },
        flamingo: {
          50: '#fff1f2', // Lightest flamingo pink
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e', // Primary flamingo pink
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337', // Darkest flamingo pink
        },
        peach: {
          50: '#fff7ed', // Lightest peach
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74', // Soft peach
          400: '#fb923c',
          500: '#f97316', // Primary peach/orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12', // Darkest peach
        },
        mauve: {
          50: '#fdf4ff', // Lightest mauve
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef', // Primary mauve
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75', // Darkest mauve
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
