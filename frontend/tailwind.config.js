/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        amstar: {
          blue: "#0b3068",
          red: "#d62027",
          // Red as TEXT on a dark ground. amstar-red #d62027 is a fill colour — as
          // text it measures 2.0-2.5:1 on every surface here and fails WCAG AA.
          // Never use text-amstar-red on a dark background; use text-amstar-red-ink.
          "red-ink": "#ff9ca0",
          ground: "#13243d",
          surface: "#1b3459",
          raised: "#22406b",
          field: "#162b48",
          line: "#2d5590",
          "line-soft": "#264a7d",
          ink: "#eef3fa",
          "ink-dim": "#a4bcdc",
          // Must clear 4.5:1 (WCAG AA, small text) on every ground in the theme —
          // ground, field, blue, surface, and raised alike. #7794bf failed on
          // surface (4.03:1) and raised (3.36:1); #93aed4 clears all five while
          // staying visibly dimmer than ink-dim.
          "ink-faint": "#93aed4",
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
