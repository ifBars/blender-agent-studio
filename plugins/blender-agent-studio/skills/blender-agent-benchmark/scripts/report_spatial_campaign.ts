import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256 } from "./provenance.ts";

const index = process.argv.indexOf("--campaign");
if (index < 0 || !process.argv[index + 1]) throw new Error("--campaign is required");
const root = resolve(process.argv[index + 1]);
const manifest = JSON.parse(await readFile(join(root, "campaign.json"), "utf8"));
const rows = [];
for (const cell of manifest.cells) {
  const directory = join(root, `${cell.task}--${cell.model}--${cell.condition}`);
  const summaryPath = join(directory, "summary.json");
  if (!existsSync(summaryPath)) { rows.push({ ...cell, status: "missing", directory }); continue; }
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const result = summary.results[0];
  const changedArtifacts = [];
  for (const [filename, hash] of Object.entries(result.artifactHashes ?? {})) {
    const path = join(result.workdir, filename);
    if (!existsSync(path) || sha256(await readFile(path)) !== hash) changedArtifacts.push(filename);
  }
  const observedModels: string[] = result.agent.trace.observedModels ?? [];
  const modelMismatch = observedModels.some(model => model !== cell.model);
  rows.push({ ...cell, directory, status: result.agent.timedOut ? "timeout" : result.agent.exitCode === 0 ? "completed" : "agent_error",
    hardGatePass: result.score.hardGatePass, structuralScore: result.score.score,
    failedChecks: result.score.checks.filter((check: any) => !check.passed).map((check: any) => ({ id: check.id, detail: check.detail })),
    durationSeconds: Math.round(result.agent.durationMs / 1000), toolCalls: result.agent.trace.toolCalls,
    toolFailures: result.agent.trace.toolFailures, usage: result.agent.trace.usage,
    reportedCostUsd: result.agent.trace.reportedCostUsd ?? null, observedModels, modelMismatch,
    spatialReviewExists: existsSync(join(result.workdir, "spatial_review.json")), changedArtifacts,
    evidenceContactSheet: result.evidenceContactSheet, guidanceHash: summary.guidanceHash,
  });
}
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), scope: manifest.scope,
  warning: "Structural scores and agent-authored reviews do not prove assembly or visual quality. Inspect blinded criterion findings separately. Provider token and cost accounting differ.", rows };
await writeFile(join(root, "structural-report.json"), JSON.stringify(report, null, 2));
const markdown = ["# Spatial campaign: structural results", "", manifest.scope, "", report.warning, "",
  "| Task | Model | Condition | Status | Hard gates | Structural proxy /100 | Seconds |",
  "| --- | --- | --- | --- | --- | ---: | ---: |",
  ...rows.map((row: any) => `| ${row.task} | ${row.model} | ${row.condition} | ${row.status} | ${row.hardGatePass === undefined ? "missing" : row.hardGatePass ? "pass" : "fail"} | ${row.structuralScore ?? "—"} | ${row.durationSeconds ?? "—"} |`),
  "", "See structural-report.json for failed checks, artifact integrity, trace usage and evidence paths.", ""];
await writeFile(join(root, "structural-report.md"), markdown.join("\n"));
console.log(`Reported ${rows.length} cells; ${rows.filter((row: any) => row.status === "missing").length} missing.`);
