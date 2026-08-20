/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        amstar: {
          blue: "#0b3068",
          red: "#d62027",
        },
      },
    },
  },
  plugins: [],
};
