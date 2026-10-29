// 把 dist/ 的构建产物拷到仓库根目录，直接由 GitHub Pages（main / root）托管。
// 用法：npm run publish:pages
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error("找不到 dist/，请先执行 npm run build");
  process.exit(1);
}

// 清理上一次的产物（只删自己生成的，不碰源码）
rmSync(join(root, "assets"), { recursive: true, force: true });
rmSync(join(root, "index.html"), { force: true });

cpSync(join(dist, "index.html"), join(root, "index.html"));
if (existsSync(join(dist, "assets"))) {
  cpSync(join(dist, "assets"), join(root, "assets"), { recursive: true });
}
// GitHub Pages 用 Jekyll 时会忽略下划线开头的目录，加这个文件关掉
writeFileSync(join(root, ".nojekyll"), "");

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const full = join(dir, entry.name);
    return sum + (entry.isDirectory() ? walk(full) : statSync(full).size);
  }, 0);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log("已发布到仓库根目录：");
console.log(`  index.html  ${kb(statSync(join(root, "index.html")).size)}`);
if (existsSync(join(root, "assets"))) {
  mkdirSync(join(root, "assets"), { recursive: true });
  for (const file of readdirSync(join(root, "assets"))) {
    console.log(`  assets/${file}  ${kb(statSync(join(root, "assets", file)).size)}`);
  }
  console.log(`  合计  ${kb(walk(join(root, "assets")))}`);
}
