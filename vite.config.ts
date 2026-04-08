import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router/')
          ) {
            return 'react-core';
          }

          if (id.includes('/recharts/')) {
            return 'charts';
          }

          if (id.includes('/@radix-ui/')) {
            return 'radix-ui';
          }

          if (id.includes('/framer-motion/') || id.includes('/motion/')) {
            return 'motion';
          }

          if (id.includes('/react-dnd/')) {
            return 'dnd';
          }

          if (id.includes('/socket.io-client/')) {
            return 'realtime';
          }
        },
      },
    },
  },
})
