/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.{html,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter"]
      },
      // --caramel-400: 243, 234, 210;
      // --caramel-700: 212, 177, 89;
      // --black: 40, 40, 40;
      // --black-700: 29, 32, 33;
      // --white: 255, 255, 255;
      // --purple: 211, 134, 155;
      // --blue: 131, 165, 152;
      // --red: 251, 73, 52;
      // --green: 184, 187, 38;
      // --aqua: 142, 192, 124;
      colors: {
        caramel: {
          DEFAULT: "rgb(var(--caramel))",
          400: "rgb(var(--caramel-400))",
          700: "rgb(var(--caramel-700))",
        },
        black: {
          DEFAULT: "rgb(var(--black))",
          700: "rgb(var(--black-700))",
        },
        purple: {
          DEFAULT: "rgb(var(--purple))",
        },
      }
    },
  },
  plugins: [],
}

