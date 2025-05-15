import base from "../../.lintstagedrc.mjs";

const config = {
  ...base,
  "*.{ts,tsx,mjs,json}": ["eslint --fix"],
};

export default config;
