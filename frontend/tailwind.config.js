/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        amstar: {
          blue: "#0b3068",
          red: "#d62027",
          ground: "#13243d",
          surface: "#1b3459",
          raised: "#22406b",
          field: "#162b48",
          line: "#2d5590",
          "line-soft": "#264a7d",
          ink: "#eef3fa",
          "ink-dim": "#a4bcdc",
          "ink-faint": "#7794bf",
        },
        sev: {
          1: "#10b981",
          2: "#38bdf8",
          3: "#f0a02a",
          4: "#fb7d3c",
          5: "#ff3b41",
        },
      },
      fontFamily: {
        cond: ['"Oswald Variable"', "Oswald", '"Barlow Condensed"', '"Arial Narrow"', "sans-serif"],
        mono: ['"Roboto Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
