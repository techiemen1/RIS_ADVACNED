import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    host: '192.168.1.34',
    port: 3000,
    https: false, // Disabled to resolve SSL_ERROR_RX_RECORD_TOO_LONG mismatch
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        secure: false, // Ignored in HTTP mode
        changeOrigin: true
      },
      '/vosk': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        ws: true, // Enable websocket proxying for V3 Dictation
        rewrite: (path) => path.replace(/^\/vosk/, '')
      }
    }
  }
});
