import { evaluateGameScene } from "./scene-evidence.ts";
import { buildClaudeArgs, summarizeClaudeEvents } from "./claude-agent.ts";
import { sha256 } from "./provenance.ts";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJsonFile,
  resolveBlenderExecutable,
  runBlender,
} from "../../../scripts/blender-process.ts";
import { scoreSubmission, SCORER_VERSION, type VideoEvidence } from "./score.ts";
import { BENCHMARK_TASKS, type BenchmarkTask } from "./tasks.ts";
import { summarizeAgentEvents } from "./trace.ts";
import { resolveModelOptions } from "./model-options.ts";
import { isolatedAgentArgs, pinnedMcpArgs, preflightPinnedMcp, sourceFingerprint } from "./pinned-mcp.ts";
import { evaluatorFingerprint, readReferenceInput, taskFingerprint } from "./provenance.ts";

type Mode = "baseline" | "skills" | "skills_mcp";
type Suite = BenchmarkTask["suites"][number];

type Options = {
  agentCli: "codex" | "claude-code";
  guidanceFile?: string;
  suite: Suite;
  mode: Mode;
  output: string;
  model?: string;
  modelProfile: string | null;
  reasoning: string;
  repetitions: number;
  timeoutMinutes: number;
  blenderPath: string;
  taskIds: string[];
  bypassApprovals: boolean;
  conditionLabel: string;
  skillRoot?: string;
  referenceDir?: string;
};

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseOptions(): Options {
  const suite = (argument("--suite") ?? "smoke") as Suite;
  const modeInput = argument("--mode") ?? "baseline";
  const mode = (modeInput === "plugin" ? "skills" : modeInput) as Mode;
  const output = argument("--output");
  if (!["smoke", "quick", "full", "challenge", "gauntlet", "quality", "reference", "spatial", "whole_scene", "scenes", "game_characters"].includes(suite)) {
    throw new Error(`Unsupported suite: ${suite}`);
  }
  if (!["baseline", "skills", "skills_mcp"].includes(mode)) {
    throw new Error(`Unsupported mode: ${mode}`);
  }
  if (!output) {
    throw new Error("--output is required");
  }
  const modelOptions = resolveModelOptions({
    profile: argument("--profile"),
    model: argument("--model"),
    reasoning: argument("--reasoning"),
  });
  const agentCli = argument("--agent") ?? "codex";
  if (!["codex", "claude-code"].includes(agentCli)) throw new Error("Unsupported --agent");
  if (agentCli === "claude-code") buildClaudeArgs({ ...modelOptions, mode, bypassApprovals: process.argv.includes("--bypass-approvals") });
  const skillRootArg = argument("--skill-root");
  // Pin even the default plugin condition, rather than loading arbitrary user plugins.
  const skillRoot = mode === "baseline" ? undefined : resolve(skillRootArg ?? join(import.meta.dir, "../../.."));
  if (skillRoot && !existsSync(join(skillRoot, "skills"))) {
    throw new Error(`Skill root has no skills directory: ${skillRoot}`);
  }
  return {
    agentCli: agentCli as Options["agentCli"],
    guidanceFile: argument("--guidance-file") ? resolve(argument("--guidance-file")!) : undefined,
    suite,
    mode,
    output: resolve(output),
    ...modelOptions,
    repetitions: Math.max(1, Number(argument("--repetitions") ?? 1)),
    timeoutMinutes: Math.max(1, Number(argument("--timeout-minutes") ?? 45)),
    blenderPath: resolveBlenderExecutable(argument("--blender")),
    taskIds: (argument("--tasks") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    bypassApprovals: process.argv.includes("--bypass-approvals"),
    conditionLabel: argument("--condition-label") ?? mode,
    skillRoot,
    referenceDir: argument("--reference-dir") ? resolve(argument("--reference-dir")!) : undefined,
  };
}

export function pluginPrefix(
  mode: Mode,
  task: BenchmarkTask,
  skillRoot?: string,
): string {
  if (mode === "baseline") {
    return "";
  }
  const skillNames = ["blender-modeling-workflow", "blender-asset-validation"];
  if (task.rubric.requireAnimation) {
    skillNames.push("blender-animation-workflow");
  }
  if (task.requiredVideo) {
    skillNames.push("blender-rendering-workflow");
  }
  if (task.requireIterationReview) {
    skillNames.push("blender-iterative-refinement");
  }
  if (task.category === "environment_creation") {
    skillNames.push("blender-rendering-workflow");
  }
  if (task.category === "procedural_creation") {
    skillNames.push("blender-procedural-workflow");
  }
  if (task.category === "character_creation") {
    skillNames.push("blender-character-workflow");
  }
  if (task.category === "simulation_creation") {
    skillNames.push("blender-simulation-workflow");
  }
  if (task.category === "integrated_gauntlet") {
    skillNames.push(
      "blender-procedural-workflow",
      "blender-character-workflow",
      "blender-simulation-workflow",
      "blender-rendering-workflow",
      "blender-iterative-refinement",
    );
  }
  if (mode === "skills_mcp") {
    skillNames.push("blender-mcp-integration");
  }
  if (skillRoot) {
    const paths = skillNames.map((name) =>
      join(skillRoot, "skills", name, "SKILL.md"),
    );
    return `Read and follow the complete workflows and completion gates in these exact skill files:\n${paths.map((path) => `- ${path}`).join("\n")}\n\n`;
  }
  const invocations = skillNames.map(
    (name) => `$blender-agent-studio:${name}`,
  );
  return `Use ${invocations.join(", ")} for this task. Follow their complete workflows and completion gates.\n\n`;
}

type CodexRunOptions = {
  agentCli?: "codex" | "claude-code";
  cwd: string;
  prompt: string;
  mode: Mode;
  model?: string;
  reasoning: string;
  timeoutMs: number;
  bypassApprovals: boolean;
  skillRootPinned: boolean;
  skillRoot?: string;
};

export function buildCodexArgs(options: CodexRunOptions): string[] {
  const args = [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--json",
    "--color",
    "never",
    "-C",
    options.cwd,
    "-c",
    `model_reasoning_effort="${options.reasoning}"`,
  ];
  if (options.bypassApprovals) {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else {
    args.push("--sandbox", "danger-full-access");
  }
  args.push(...isolatedAgentArgs());
  if (options.mode === "skills_mcp") {
    if (!options.skillRoot) throw new Error("MCP benchmarks require a pinned skillRoot");
    args.push(...pinnedMcpArgs(options.skillRoot));
  }
  if (options.model) {
    args.push("--model", options.model);
  }
  args.push("-");
  return args;
}

async function runCodex(options: CodexRunOptions): Promise<{
  command: string[];
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
}> {
  const executable = options.agentCli === "claude-code" ? "claude" : "codex";
  const args = executable === "claude" ? buildClaudeArgs(options) : buildCodexArgs(options);
  const started = performance.now();
  const eventsPath = join(options.cwd, "agent-events.jsonl");
  const stderrPath = join(options.cwd, "agent-stderr.log");
  await Promise.all([writeFile(eventsPath,"",{flag:"wx"}),writeFile(stderrPath,"",{flag:"wx"})]);
  const proc = Bun.spawn([executable, ...args], {
    cwd: options.cwd,
    stdin: "pipe",
    stdout: Bun.file(eventsPath),
    stderr: Bun.file(stderrPath),
    windowsHide: true,
  });
  proc.stdin.write(options.prompt);
  proc.stdin.end();
  await writeFile(join(options.cwd, "agent-running.json"), JSON.stringify({
    pid: proc.pid, startedAt: new Date().toISOString(), timeoutMs: options.timeoutMs,
    command: [executable, ...(executable === "codex" ? args.slice(0, -1) : args), "<prompt-via-stdin>"],
  }, null, 2));

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform === "win32") {
      Bun.spawn(["taskkill", "/PID", String(proc.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore", windowsHide: true });
    } else proc.kill();
  }, options.timeoutMs);
  const exitCode = await proc.exited;
  clearTimeout(timer);
  const [stdout, stderr] = await Promise.all([readFile(eventsPath, "utf8"), readFile(stderrPath, "utf8")]);
  return {
    command: [executable, ...(executable === "codex" ? args.slice(0, -1) : args), "<prompt-via-stdin>"],
    exitCode,
    timedOut,
    durationMs: Math.round(performance.now() - started),
    stdout,
    stderr,
  };
}

async function inspectAsset(
  assetPath: string,
  metricsPath: string,
  blenderPath: string,
): Promise<unknown | null> {
  if (!existsSync(assetPath)) {
    return null;
  }
  const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await runBlender({
    blenderPath,
    scriptPath: join(
      scriptRoot,
      "blender-asset-validation",
      "scripts",
      "inspect_asset.py",
    ),
    scriptArgs: ["--input", assetPath, "--output", metricsPath],
    cwd: dirname(assetPath),
    timeoutMs: 300_000,
  });
  await writeFile(
    `${metricsPath}.process.json`,
    JSON.stringify(result, null, 2),
    "utf8",
  );
  return result.exitCode === 0 && existsSync(metricsPath)
    ? await readJsonFile(metricsPath)
    : null;
}

async function renderEvidence(options: {
  assetPath: string;
  outputDir: string;
  frames: number[];
  spatial?: boolean;
  blenderPath: string;
}): Promise<void> {
  if (!existsSync(options.assetPath)) {
    return;
  }
  const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const scriptArgs = [
    "--input",
    options.assetPath,
    "--output-dir",
    options.outputDir,
    "--resolution",
    "384",
    "--presentation",
    "neutral",
  ];
  if (options.spatial) scriptArgs.push("--views", "perspective,front,back,left,right,top,bottom");
  if (options.frames.length) {
    scriptArgs.push("--frames", options.frames.join(","));
  }
  const result = await runBlender({
    blenderPath: options.blenderPath,
    scriptPath: join(
      scriptRoot,
      "blender-asset-validation",
      "scripts",
      "render_evidence.py",
    ),
    scriptArgs,
    cwd: dirname(options.assetPath),
    timeoutMs: 600_000,
  });
  await writeFile(
    join(options.outputDir, "render-process.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );
}

export async function renderAuthoredEvidence(options: {
  assetPath: string; outputDir: string; cameras: string[]; blenderPath: string; preview?: boolean;
}): Promise<{passed: boolean; missingDependencies: unknown[]}> {
  if (!existsSync(options.assetPath)) return {passed: false, missingDependencies: []};
  const process = await runBlender({blenderPath: options.blenderPath,
    scriptPath: resolve(import.meta.dir, "../../blender-rendering-workflow/scripts/render_authored_evidence.py"),
    scriptArgs: ["--input", options.assetPath, "--output-dir", options.outputDir,
      "--max-edge", options.preview ? "128" : "512", "--samples", options.preview ? "1" : "16", "--time-limit", "30",
      ...options.cameras.flatMap(camera => [`--camera=${camera}`])], timeoutMs: 300000});
  await mkdir(options.outputDir, {recursive:true});
  await writeFile(join(options.outputDir, "render-process.json"), JSON.stringify(process, null, 2));
  if (process.exitCode !== 0 || process.timedOut) return {passed:false, missingDependencies:[]};
  const report = await readJsonFile(join(options.outputDir, "render-manifest.json")) as any;
  const missingDependencies = report.preflight?.missingDependencies ?? [];
  return {passed: report.status === 'complete' && report.renders?.length === options.cameras.length &&
    report.renders.every((render:any) => existsSync(render.path)) && missingDependencies.length === 0, missingDependencies};
}

export async function inspectMotion(assetPath: string, output: string, task: BenchmarkTask, blenderPath: string) {
  if (!task.motionRequirement || !existsSync(assetPath)) return null;
  const requirement = task.motionRequirement;
  const process = await runBlender({blenderPath,
    scriptPath: resolve(import.meta.dir, "../../blender-asset-validation/scripts/inspect_motion.py"),
    scriptArgs: ["--input", assetPath, "--output", output, "--frames", requirement.frames.join(","),
      "--targets", ...requirement.targets.map(t => t.object)], timeoutMs: 300_000});
  await writeFile(`${output}.process.json`, JSON.stringify(process, null, 2));
  return process.exitCode === 0 && !process.timedOut && existsSync(output) ? readJsonFile(output) : null;
}

function parseRate(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const [numeratorText, denominatorText = "1"] = value.split("/");
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null;
  }
  return numerator / denominator;
}

async function probeVideo(videoPath: string): Promise<VideoEvidence> {
  if (!existsSync(videoPath)) {
    return {
      exists: false,
      durationSeconds: null,
      frameRate: null,
      frameCount: null,
      probeError: null,
    };
  }
  const executable = process.env.FFPROBE_EXECUTABLE ?? "ffprobe";
  try {
    const proc = Bun.spawn(
      [
        executable,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-count_frames",
        "-show_entries",
        "format=duration:stream=avg_frame_rate,nb_frames,nb_read_frames",
        "-of",
        "json",
        videoPath,
      ],
      { stdout: "pipe", stderr: "pipe", windowsHide: true },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) {
      return {
        exists: true,
        durationSeconds: null,
        frameRate: null,
        frameCount: null,
        probeError: `ffprobe exit ${exitCode}: ${stderr.trim()}`,
      };
    }
    const payload = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: Array<{
        avg_frame_rate?: string;
        nb_frames?: string;
        nb_read_frames?: string;
      }>;
    };
    const stream = payload.streams?.[0];
    const durationSeconds = Number(payload.format?.duration);
    const frameCount = Number(stream?.nb_frames ?? stream?.nb_read_frames);
    return {
      exists: true,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      frameRate: parseRate(stream?.avg_frame_rate),
      frameCount: Number.isFinite(frameCount) ? frameCount : null,
      probeError: null,
    };
  } catch (error) {
    return {
      exists: true,
      durationSeconds: null,
      frameRate: null,
      frameCount: null,
      probeError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createReproductionDirectory(workdir: string): Promise<string> {
  // Agent-authored reproduction folders and prior evaluator output must remain untouched.
  return mkdtemp(join(workdir, "evaluator-reproduction-"));
}

async function verifyReproduction(options: {
  sourcePath: string;
  workdir: string;
  blenderPath: string;
  referencePaths?: string[];
  task?: BenchmarkTask;
}): Promise<{
  passed: boolean;
  directory: string | null;
  process: unknown | null;
  blendMetrics: unknown | null;
  glbMetrics: unknown | null;
}> {
  if (!existsSync(options.sourcePath)) {
    return {
      passed: false,
      directory: null,
      process: null,
      blendMetrics: null,
      glbMetrics: null,
    };
  }
  const reproductionDir = await createReproductionDirectory(options.workdir);
  const copiedSource = join(reproductionDir, "create_asset.py");
  await copyFile(options.sourcePath, copiedSource);
  for(const path of options.referencePaths ?? []) await copyFile(path,join(reproductionDir,basename(path)));
  const process = await runBlender({
    blenderPath: options.blenderPath,
    scriptPath: copiedSource,
    cwd: reproductionDir,
    timeoutMs: 600_000,
  });
  await writeFile(
    join(reproductionDir, "generation-process.json"),
    JSON.stringify(process, null, 2),
    "utf8",
  );
  const blendPath = join(reproductionDir, "asset.blend");
  const glbPath = join(reproductionDir, "asset.glb");
  const blendMetrics = await inspectAsset(
    blendPath,
    join(reproductionDir, "metrics-blend.json"),
    options.blenderPath,
  );
  const glbMetrics = options.task?.renderOnly ? null : await inspectAsset(
    glbPath,
    join(reproductionDir, "metrics-glb.json"),
    options.blenderPath,
  );
  const sceneEvidence = options.task?.authoredCameras
    ? await renderAuthoredEvidence({assetPath:blendPath, outputDir:join(reproductionDir,'authored-evidence'),
      cameras:options.task.authoredCameras, blenderPath:options.blenderPath, preview:true}) : null;
  return {
    passed:
      process.exitCode === 0 &&
      Boolean((blendMetrics as { hard_gate_pass?: boolean } | null)?.hard_gate_pass) &&
      (options.task?.renderOnly || Boolean((glbMetrics as { hard_gate_pass?: boolean } | null)?.hard_gate_pass)) &&
      (!options.task?.authoredCameras || Boolean(sceneEvidence?.passed)),
    directory: reproductionDir,
    process,
    blendMetrics,
    glbMetrics,
  };
}

async function main(): Promise<void> {
  const options = parseOptions();
  if (existsSync(options.output)) {
    throw new Error(
      `Output directory already exists; choose a new path to preserve benchmark evidence: ${options.output}`,
    );
  }
  await mkdir(options.output, { recursive: true });

  const selected = BENCHMARK_TASKS.filter(
    (task) =>
      task.suites.includes(options.suite) &&
      (!options.taskIds.length || options.taskIds.includes(task.id)),
  );
  if (!selected.length) {
    throw new Error("No benchmark tasks matched the requested suite/task filter");
  }

  const referenceHashes:Record<string,Record<string,string>>={};
  const referenceImages:Record<string,string[]>={};
  for(const task of selected) {
    if(!task.referenceFiles?.length) continue;
    if(!options.referenceDir) throw new Error("Reference suite requires --reference-dir with front/side PNGs of the same prop");
    referenceHashes[task.id]={};referenceImages[task.id]=[];
    const inputDir=join(options.output,"inputs",task.id);
    await mkdir(inputDir,{recursive:true});
    for(const filename of task.referenceFiles) {
      const input=await readReferenceInput(join(options.referenceDir,filename));
      const path=join(inputDir,filename);
      await writeFile(path,input.data,{flag:"wx"});
      referenceHashes[task.id][filename]=input.hash;
      referenceImages[task.id].push(path);
    }
  }
  const blenderVersionProc=Bun.spawn([options.blenderPath,"--version"],{stdout:"pipe",stderr:"pipe",windowsHide:true});
  const versionTimer=setTimeout(()=>blenderVersionProc.kill(),30_000);
  const [blenderBuild,blenderVersionError,blenderVersionExit]=await Promise.all([
    new Response(blenderVersionProc.stdout).text(),new Response(blenderVersionProc.stderr).text(),blenderVersionProc.exited]);
  clearTimeout(versionTimer);
  if(blenderVersionExit !== 0 || !blenderBuild.trim()) throw new Error(`Cannot fingerprint Blender: ${blenderVersionError}`);

  const guidance = options.guidanceFile ? await readFile(options.guidanceFile, "utf8") : "";
  const versionProc = Bun.spawn([options.agentCli === "claude-code" ? "claude" : "codex", "--version"], {
    stdout: "pipe",
    stderr: "pipe",
    windowsHide: true,
  });
  const [codexVersion, codexVersionError] = await Promise.all([
    new Response(versionProc.stdout).text(),
    new Response(versionProc.stderr).text(),
    versionProc.exited,
  ]);
  const runManifest = {
    schemaVersion: 3,
    agentCli: options.agentCli,
    guidanceFile: options.guidanceFile ?? null,
    guidanceHash: guidance ? sha256(guidance) : null,
    guidance,
    scorerVersion: SCORER_VERSION,
    motionEvidenceVersion: 1,
    inspectorSchemaVersion: 3,
    evidenceSettingsVersion: 2,
    evidencePresentation: selected.some(task=>task.authoredCameras) ? "authored_per_task" : "neutral",
    startedAt: new Date().toISOString(),
    mode: options.conditionLabel,
    executionMode: options.mode,
    suite: options.suite,
    repetitions: options.repetitions,
    model: options.model ?? "configured default",
    modelProfile: options.modelProfile,
    reasoning: options.reasoning,
    blenderPath: options.blenderPath,
    blenderBuild: blenderBuild.trim(),
    timeoutMinutes: options.timeoutMinutes,
    evaluatorFingerprint: await evaluatorFingerprint(),
    taskFingerprints: Object.fromEntries(selected.map(task=>[task.id,taskFingerprint(task)])),
    referenceHashes,
    agentVersion: codexVersion.trim(),
    codexVersion: options.agentCli === "codex" ? codexVersion.trim() : null,
    codexVersionError: codexVersionError.trim(),
    taskIds: selected.map((task) => task.id),
    taskCategories: [...new Set(selected.map((task) => task.category))].sort(),
    capabilityCoverage: [
      ...new Set(selected.flatMap((task) => task.capabilities)),
    ].sort(),
    finishProfiles: [
      ...new Set(selected.map((task) => task.rubric.finishProfile)),
    ].sort(),
    bypassApprovals: options.bypassApprovals,
    skillRoot: options.skillRoot ?? null,
    isolationArgs: options.agentCli === "codex" ? isolatedAgentArgs() : buildClaudeArgs(options),
    skillFingerprint: options.skillRoot ? sourceFingerprint(options.skillRoot) : null,
    mcpPreflight: options.mode === "skills_mcp" ? await preflightPinnedMcp(options.skillRoot!) : null,
  };
  await writeFile(
    join(options.output, "run-manifest.json"),
    JSON.stringify(runManifest, null, 2),
    "utf8",
  );

  const results: unknown[] = [];
  for (const task of selected) {
    for (let repetition = 1; repetition <= options.repetitions; repetition += 1) {
      const workdir = join(
        options.output,
        `${task.id}-r${String(repetition).padStart(2, "0")}`,
      );
      await mkdir(workdir, { recursive: true });
      for(const path of referenceImages[task.id] ?? []) {
        await copyFile(path,join(workdir,basename(path)));
      }
      const taskPrompt = task.prompt.replaceAll(
        "{{BLENDER_EXECUTABLE}}",
        options.blenderPath,
      );
      await writeFile(join(workdir, "TASK.md"), taskPrompt, "utf8");
      const prompt =
        pluginPrefix(options.mode, task, options.skillRoot) +
        (guidance ? `Additional experimental workflow guidance:\n${guidance}\n\n` : "") +
        `Generation wall-clock budget: ${options.timeoutMinutes} minutes. Reserve time to save and export the finished asset.\n` +
        "Open TASK.md in the current directory and complete the Blender asset request it contains.";
      await writeFile(join(workdir, "agent-prompt.txt"), prompt, "utf8");

      const agent = await runCodex({
        agentCli: options.agentCli,
        cwd: workdir,
        prompt,
        mode: options.mode,
        model: options.model,
        reasoning: options.reasoning,
        timeoutMs: options.timeoutMinutes * 60_000,
        bypassApprovals: options.bypassApprovals,
        skillRootPinned: Boolean(options.skillRoot),
        skillRoot: options.skillRoot,
      });
      await writeFile(
        join(workdir, "agent-process.json"),
        JSON.stringify(
          {
            command: agent.command,
            exitCode: agent.exitCode,
            timedOut: agent.timedOut,
            durationMs: agent.durationMs,
            stderr: agent.stderr,
          },
          null,
          2,
        ),
        "utf8",
      );
      await writeFile(join(workdir, "agent-events.jsonl"), agent.stdout, "utf8");
      const agentTrace = options.agentCli === "claude-code" ? summarizeClaudeEvents(agent.stdout) : summarizeAgentEvents(agent.stdout);

      const sourcePath = join(workdir, "create_asset.py");
      const blendPath = join(workdir, "asset.blend");
      const glbPath = join(workdir, "asset.glb");
      const videoPath = task.requiredVideo
        ? join(workdir, task.requiredVideo.filename)
        : null;
      const videoEvidence = videoPath ? await probeVideo(videoPath) : null;
      if (task.requiredVideo) {
        await writeFile(
          join(workdir, "video-probe.json"),
          JSON.stringify(videoEvidence, null, 2),
          "utf8",
        );
      }
      const blendMetricsPath = join(workdir, "metrics-blend.json");
      const glbMetricsPath = join(workdir, "metrics-glb.json");
      const blendMetrics = await inspectAsset(
        blendPath,
        blendMetricsPath,
        options.blenderPath,
      );
      const glbMetrics = task.renderOnly ? null : await inspectAsset(
        glbPath,
        glbMetricsPath,
        options.blenderPath,
      );
      const authoredRenderEvidence = task.authoredCameras ? await renderAuthoredEvidence({
        assetPath: blendPath, outputDir: join(workdir,"evidence"), cameras:task.authoredCameras,
        blenderPath:options.blenderPath,
      }) : null;
      if (!task.authoredCameras) await renderEvidence({
        assetPath: blendPath,
        outputDir: join(workdir, "evidence"),
        frames: task.animationFrames,
        spatial: task.suites.includes("spatial"),
        blenderPath: options.blenderPath,
      });
      const reproduction = await verifyReproduction({
        sourcePath,
        workdir,
        blenderPath: options.blenderPath,
        referencePaths: referenceImages[task.id],
        task,
      });

      const motionEvidence = await inspectMotion(blendPath, join(workdir, "motion-blend.json"), task, options.blenderPath);
      const exportedMotionEvidence = task.motionRequirement?.inspectExport
        ? await inspectMotion(glbPath, join(workdir, "motion-glb.json"), task, options.blenderPath) : null;

      const gameSceneEvidence = task.wholeScene ? await evaluateGameScene(workdir, options.blenderPath, { reproductionDirectory: reproduction.directory }) : null;
      const sceneManifestReproduced = !task.wholeScene || Boolean(reproduction.directory && existsSync(join(reproduction.directory, "scene_manifest.json")));
      const score = scoreSubmission({
        task,
        agentExitCode: agent.exitCode,
        sourceExists: existsSync(sourcePath),
        reproductionPass: reproduction.passed && sceneManifestReproduced,
        blendExists: existsSync(blendPath),
        glbExists: existsSync(glbPath),
        iterationReviewExists: existsSync(join(workdir, "iteration_review.json")),
        videoEvidence,
        motionEvidence,
        exportedMotionEvidence,
        gameSceneEvidence,
        authoredRenderEvidence,
        blendMetrics: blendMetrics as never,
        glbMetrics: glbMetrics as never,
      });
      const result = {
        authoredRenderEvidence,
        gameSceneEvidence,
        artifactHashes: Object.fromEntries(await Promise.all([sourcePath, blendPath, glbPath, ...(task.wholeScene ? [join(workdir, "scene_manifest.json")] : [])].filter(existsSync).map(async path => [basename(path), sha256(await readFile(path))]))),
        taskId: task.id,
        taskTitle: task.title,
        referenceImages: referenceImages[task.id] ?? [],
        repetition,
        mode: options.mode,
        workdir,
        agent: {
          exitCode: agent.exitCode,
          timedOut: agent.timedOut,
          durationMs: agent.durationMs,
          trace: agentTrace,
        },
        score,
        reproductionDirectory: reproduction.directory,
        evidenceContactSheet: existsSync(
          join(workdir, "evidence", "contact_sheet.png"),
        )
          ? join(workdir, "evidence", "contact_sheet.png")
          : null,
        animationContactSheet: existsSync(
          join(workdir, "evidence", "animation_contact_sheet.png"),
        )
          ? join(workdir, "evidence", "animation_contact_sheet.png")
          : null,
        renderedVideo: videoPath && existsSync(videoPath) ? videoPath : null,
        videoEvidence,
        motionEvidence,
        exportedMotionEvidence,
      };
      await writeFile(
        join(workdir, "result.json"),
        JSON.stringify(result, null, 2),
        "utf8",
      );
      results.push(result);
      process.stdout.write(
        `${options.conditionLabel} ${task.id} r${repetition}: ${score.score}/100 (hard gate ${score.hardGatePass ? "pass" : "fail"})\n`,
      );
    }
  }

  const numericResults = results as Array<{
    score: { score: number; hardGatePass: boolean };
    agent: {
      durationMs: number;
      trace: ReturnType<typeof summarizeAgentEvents>;
    };
  }>;
  const summary = {
    ...runManifest,
    completedAt: new Date().toISOString(),
    resultCount: numericResults.length,
    hardGatePasses: numericResults.filter((item) => item.score.hardGatePass)
      .length,
    meanAutomatedScore: Number(
      (
        numericResults.reduce((sum, item) => sum + item.score.score, 0) /
        numericResults.length
      ).toFixed(2),
    ),
    execution: {
      totalDurationMs: numericResults.reduce(
        (sum, item) => sum + item.agent.durationMs,
        0,
      ),
      totalToolCalls: numericResults.reduce(
        (sum, item) => sum + item.agent.trace.toolCalls,
        0,
      ),
      totalToolFailures: numericResults.reduce(
        (sum, item) => sum + item.agent.trace.toolFailures,
        0,
      ),
      totalErrors: numericResults.reduce(
        (sum, item) => sum + item.agent.trace.errors,
        0,
      ),
      totalInputTokens: numericResults.reduce(
        (sum, item) => sum + item.agent.trace.usage.inputTokens,
        0,
      ),
      totalOutputTokens: numericResults.reduce(
        (sum, item) => sum + item.agent.trace.usage.outputTokens,
        0,
      ),
      totalTokens: numericResults.reduce(
        (sum, item) => sum + item.agent.trace.usage.totalTokens,
        0,
      ),
      tokenCaveat:
        "Total tokens are a usage proxy, not a dollar-cost measurement. Cached and cache-write input tokens are reported per result.",
    },
    warning:
      "The automated score includes structural, finish, and task-category signal proxies, not a complete aesthetic judgment. Use structured, counterbalanced blinded multiview review before making a quality claim.",
    results,
  };
  await writeFile(
    join(options.output, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  process.stdout.write(`Summary: ${join(options.output, "summary.json")}\n`);
}

if (import.meta.main) {
  await main();
}
