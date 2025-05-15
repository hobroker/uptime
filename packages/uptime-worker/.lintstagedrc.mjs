import base from "../../.lintstagedrc.mjs";

const config = {
  ...base,
  "*.{js,jsx,ts,tsx,mjs,json}": ["eslint --fix"],
};

export default config;
