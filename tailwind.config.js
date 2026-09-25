/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        accent: "var(--accent)",
        highlight: "var(--highlight)",
        background: "var(--background)",
        card: "var(--card)",
        border: "var(--border)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-blue': 'pulse-blue 2s ease-in-out infinite',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(27,58,107,0.06)',
        'card-hover': '0 6px 24px rgba(27,58,107,0.12)',
        'primary-glow': '0 4px 20px rgba(27,58,107,0.2)',
        'highlight-glow': '0 4px 20px rgba(249,115,22,0.25)',
      },
    },
  },
  plugins: [],
};
