import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.join(projectRoot, "app");
const releaseRoot = path.join(projectRoot, "release");
const outputRoot = path.join(releaseRoot, "esportsmonk-online");

async function ensure(pathLike) {
  await stat(pathLike);
}

async function main() {
  await ensure(path.join(appRoot, "index.html"));
  await ensure(path.join(appRoot, "data", "site-data.json"));
  await ensure(path.join(appRoot, "data", "site-data.inline.js"));

  await mkdir(releaseRoot, { recursive: true });
  await rm(outputRoot, { recursive: true, force: true });
  await cp(appRoot, outputRoot, { recursive: true, force: true });

  console.log(
    JSON.stringify(
      {
        ok: true,
        output: outputRoot,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
