import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const css = fs.readFileSync("src/app/globals.css", "utf8");
const postcss = fs.readFileSync("postcss.config.mjs", "utf8");
const dashboard = fs.readFileSync("src/components/dashboard/Dashboard.tsx", "utf8");

const checks = [
  ["tailwindcss installed", Boolean(pkg.devDependencies?.tailwindcss)],
  ["@tailwindcss/postcss installed", Boolean(pkg.devDependencies?.["@tailwindcss/postcss"])],
  ["Tailwind imported in globals.css", css.includes('@import "tailwindcss"')],
  ["Tailwind PostCSS plugin configured", postcss.includes('@tailwindcss/postcss')],
  ["Tailwind utility test present", dashboard.includes('rounded-full border border-white/10')],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
