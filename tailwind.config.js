/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0284c7", // Sky 600 - Darker Blue as constant
        secondary: "#bae6fd", // Sky 200 - Slightly darker background
      },
    },
  },
  plugins: [],
}
