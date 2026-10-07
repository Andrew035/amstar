/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  future: {
    // Wraps every `hover:` variant in `@media (hover: hover) and (pointer: fine)`.
    // The app runs on iPads, where a tap counts as a hover and then sticks until
    // you tap somewhere else, leaving rows and buttons lit up after you are done
    // with them. This one flag fixes that everywhere at once, including the
    // hover styles that were already here.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        amstar: {
          blue: "#0b3068",
          red: "#c41b22",
          // Off the shop's business card. It is the wordmark's outline and
          // nothing else: red stays the alarm colour, and a second bright
          // accent loose in the UI would compete with it. Also spelled out in
          // `.logo-stroke` in index.css, which needs it as a raw value.
          //
          // This and `red` above are shared with the marketing site, which
          // sampled the same card. One pair of values across both properties
          // so the wordmark is identical wherever it appears.
          yellow: "#fbe207",
          // Red as TEXT on a dark ground. amstar-red #c41b22 is a fill colour; as
          // text it measures 2.0-2.5:1 on every surface here and fails WCAG AA.
          // Never use text-amstar-red on a dark background; use text-amstar-red-ink.
          "red-ink": "#ff9ca0",
          // Red as an OUTLINE: focus rings, validation rings, and the marks
          // that say which thing is selected. The fill red has to stay dark
          // enough to carry white text (5.95:1), which leaves it at 1.8-2.6:1
          // against these grounds - under the 3:1 WCAG 1.4.11 asks of a focus
          // indicator. This is the same hue lightened until it clears 3:1 on
          // every ground in the theme, 3.55:1 at worst (on `raised`).
          //
          // It is a stroke colour only. White on it is ~2.3:1, so never fill
          // with it, and `red-ink` is still the one for text.
          "red-edge": "#f9666b",
          ground: "#13243d",
          surface: "#1b3459",
          raised: "#22406b",
          field: "#162b48",
          line: "#2d5590",
          "line-soft": "#264a7d",
          ink: "#eef3fa",
          "ink-dim": "#a4bcdc",
          // Must clear 4.5:1 (WCAG AA, small text) on every ground in the theme:
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
        cond: [
          '"Oswald Variable"',
          "Oswald",
          '"Barlow Condensed"',
          '"Arial Narrow"',
          "sans-serif",
        ],
        mono: [
          '"Roboto Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
