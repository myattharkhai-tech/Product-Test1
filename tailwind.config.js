/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F4F6FA',
          100: '#E8ECF3',
          200: '#C7D0E0',
          300: '#9FAFCB',
          400: '#6B7FA8',
          500: '#475882',
          600: '#334269',
          700: '#283456',
          800: '#1E2A44',
          900: '#15203A',
          950: '#0E1628',
        },
        ice: {
          50: '#F5FAFD',
          100: '#EAF3FA',
          200: '#D4E8F4',
          300: '#BFD7EA',
          400: '#9FC0DB',
          500: '#7BA8C9',
          600: '#5B8AB4',
          700: '#48709A',
          800: '#3A5A7E',
          900: '#2E4865',
        },
        coral: {
          50: '#FDF2F0',
          100: '#FAE0DC',
          200: '#F5C5BC',
          300: '#EEA193',
          400: '#E2725B',
          500: '#D5583E',
          600: '#B8432B',
          700: '#933321',
          800: '#72291D',
          900: '#5A2218',
        },
        teal: {
          50: '#F0F8F7',
          100: '#D9EFE9',
          200: '#B5E0D8',
          300: '#8ECFC4',
          400: '#5FA8A0',
          500: '#4A8E87',
          600: '#3A726D',
          700: '#2E5B57',
          800: '#244845',
          900: '#1B3633',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
