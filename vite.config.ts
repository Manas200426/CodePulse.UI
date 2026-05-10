import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { inspectorServer } from '@react-dev-inspector/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ✅ important
    inspectorServer(),  
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})