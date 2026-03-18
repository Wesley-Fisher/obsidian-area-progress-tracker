import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["src/plugin/main.ts"],
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2018",
  outfile: "dist/main.js",
  external: ["obsidian"],
  sourcemap: true,
  logLevel: "info",
};

if (isWatch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("Watching...");
} else {
  await esbuild.build(options);
}
