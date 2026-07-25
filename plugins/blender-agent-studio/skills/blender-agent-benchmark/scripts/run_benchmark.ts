import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJsonFile,
  resolveBlenderExecutable,
  runBlender,
} from "../../../scripts/blender-process.ts";
import { scoreSubmission } from "./score.ts";
import { BENCHMARK_TASKS } from "./tasks.ts";

type Mode = "baseline" | "skills" | "skills_mcp";
type Suite = "smoke" | "quick" | "full";

type Options = {
  suite: Suite;
  mode: Mode;
  output: string;
  model?: string;
  reasoning: string;
  repetitions: number;
  timeoutMinutes: number;
  blenderPath: string;
  taskIds: string[];
  bypassApprovals: boolean;
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
  if (!["smoke", "quick", "full"].includes(suite)) {
    throw new Error(`Unsupported suite: ${suite}`);
  }
  if (!["baseline", "skills", "skills_mcp"].includes(mode)) {
    throw new Error(`Unsupported mode: ${mode}`);
  }
  if (!output) {
    throw new Error("--output is required");
  }
  return {
    suite,
    mode,
    output: resolve(output),
    model: argument("--model"),
    reasoning: argument("--reasoning") ?? "medium",
    repetitions: Math.max(1, Number(argument("--repetitions") ?? 1)),
    timeoutMinutes: Math.max(1, Number(argument("--timeout-minutes") ?? 45)),
    blenderPath: resolveBlenderExecutable(argument("--blender")),
    taskIds: (argument("--tasks") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    bypassApprovals: process.argv.includes("--bypass-approvals"),
  };
}

function pluginPrefix(mode: Mode, animated: boolean): string {
  if (mode === "baseline") {
    return "";
  }
  const skills = [
    "$blender-agent-studio:blender-modeling-workflow",
    "$blender-agent-studio:blender-asset-validation",
  ];
  if (animated) {
    skills.push("$blender-agent-studio:blender-animation-workflow");
  }
  if (mode === "skills_mcp") {
    skills.push("$blender-agent-studio:blender-mcp-integration");
  }
  return `Use ${skills.join(", ")} for this task. Follow their complete workflows and completion gates.\n\n`;
}

async function runCodex(options: {
  cwd: string;
  prompt: string;
  mode: Mode;
  model?: string;
  reasoning: string;
  timeoutMs: number;
  bypassApprovals: boolean;
}): Promise<{
  command: string[];
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
}> {
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
  if (options.mode === "baseline") {
    args.push("--ignore-user-config", "--ignore-rules");
  }
  if (options.model) {
    args.push("--model", options.model);
  }
  args.push("-");

  const started = performance.now();
  const proc = Bun.spawn(["codex", ...args], {
    cwd: options.cwd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    windowsHide: true,
  });
  proc.stdin.write(options.prompt);
  proc.stdin.end();

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, options.timeoutMs);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timer);
  return {
    command: ["codex", ...args.slice(0, -1), "<prompt-via-stdin>"],
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
  ];
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

async function verifyReproduction(options: {
  sourcePath: string;
  workdir: string;
  blenderPath: string;
}): Promise<{
  passed: boolean;
  process: unknown | null;
  blendMetrics: unknown | null;
  glbMetrics: unknown | null;
}> {
  if (!existsSync(options.sourcePath)) {
    return {
      passed: false,
      process: null,
      blendMetrics: null,
      glbMetrics: null,
    };
  }
  const reproductionDir = join(options.workdir, "reproduction");
  await mkdir(reproductionDir, { recursive: true });
  const copiedSource = join(reproductionDir, "create_asset.py");
  await copyFile(options.sourcePath, copiedSource);
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
  const glbMetrics = await inspectAsset(
    glbPath,
    join(reproductionDir, "metrics-glb.json"),
    options.blenderPath,
  );
  return {
    passed:
      process.exitCode === 0 &&
      Boolean((blendMetrics as { hard_gate_pass?: boolean } | null)?.hard_gate_pass) &&
      Boolean((glbMetrics as { hard_gate_pass?: boolean } | null)?.hard_gate_pass),
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

  const versionProc = Bun.spawn(["codex", "--version"], {
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
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    mode: options.mode,
    suite: options.suite,
    repetitions: options.repetitions,
    model: options.model ?? "configured default",
    reasoning: options.reasoning,
    blenderPath: options.blenderPath,
    codexVersion: codexVersion.trim(),
    codexVersionError: codexVersionError.trim(),
    taskIds: selected.map((task) => task.id),
    bypassApprovals: options.bypassApprovals,
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
      const taskPrompt = task.prompt.replaceAll(
        "{{BLENDER_EXECUTABLE}}",
        options.blenderPath,
      );
      await writeFile(join(workdir, "TASK.md"), taskPrompt, "utf8");
      const prompt =
        pluginPrefix(options.mode, task.rubric.requireAnimation) +
        "Open TASK.md in the current directory and complete the Blender asset request it contains.";
      await writeFile(join(workdir, "agent-prompt.txt"), prompt, "utf8");

      const agent = await runCodex({
        cwd: workdir,
        prompt,
        mode: options.mode,
        model: options.model,
        reasoning: options.reasoning,
        timeoutMs: options.timeoutMinutes * 60_000,
        bypassApprovals: options.bypassApprovals,
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

      const sourcePath = join(workdir, "create_asset.py");
      const blendPath = join(workdir, "asset.blend");
      const glbPath = join(workdir, "asset.glb");
      const blendMetricsPath = join(workdir, "metrics-blend.json");
      const glbMetricsPath = join(workdir, "metrics-glb.json");
      const blendMetrics = await inspectAsset(
        blendPath,
        blendMetricsPath,
        options.blenderPath,
      );
      const glbMetrics = await inspectAsset(
        glbPath,
        glbMetricsPath,
        options.blenderPath,
      );
      await renderEvidence({
        assetPath: blendPath,
        outputDir: join(workdir, "evidence"),
        frames: task.animationFrames,
        blenderPath: options.blenderPath,
      });
      const reproduction = await verifyReproduction({
        sourcePath,
        workdir,
        blenderPath: options.blenderPath,
      });

      const score = scoreSubmission({
        task,
        agentExitCode: agent.exitCode,
        sourceExists: existsSync(sourcePath),
        reproductionPass: reproduction.passed,
        blendExists: existsSync(blendPath),
        glbExists: existsSync(glbPath),
        blendMetrics: blendMetrics as never,
        glbMetrics: glbMetrics as never,
      });
      const result = {
        taskId: task.id,
        taskTitle: task.title,
        repetition,
        mode: options.mode,
        workdir,
        agent: {
          exitCode: agent.exitCode,
          timedOut: agent.timedOut,
          durationMs: agent.durationMs,
        },
        score,
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
      };
      await writeFile(
        join(workdir, "result.json"),
        JSON.stringify(result, null, 2),
        "utf8",
      );
      results.push(result);
      process.stdout.write(
        `${options.mode} ${task.id} r${repetition}: ${score.score}/100 (hard gate ${score.hardGatePass ? "pass" : "fail"})\n`,
      );
    }
  }

  const numericResults = results as Array<{
    score: { score: number; hardGatePass: boolean };
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
    warning:
      "This is a deterministic structural score, not a complete quality score. Use blinded multiview review before making a quality claim.",
    results,
  };
  await writeFile(
    join(options.output, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  process.stdout.write(`Summary: ${join(options.output, "summary.json")}\n`);
}

await main();
