module.exports = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',          // if your pages live here
    './components/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* brand palette ------------------------------------------------ */
        primary:        "#0c1d40", // navy
        "primary-600":  "#344f86", // steel blue
        "primary-50":   "#dff1ff", // pale sky  (btn hovers, banners)
        accent:         "#ff6a51", // coral     (call-to-action, badges)
        surface:        "#ffffff", // plain white background
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme("colors.slate.800"),
            a: {
              color: theme("colors.primary-600"),
              "&:hover": { color: theme("colors.accent") },
            },
            h1: { color: theme("colors.primary"), fontWeight: "700" },
            h2: { color: theme("colors.primary-600"), fontWeight: "600" },
            strong: { color: theme("colors.primary") },
            blockquote: {
              borderLeftColor: theme("colors.accent"),
              color: theme("colors.slate.700"),
              fontStyle: "italic",
            },
          },
        },
        docs: {
          css: {
            fontFamily: 'Arial, "Helvetica Neue", sans-serif',
            lineHeight: '1.6',
            p: { marginTop: '0.5em', marginBottom: '0.5em' },
            h1: {
              fontSize: '1.875rem',
              fontWeight: '800',
              marginBottom: '0.75em',
            },
            h2: {
              fontSize: '1.25rem',
              fontWeight: '700',
              marginTop: '1.5em',
              marginBottom: '0.5em',
            },
            a: {
              color: theme('colors.primary-600'),
              textDecoration: 'underline',
              '&:hover': { color: theme('colors.accent') },
            },
            strong: { fontWeight: '700' },
            ul: { paddingLeft: '1.25em', listStyleType: 'disc' },
            li: { marginTop: '0.25em', marginBottom: '0.25em' },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};