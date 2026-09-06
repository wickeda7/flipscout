import fs from "node:fs";

const checks = [
  ["postcss.config.mjs", fs.existsSync("postcss.config.mjs")],
  ["globals.css Tailwind import", fs.readFileSync("src/app/globals.css", "utf8").includes('@import "tailwindcss"')],
];

let failed = false;

for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
