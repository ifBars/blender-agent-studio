import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { BENCHMARK_TASKS } from "./tasks.ts";

type RunResult = {
  taskId: string;
  taskTitle: string;
  repetition: number;
  mode: string;
  workdir: string;
  score: { hardGatePass: boolean; score: number };
  evidenceContactSheet: string | null;
  animationContactSheet?: string | null;
};

type RunSummary = {
  mode: string;
  model: string;
  reasoning: string;
  execution?: {
    totalDurationMs: number;
    totalToolCalls: number;
    totalToolFailures: number;
    totalErrors: number;
    totalTokens: number;
  };
  results: RunResult[];
};

type JudgeResult = {
  winner: "A" | "B" | "tie";
  confidence: number;
  scores: {
    A: Record<string, number>;
    B: Record<string, number>;
  };
  majorDefects: { A: string[]; B: string[] };
  rationale: string;
};

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function judgePair(options: {
  cwd: string;
  images: string[];
  prompt: string;
  schemaPath: string;
  model: string;
  reasoning: string;
}): Promise<{ result: JudgeResult; stdout: string; stderr: string; exitCode: number }> {
  const outputPath = join(options.cwd, "judge-result.json");
  const args = [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--output-schema",
    options.schemaPath,
    "--output-last-message",
    outputPath,
    "--model",
    options.model,
    "-c",
    `model_reasoning_effort="${options.reasoning}"`,
  ];
  for (const image of options.images) {
    args.push("--image", image);
  }
  args.push("-");
  const proc = Bun.spawn(["codex", ...args], {
    cwd: options.cwd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    windowsHide: true,
  });
  proc.stdin.write(options.prompt);
  proc.stdin.end();
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0 || !existsSync(outputPath)) {
    throw new Error(`Visual judge failed with exit code ${exitCode}: ${stderr}`);
  }
  return {
    result: await readJson<JudgeResult>(outputPath),
    stdout,
    stderr,
    exitCode,
  };
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["winner", "confidence", "scores", "majorDefects", "rationale"],
  properties: {
    winner: { type: "string", enum: ["A", "B", "tie"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["A", "B"],
      properties: {
        A: { $ref: "#/$defs/dimensions" },
        B: { $ref: "#/$defs/dimensions" },
      },
    },
    majorDefects: {
      type: "object",
      additionalProperties: false,
      required: ["A", "B"],
      properties: {
        A: { type: "array", items: { type: "string" } },
        B: { type: "array", items: { type: "string" } },
      },
    },
    rationale: { type: "string" },
  },
  $defs: {
    dimensions: {
      type: "object",
      additionalProperties: false,
      required: [
        "taskFidelity",
        "silhouetteAndProportion",
        "constructionPlausibility",
        "craftsmanshipAndDetail",
        "materialsAndReadability",
        "surfaceFinishAndShading",
        "materialTextureQuality",
        "lightingAndPresentation",
        "finalStageCompleteness",
        "multiviewConsistency",
      ],
      properties: {
        taskFidelity: { type: "number", minimum: 0, maximum: 10 },
        silhouetteAndProportion: { type: "number", minimum: 0, maximum: 10 },
        constructionPlausibility: { type: "number", minimum: 0, maximum: 10 },
        craftsmanshipAndDetail: { type: "number", minimum: 0, maximum: 10 },
        materialsAndReadability: { type: "number", minimum: 0, maximum: 10 },
        surfaceFinishAndShading: { type: "number", minimum: 0, maximum: 10 },
        materialTextureQuality: { type: "number", minimum: 0, maximum: 10 },
        lightingAndPresentation: { type: "number", minimum: 0, maximum: 10 },
        finalStageCompleteness: { type: "number", minimum: 0, maximum: 10 },
        multiviewConsistency: { type: "number", minimum: 0, maximum: 10 },
      },
    },
  },
};

const VISUAL_DIMENSIONS = [
  "taskFidelity",
  "silhouetteAndProportion",
  "constructionPlausibility",
  "craftsmanshipAndDetail",
  "materialsAndReadability",
  "surfaceFinishAndShading",
  "materialTextureQuality",
  "lightingAndPresentation",
  "finalStageCompleteness",
  "multiviewConsistency",
] as const;

