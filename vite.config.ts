import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 源码放在 app/，构建产物输出到 dist/，再由 scripts/copy-dist.mjs 拷到仓库根目录发布到 GitHub Pages。
export default defineConfig({
  base: "/personal-homepage/",
  root: "app",
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2019",
    assetsDir: "assets",
  },
  server: {
    host: true,
    port: 5174,
    open: false,
  },
});
