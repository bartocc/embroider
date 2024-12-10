import { defineConfig } from "vite";
import { extensions, ember } from "@embroider/vite";
import { babel } from "@rollup/plugin-babel";

export default defineConfig({
  plugins: [
    ember(),
    // extra plugins here
    babel({
      babelHelpers: "runtime",
      extensions,
    }),
  ],
});