async function main(): Promise<void> {
  const baselinePath = argument("--baseline");
  const candidatePath = argument("--candidate");
  const outputArg = argument("--output");
  if (!baselinePath || !candidatePath || !outputArg) {
    throw new Error("--baseline, --candidate, and --output are required");
  }
  const output = resolve(outputArg);
  if (existsSync(output)) {
    throw new Error(`Output already exists: ${output}`);
  }
  await mkdir(output, { recursive: true });
  const schemaPath = join(output, "judge-schema.json");
  await writeFile(schemaPath, JSON.stringify(schema, null, 2), "utf8");

  const baseline = await readJson<RunSummary>(resolve(baselinePath));
  const candidate = await readJson<RunSummary>(resolve(candidatePath));
  const model = argument("--judge-model") ?? "gpt-5.6-terra";
  const reasoning = argument("--judge-reasoning") ?? "medium";
  const judges = Math.max(1, Number(argument("--judges") ?? 3));
  const comparisons: unknown[] = [];

  for (const baselineResult of baseline.results) {
    const candidateResult = candidate.results.find(
      (item) =>
        item.taskId === baselineResult.taskId &&
        item.repetition === baselineResult.repetition,
    );
    if (
      !candidateResult ||
      !baselineResult.evidenceContactSheet ||
      !candidateResult.evidenceContactSheet
    ) {
      continue;
    }
    const pairDir = join(
      output,
      `${baselineResult.taskId}-r${String(baselineResult.repetition).padStart(2, "0")}`,
    );
    await mkdir(pairDir, { recursive: true });
    const task = BENCHMARK_TASKS.find(
      (item) => item.id === baselineResult.taskId,
    );
    if (!task) {
      throw new Error(`Unknown benchmark task: ${baselineResult.taskId}`);
    }
    const baselineAnimation =
      baselineResult.animationContactSheet ??
      join(
        dirname(baselineResult.evidenceContactSheet),
        "animation_contact_sheet.png",
      );
    const candidateAnimation =
      candidateResult.animationContactSheet ??
      join(
        dirname(candidateResult.evidenceContactSheet),
        "animation_contact_sheet.png",
      );
    const hasAnimation =
      existsSync(baselineAnimation) && existsSync(candidateAnimation);
    const firstReverse =
      crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 1;
    const judgeResults: Array<{
      mapping: { A: string; B: string };
      decodedWinner: string;
      scoresByMode: Record<string, Record<string, number>>;
      result: JudgeResult;
    }> = [];
    for (let index = 0; index < judges; index += 1) {
      const judgeDir = join(pairDir, `judge-${String(index + 1).padStart(2, "0")}`);
      await mkdir(judgeDir, { recursive: true });
      const reverse = index % 2 === 0 ? firstReverse : !firstReverse;
      const sourceA = reverse
        ? candidateResult.evidenceContactSheet
        : baselineResult.evidenceContactSheet;
      const sourceB = reverse
        ? baselineResult.evidenceContactSheet
        : candidateResult.evidenceContactSheet;
      const imageA = join(judgeDir, "candidate-a.png");
      const imageB = join(judgeDir, "candidate-b.png");
      await copyFile(sourceA, imageA);
      await copyFile(sourceB, imageB);
      const attachedImages = [imageA, imageB];
      let animationPrompt = "";
      if (hasAnimation) {
        const animationSourceA = reverse
          ? candidateAnimation
          : baselineAnimation;
        const animationSourceB = reverse
          ? baselineAnimation
          : candidateAnimation;
        const animationA = join(judgeDir, "candidate-a-animation.png");
        const animationB = join(judgeDir, "candidate-b-animation.png");
        await copyFile(animationSourceA, animationA);
        await copyFile(animationSourceB, animationB);
        attachedImages.push(animationA, animationB);
        animationPrompt =
          " The third image shows candidate A at the requested critical animation frames; the fourth shows candidate B at those frames. Evaluate mechanical motion, pivots, continuity, and whether the sequence communicates the requested operation.";
      }
      const mapping = reverse
        ? { A: candidate.mode, B: baseline.mode }
        : { A: baseline.mode, B: candidate.mode };
      await writeFile(
        join(judgeDir, "mapping.hidden.json"),
        JSON.stringify(mapping, null, 2),
        "utf8",
      );
      const prompt = `You are a strict blinded 3D asset art director. The first attached contact sheet is candidate A and the second is candidate B. Both show fixed perspective, front, back, left, right, and top views of assets made from the same request.${animationPrompt}

Compare only visible evidence. Do not infer quality from filenames or likely generation method. Penalize floating or mechanically unexplained parts, accidental intersections, weak silhouettes, incoherent proportions, missing requested relationships, generic primitive assembly, visible faceting when smooth finish was requested, unwanted smoothing when low-poly was requested, blockout residue, razor edges, poor texture or material separation, inconsistent detail, broken lighting, broken views, and presentation tricks that hide defects. Reward clear task fidelity, plausible construction, readable primary through tertiary forms, intentional surface refinement, coherent materials and textures, balanced presentation, and consistency across every view. A technically valid model that still looks like a graybox should score poorly on finalStageCompleteness. A tie is valid.

Task: ${baselineResult.taskTitle}
Finish profile: ${task.rubric.finishProfile}
Visible requirements: ${task.visualBrief}

Return the required JSON only. Keep rationale concise and specific.`;
      const judged = await judgePair({
        cwd: judgeDir,
        images: attachedImages,
        prompt,
        schemaPath,
        model,
        reasoning,
      });
      await writeFile(
        join(judgeDir, "judge-process.json"),
        JSON.stringify(
          {
            exitCode: judged.exitCode,
            stdout: judged.stdout,
            stderr: judged.stderr,
          },
          null,
          2,
        ),
        "utf8",
      );
      judgeResults.push({
        mapping,
        decodedWinner:
          judged.result.winner === "tie"
            ? "tie"
            : mapping[judged.result.winner],
        scoresByMode: {
          [mapping.A]: judged.result.scores.A,
          [mapping.B]: judged.result.scores.B,
        },
        result: judged.result,
      });
    }
    const decodedWinners = judgeResults.map((item) => item.decodedWinner);
    comparisons.push({
      taskId: baselineResult.taskId,
      repetition: baselineResult.repetition,
      baselineAutomatedScore: baselineResult.score.score,
      candidateAutomatedScore: candidateResult.score.score,
      hardGates: {
        baseline: baselineResult.score.hardGatePass,
        candidate: candidateResult.score.hardGatePass,
      },
      visualWinnerVotes: decodedWinners,
      judgeResults,
    });
  }

  const typed = comparisons as Array<{
    visualWinnerVotes: string[];
    hardGates: { baseline: boolean; candidate: boolean };
    baselineAutomatedScore: number;
    candidateAutomatedScore: number;
    judgeResults: Array<{
      scoresByMode: Record<string, Record<string, number>>;
    }>;
  }>;
  const allVotes = typed.flatMap((item) => item.visualWinnerVotes);
  const allJudgeResults = typed.flatMap((item) => item.judgeResults);
  const meanDimensions = (mode: string) =>
    Object.fromEntries(
      VISUAL_DIMENSIONS.map((dimension) => {
        const values = allJudgeResults
          .map((item) => item.scoresByMode[mode]?.[dimension])
          .filter((value): value is number => Number.isFinite(value));
        return [
          dimension,
          values.length
            ? Number(
                (
                  values.reduce((sum, value) => sum + value, 0) /
                  values.length
                ).toFixed(3),
              )
            : null,
        ];
      }),
    );
  const summary = {
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    baselineMode: baseline.mode,
    candidateMode: candidate.mode,
    generationModel: baseline.model,
    generationReasoning: baseline.reasoning,
    judgeModel: model,
    judgeReasoning: reasoning,
    judgeCountPerPair: judges,
    positionOrderPolicy:
      "Randomize the first judge's A/B mapping, then alternate the mapping for each later judge.",
    candidateHardGateRegressions: typed.filter(
      (item) => item.hardGates.baseline && !item.hardGates.candidate,
    ).length,
    meanAutomatedDelta: typed.length
      ? Number(
          (
            typed.reduce(
              (sum, item) =>
                sum +
                item.candidateAutomatedScore -
                item.baselineAutomatedScore,
              0,
            ) / typed.length
          ).toFixed(2),
        )
      : null,
    execution: {
      baseline: baseline.execution ?? null,
      candidate: candidate.execution ?? null,
      candidateMinusBaseline:
        baseline.execution && candidate.execution
          ? {
              durationMs:
                candidate.execution.totalDurationMs -
                baseline.execution.totalDurationMs,
              toolCalls:
                candidate.execution.totalToolCalls -
                baseline.execution.totalToolCalls,
              toolFailures:
                candidate.execution.totalToolFailures -
                baseline.execution.totalToolFailures,
              errorItems:
                candidate.execution.totalErrors -
                baseline.execution.totalErrors,
              totalTokens:
                candidate.execution.totalTokens -
                baseline.execution.totalTokens,
            }
          : null,
    },
    visualVotes: {
      baseline: allVotes.filter((vote) => vote === baseline.mode).length,
      candidate: allVotes.filter((vote) => vote === candidate.mode).length,
      tie: allVotes.filter((vote) => vote === "tie").length,
    },
    visualDimensionMeans: {
      baseline: meanDimensions(baseline.mode),
      candidate: meanDimensions(candidate.mode),
    },
    comparisons,
    caveat:
      "Model-based visual judging is blinded and A/B-counterbalanced but is still a proxy. Preserve contact sheets and per-judge records for human review.",
  };
  await writeFile(
    join(output, "comparison-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  process.stdout.write(
    `${baseline.mode} vs ${candidate.mode}: ${JSON.stringify(summary.visualVotes)}\n`,
  );
}

await main();
