const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    join(__dirname, 'src/**/*!(*.stories|*.spec).{ts,tsx,html}'),
    // Explicitly include libs so Tailwind scans them (Nx dependency globs can be empty at build time)
    join(__dirname, '../../libs/**/*!(*.stories|*.spec).{ts,tsx,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: '0.625rem',
        sm: '0.375rem',
        md: '0.625rem',
        lg: '1rem',
        xl: '1.25rem',
        full: '9999px',
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
          light: 'hsl(var(--primary-light))',
          dark: 'hsl(var(--primary-dark))',
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
        surface: {
          default: 'hsl(var(--surface-default))',
          subtle: 'hsl(var(--surface-subtle))',
          card: 'hsl(var(--surface-card))',
          input: 'hsl(var(--surface-input))',
        },
        'text-token': {
          muted: 'hsl(var(--text-muted))',
          faint: 'hsl(var(--text-faint))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
        },
        nav: {
          background: 'hsl(var(--nav-background))',
          border: 'hsl(var(--nav-border))',
          pill: 'hsl(var(--nav-pill))',
          'pill-foreground': 'hsl(var(--nav-pill-foreground))',
          'pill-unselected': 'hsl(var(--nav-pill-unselected-text))',
        },
        auth: {
          page: 'hsl(var(--auth-page-background))',
          card: 'hsl(var(--auth-card-background))',
          field: 'hsl(var(--auth-field-background))',
        },
        'question-view': {
          background: 'hsl(var(--question-view-background))',
          border: 'hsl(var(--question-view-border))',
          text: 'hsl(var(--question-view-text))',
        },
        solution: {
          background: 'hsl(var(--solution-background))',
          border: 'hsl(var(--solution-border))',
        },
        editor: {
          background: 'hsl(var(--editor-wrapper-background))',
          asterisk: 'hsl(var(--editor-asterisk))',
        },
        'choice-editor': {
          background: 'hsl(var(--choice-editor-background))',
          border: 'hsl(var(--choice-editor-border))',
        },
        'choice-item': {
          background: 'hsl(var(--choice-item-background))',
          border: 'hsl(var(--choice-item-border))',
        },
        table: {
          head: 'hsl(var(--table-head-color))',
          'row-border': 'hsl(var(--table-row-border))',
          'head-border': 'hsl(var(--table-head-border))',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'auth-card': 'var(--shadow-auth-card)',
        nav: 'var(--shadow-nav)',
        sm: 'var(--shadow-sm)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
