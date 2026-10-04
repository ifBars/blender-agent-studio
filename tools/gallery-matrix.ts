export const GALLERY_MODELS = ["gpt-6-astra", "gpt-6.1-sol", "claude-opus-5-5", "claude-sonnet-5-5"];
export const GALLERY_TASKS = ["signal_lantern", "joinery_stool", "task_lamp_clearance_holdout", "tabletop_press", "winch_drawbridge"];
export const SCENE_CHARACTER_GALLERY_TASKS = ["decorated_reading_room", "night_market_courtyard", "coastal_cafe_holdout", "game_ranger_character", "game_scout_deformation", "game_badger_merchant_holdout"];
type Row = { task: string; model: string; repetition?: number };

export function evidenceFrameNumbers(entries: unknown[]): number[] {
  const frames = entries.map(entry => typeof entry === "number" ? entry : (entry as { frame?: unknown } | null)?.frame);
  if (frames.some(frame => !Number.isSafeInteger(frame))) throw new Error("Invalid evidence frame number");
  return frames as number[];
}

export function selectHistoricalRows<T extends Row>(rows: T[]): T[] {
  const selected = rows.filter(p => p.task !== "signal_lantern" || p.model !== "gpt-6-sol" || p.repetition === 3);
  if (selected.filter(p => p.task === "signal_lantern" && p.model === "gpt-6-sol").length !== 1)
    throw new Error("Exactly one historical lantern run 3 is required");
  return selected;
}

export function assertCompleteGallery(rows: Row[], additionalTasks: string[] = []): void {
  const tasks = [...GALLERY_TASKS, ...additionalTasks];
  if (new Set(tasks).size !== tasks.length) throw new Error("Repeated required gallery task");
  for (const task of tasks) for (const model of GALLERY_MODELS)
    if (rows.filter(p => p.task === task && p.model === model).length !== 1)
      throw new Error(`Incomplete or duplicated matrix: ${task}/${model}`);
  if (rows.length !== tasks.length * GALLERY_MODELS.length + 1 || rows.filter(p => p.task === "signal_lantern" && p.model === "gpt-6-sol" && p.repetition === 3).length !== 1)
    throw new Error("Expected a complete current-model matrix plus historical lantern run 3");
}
