import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { sha256 } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/provenance";
import { evidenceFrameNumbers } from "./gallery-matrix";

const runs = resolve(process.argv[2] ?? ""), output = resolve(process.argv[3] ?? ""), blender = resolve(process.argv[4] ?? "");
if (!process.argv[4]) throw new Error("Usage: bun tools/prepare-gallery-reviews.ts <runs> <fresh-output> <blender>");
if (existsSync(output) && !process.argv.includes("--resume")) throw new Error("Review evidence directory already exists; use --resume after inspecting interrupted work");
await mkdir(output, { recursive: true });
const manifest = await Bun.file(join(runs, "campaign.json")).json(), done = new Set<string>();
const stagingNames = new Set(["Studio ground", "Studio floor", "Studio | ground", "Studio | desk plane", "Studio | compact curved backdrop", "Preview floor"]);
while (done.size < manifest.cells.length) {
  for (const cell of manifest.cells) {
    const id = `${cell.task}--${cell.model}--${cell.condition}`, source = join(runs, id, "summary.json");
    if (done.has(id) || !existsSync(source)) continue;
    const summary = await Bun.file(source).json(), result = summary.results[0], native = join(result.workdir, "asset.blend");
    if (!existsSync(native) || !result.evidenceContactSheet) throw new Error(`Missing deliverable: ${id}`);
    const metrics = await Bun.file(join(result.workdir, "metrics-blend.json")).json();
    const overridesPath = join(dirname(runs), "staging-overrides.json"), overrides = existsSync(overridesPath) ? await Bun.file(overridesPath).json() : {};
    const hidden = [...new Set([...metrics.objects.filter((o: any) => o.type === "MESH" && stagingNames.has(o.name)).map((o: any) => o.name), ...(overrides[id] ?? [])])] as string[];
    if (hidden.some(name => name.includes(",") || !metrics.objects.some((o: any) => o.type === "MESH" && o.name === name))) throw new Error("Invalid staging exclusion");
    const original = await Bun.file(join(dirname(result.evidenceContactSheet), "evidence.json")).json();
    const directory = join(output, id), evidence = join(directory, "evidence"), sourceHash = sha256(await Bun.file(native).bytes());
    if (existsSync(join(directory, "summary.json"))) {
      const previous = await Bun.file(join(directory, "summary.json")).json();
      if (previous.reviewEvidence?.sourceSha256 !== sourceHash || previous.reviewEvidence?.policy !== "neutral-staging-excluded-v1" || JSON.stringify(previous.reviewEvidence?.hiddenStagingObjects) !== JSON.stringify(hidden) || !existsSync(previous.results[0].evidenceContactSheet)) throw new Error(`Completed review evidence differs: ${id}`);
      done.add(id); continue;
    }
    if (existsSync(directory)) throw new Error(`Incomplete review render; inspect and preserve before retrying: ${directory}`);
    await mkdir(directory, { recursive: true }); console.log(`FRAME ${id}: ${hidden.join(", ") || "no exclusions"}`);
    const command = [blender, "--background", "--factory-startup", "--disable-autoexec", "--python-exit-code", "1", "--python", join(manifest.snapshot, "skills/blender-asset-validation/scripts/render_evidence.py"), "--", "--input", native, "--output-dir", evidence, "--resolution", "384", "--views", "perspective,front,back,left,right,top", "--presentation", "neutral", "--frames", evidenceFrameNumbers(original.animation_frames ?? []).join(","), "--hide-objects", hidden.join(",")];
    const child = Bun.spawn(command, { stdout: Bun.file(join(directory, "render.log")), stderr: "pipe", windowsHide: true });
    const timer = setTimeout(() => { Bun.spawn(["taskkill", "/PID", String(child.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore", windowsHide: true }); }, 300_000);
    const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]); clearTimeout(timer);
    if (code !== 0 || sha256(await Bun.file(native).bytes()) !== sourceHash) throw new Error(`Review render failed or source changed: ${id}: ${stderr}`);
    const rendered = await Bun.file(join(evidence, "evidence.json")).json();
    summary.reviewEvidence = { policy: "neutral-staging-excluded-v1", hiddenStagingObjects: hidden, sourceSha256: sourceHash, originalContactSheet: result.evidenceContactSheet, originalAnimationContactSheet: result.animationContactSheet ?? null };
    summary.evidencePresentation = "neutral-staging-excluded-v1";
    result.evidenceContactSheet = rendered.contact_sheet; result.animationContactSheet = rendered.animation_contact_sheet;
    await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
    done.add(id); console.log(`FRAMED ${id}`);
  }
  if (existsSync(join(runs, "campaign-results.json")) && manifest.cells.every((cell: any) => done.has(`${cell.task}--${cell.model}--${cell.condition}`) || !existsSync(join(runs, `${cell.task}--${cell.model}--${cell.condition}/summary.json`)))) break;
  await Bun.sleep(20_000);
}
await writeFile(join(output, "review-ready.json"), JSON.stringify({ completed: [...done], expected: manifest.cells.length }, null, 2));
