/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        primary: "#0066ff",
        secondary: "#ff9f1c",
        dark: "#0b3b64",
        light: "#eaf6ff",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(11,59,100,0.08)",
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out forwards",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
