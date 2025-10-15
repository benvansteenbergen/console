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
            color: '#000000',
            lineHeight: '1.5',
            maxWidth: 'none',
            h1: {
              fontSize: '1.875rem',
              fontWeight: '700',
              color: '#000000',
              marginBottom: '0.6em',
            },
            h2: {
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#000000',
              marginTop: '1.2em',
              marginBottom: '0.4em',
            },
            h3: {
              fontSize: '1rem',
              fontWeight: '600',
              color: '#000000',
            },
            strong: {
              fontWeight: '700',
              color: '#000000',
            },
            a: {
              color: '#000000',
              textDecoration: 'underline',
            },
            p: {
              marginTop: '0.4em',
              marginBottom: '0.4em',
            },
            ul: {
              paddingLeft: '1.25em',
              listStyleType: 'disc',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};