/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.{html,js}'],
  theme: {
    extend: {
      screens: {
        xs: "390px",
      },
      fontFamily: {
        sans: ["Inter"]
      },
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

