import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.join(projectRoot, "app");
const releaseRoot = path.join(projectRoot, "release");
const outputRoot = path.join(releaseRoot, "esportsmonk-online");
const buildRoot = path.join(outputRoot, "__build");
const sapphireKnowledgeSource = path.join(projectRoot, "知识库", "蓝宝石结构化知识库.json");

async function ensure(pathLike) {
  await stat(pathLike);
}

async function main() {
  await ensure(path.join(appRoot, "index.html"));
  await ensure(path.join(appRoot, "data", "site-data.json"));
  await ensure(path.join(appRoot, "data", "site-data.inline.js"));
  await ensure(path.join(appRoot, "node-functions", "api", "site-data.js"));

  await mkdir(releaseRoot, { recursive: true });
  await rm(outputRoot, { recursive: true, force: true });
  await cp(appRoot, outputRoot, { recursive: true, force: true });
  await mkdir(buildRoot, { recursive: true });
  await cp(path.join(projectRoot, "scripts", "build-self-use-data.mjs"), path.join(buildRoot, "build-self-use-data.mjs"), {
    force: true,
  });
  await cp(path.join(projectRoot, "scripts", "build-site-data.mjs"), path.join(buildRoot, "build-site-data.mjs"), {
    force: true,
  });
  await cp(sapphireKnowledgeSource, path.join(outputRoot, "data", "blue-sapphire-knowledge.json"), {
    force: true,
  });

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
