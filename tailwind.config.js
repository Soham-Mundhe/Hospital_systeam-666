/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      primary: "#0ea5e9", // Sky 500 - Darker Blue as requested
      secondary: "#e0f2fe", // Sky 50 - Light Blue for backgrounds
    },
  },
  plugins: [],
}
