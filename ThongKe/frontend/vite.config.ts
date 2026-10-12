import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  // Mặc định "/" (chạy độc lập / qua Portal như cũ). Khi nhúng dưới Điều phối
  // thì build với VITE_BASE_PATH=/thong-ke/ để asset + router nằm dưới tiền tố đó.
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/features": path.resolve(__dirname, "./src/modules"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
