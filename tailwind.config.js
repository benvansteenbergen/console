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
        accent:         "#ff6a51", // coral     (call‑to‑action, badges)
        surface:        "#ffffff", // plain white background
      },
    },
  },
  plugins: [],
};