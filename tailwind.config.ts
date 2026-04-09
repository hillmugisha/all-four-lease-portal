import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef3fb',
          100: '#d5e0f4',
          200: '#abbfe9',
          500: '#3a6abf',
          600: '#1F4993',
          700: '#1a3d7c',
          900: '#122860',
        },
      },
    },
  },
  plugins: [],
}

export default config
