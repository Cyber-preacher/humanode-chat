/** Lint-staged config scoped to apps/web (Windows-safe) */
module.exports = {
  'apps/web/**/*.{js,jsx,ts,tsx}': (files) => {
    const quoted = files.map((f) => `"${f.replace(/\\/g, '/')}"`).join(' ');
    return [`pnpm.cmd --dir apps/web exec eslint --fix --max-warnings=0 ${quoted}`];
  },
  'apps/web/**/*.{json,md,yml,yaml,css}': (files) => {
    const quoted = files.map((f) => `"${f.replace(/\\/g, '/')}"`).join(' ');
    return [`pnpm.cmd -w exec prettier --write ${quoted}`];
  },
};
