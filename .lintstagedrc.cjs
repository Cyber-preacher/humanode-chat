/** lint-staged: run ESLint/Prettier for apps/web only, Windows-safe */
const quote = (p) => `"${p.replace(/\\/g, "/")}"`;
const toWebRel = (p) => p.replace(/^apps[\\/]+web[\\/]+/i, "").replace(/\\/g, "/");

module.exports = {
  "apps/web/**/*.{js,jsx,ts,tsx}": (files) => {
    const rel = files
      .filter((f) => /^apps[\\/]+web[\\/]+/i.test(f))
      .map(toWebRel);
    if (!rel.length) return [];
    const list = rel.map(quote).join(" ");
    return [`pnpm.cmd -C apps/web run lint --fix --max-warnings=0 -- ${list}`];
  },
  "apps/web/**/*.{json,md,yml,yaml,css}": (files) => {
    if (!files.length) return [];
    const list = files.map(quote).join(" ");
    return [`pnpm.cmd -w exec prettier --write ${list}`];
  },
};