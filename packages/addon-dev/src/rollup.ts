import { default as hbs } from './rollup-hbs-plugin';
import { default as publicEntrypoints } from './rollup-public-entrypoints';
import { default as appReexports } from './rollup-app-reexports';
import { default as clean } from 'rollup-plugin-delete';
import { default as keepAssets } from './rollup-keep-assets';
import { default as dependencies } from './rollup-addon-dependencies';
import type { Plugin } from 'rollup';

export class Addon {
  #srcDir: string;
  #destDir: string;

  constructor(params: { srcDir?: string; destDir?: string } = {}) {
    this.#srcDir = params.srcDir ?? 'src';
    this.#destDir = params.destDir ?? 'dist';
  }

  // Given a list of globs describing modules in your srcDir, this generates
  // corresponding appTree modules that contain reexports, and updates your
  // package.json metadata to list them all.
  appReexports(patterns: string[]): Plugin {
    return appReexports({
      from: this.#srcDir,
      to: this.#destDir,
      include: patterns,
    });
  }

  // This configures rollup to emit public entrypoints for each module in your
  // srcDir that matches one of the given globs. Typical addons will want to
  // match patterns like "components/**/*.js", "index.js", and "test-support.js".
  publicEntrypoints(patterns: string[]) {
    return publicEntrypoints({ srcDir: this.#srcDir, include: patterns });
  }

  // This wraps standalone .hbs files as Javascript files using inline
  // templates. This means special resolving rules for .hbs files aren't
  // required for javascript tooling to understand your package.
  hbs() {
    return hbs();
  }

  // By default rollup does not clear the output directory between builds. This
  // does that.
  clean() {
    return clean({ targets: `${this.#destDir}/*` });
  }

  // V2 Addons are allowed to contain imports of .css files. This tells rollup
  // to leave those imports alone and to make sure the corresponding .css files
  // are kept in the same relative locations in the destDir as they were in the
  // srcDir.
  keepAssets(patterns: string[]) {
    return keepAssets({
      from: this.#srcDir,
      include: patterns,
    });
  }

  // This is the default `output` configuration you should pass to rollup. We're
  // emitting ES modules, in your `destDir`, and their filenames are equal to
  // their bundle names (the bundle names get generated by `publicEntrypoints`
  // above).
  output() {
    return { dir: this.#destDir, format: 'es', entryFileNames: '[name]' };
  }

  dependencies() {
    return dependencies();
  }
}
