import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const MOTION_VIEWS = ["perspective", "left", "back"] as const;
export type MotionRenderEvidence = { sheets: Record<string, string>; errors: string[] };

/** Read evaluator-owned renders; incomplete frame/view sets cannot enter judging. */
export async function collectMotionRenders(directory: string, frames: number[]): Promise<MotionRenderEvidence> {
  const result: MotionRenderEvidence = { sheets: {}, errors: [] };
  try {
    const report = JSON.parse(await readFile(join(directory, "evidence.json"), "utf8"));
    for (const view of MOTION_VIEWS) {
      const evidence = report.animation_views?.[view];
      if (!evidence || JSON.stringify(evidence.frames?.map((sample: any) => sample.frame)) !== JSON.stringify(frames) ||
          !evidence.frames.every((sample: any) => typeof sample.path === "string" && existsSync(sample.path)) ||
          typeof evidence.contact_sheet !== "string" || !existsSync(evidence.contact_sheet)) {
        result.errors.push(`Missing or incomplete ${view} motion renders`);
      } else result.sheets[view] = evidence.contact_sheet;
    }
  } catch { result.errors.push("Motion render manifest missing or unreadable"); }
  return result;
}

/** Require symmetric evidence before any judge is invoked, including older runs. */
export function motionRenderErrors(evidence: MotionRenderEvidence | null | undefined): string[] {
  if (!evidence) return ["Motion render evidence missing; rerender this run"];
  return [...evidence.errors, ...MOTION_VIEWS.filter(view => !evidence.sheets[view] || !existsSync(evidence.sheets[view]))
    .map(view => `Motion sheet missing: ${view}`)];
}
