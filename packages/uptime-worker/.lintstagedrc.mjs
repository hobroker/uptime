const config = {
  "*.{ts,tsx,mjs,json}": ["prettier --write"],
  "*.{js,jsx,ts,tsx,mjs,json}": ["eslint --fix"],
};

export default config;
