type Condition = { score: number; rawScore: number; hardGate: boolean; rawHardGate: boolean; seconds: number; triangles: number; images: Record<string, string>; originalImages?: Record<string, string>; preview?: { hiddenStagingObjects: string[] }; executionMode: string; guidanceHash: string | null; skillFingerprint: string | null };
type Pair = { id?: string; repetition?: number; cohort?: string; limitation?: string; task: string; taskTitle: string; model: string; modelTitle: string; vanilla: Condition; plugin: Condition;
  votes: { baseline: number; candidate: number; tie: number }; note: string;
  criteria: Array<{ id: string; label: string; vanilla: Record<string, number>; plugin: Record<string, number> }> };
type Dataset = { schemaVersion: number; experiment: string; pairs: Pair[]; framing: string; limitation: string };

export function isVanillaPluginDataset(data: any): data is Dataset {
  return data?.schemaVersion === 2 && data?.experiment === "vanilla_vs_plugin" && Array.isArray(data.pairs) && data.pairs.length > 0 &&
    data.pairs.every((pair: any) => pair.vanilla?.executionMode === "baseline" && !pair.vanilla.skillFingerprint && !pair.vanilla.guidanceHash &&
      pair.plugin?.executionMode === "skills" && !!pair.plugin.skillFingerprint && !pair.plugin.guidanceHash);
}

export function modelOptions(pairs: Pair[], task: string): Array<[string, string]> {
  return [...new Map(pairs.filter(pair => pair.task === task).map(pair => [pair.model, pair.modelTitle])).entries()];
}

export function findPair(pairs: Pair[], task: string, model: string, repetition: string): Pair | undefined {
  return pairs.find(pair => pair.task === task && pair.model === model && String(pair.repetition ?? 1) === repetition);
}

export function splitPosition(clientX: number, left: number, width: number): number {
  return width > 0 ? Math.max(0, Math.min(100, Math.round((clientX - left) / width * 100))) : 50;
}

export function initComparison(element: HTMLElement, base: string) {
  const select = (name: string) => element.querySelector<HTMLSelectElement>(`[data-compare-${name}]`)!;
  const task = select("task"), model = select("model"), view = select("view"), run = select("run"), quality = select("quality");
  const stage = element.querySelector<HTMLElement>("[data-compare-stage]")!;
  const range = element.querySelector<HTMLInputElement>("[data-compare-range]")!;
  const status = element.querySelector<HTMLElement>("[data-compare-status]")!;
  const vanilla = element.querySelector<HTMLImageElement>("[data-compare-vanilla]")!;
  const plugin = element.querySelector<HTMLImageElement>("[data-compare-plugin]")!;
  let data: Dataset, revision = 0;
  const text = (name: string, value: string) => { element.querySelector<HTMLElement>(`[data-compare-${name}]`)!.textContent = value; };
  const setSplit = (value: number) => {
    range.value = String(value);
    stage.style.setProperty("--split", `${value}%`);
    range.setAttribute("aria-valuetext", `${value}% no-plugin result visible`);
  };
  range.addEventListener("input", () => setSplit(Number(range.value)));
  range.addEventListener("pointerdown", event => {
    event.preventDefault(); range.focus(); range.setPointerCapture(event.pointerId);
    const bounds = stage.getBoundingClientRect(); setSplit(splitPosition(event.clientX, bounds.left, bounds.width));
  });
  range.addEventListener("pointermove", event => {
    if (!range.hasPointerCapture(event.pointerId)) return;
    const bounds = stage.getBoundingClientRect(); setSplit(splitPosition(event.clientX, bounds.left, bounds.width));
  });
  const release = (event: PointerEvent) => { if (range.hasPointerCapture(event.pointerId)) range.releasePointerCapture(event.pointerId); };
  range.addEventListener("pointerup", release); range.addEventListener("pointercancel", release);
  element.querySelector("[data-compare-reset]")!.addEventListener("click", () => setSplit(50));
  const fill = (target: HTMLSelectElement, options: Array<[string, string]>, preferred: string) => {
    target.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
    target.value = options.some(([value]) => value === preferred) ? preferred : options[0]?.[0] ?? "";
  };
  const selected = () => findPair(data.pairs, task.value, model.value, run.value)!;
  const images = (condition: Condition) => quality.value === "original" ? condition.originalImages ?? condition.images : condition.images;
  const duration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const renderDetails = (pair: Pair) => {
    const table = document.createElement("table");
    const row = (values: string[], header = false) => {
      const tr = document.createElement("tr");
      for (const value of values) { const cell = document.createElement(header ? "th" : "td"); cell.textContent = value; tr.append(cell); }
      table.append(tr);
    };
    row(["Check", "No plugin", "With plugin"], true);
    row(["Technical gates", pair.vanilla.hardGate ? "Pass" : "Fail", pair.plugin.hardGate ? "Pass" : "Fail"]);
    row(["Structural proxy / 100", String(pair.vanilla.score), String(pair.plugin.score)]);
    row(["Generation time", duration(pair.vanilla.seconds), duration(pair.plugin.seconds)]);
    row(["Evaluated triangles", pair.vanilla.triangles.toLocaleString(), pair.plugin.triangles.toLocaleString()]);
    const counts = (values: Record<string, number>) => Object.entries(values).filter(([, count]) => count > 0).map(([label, count]) => `${count} ${label}`).join(" · ");
    for (const criterion of pair.criteria) row([criterion.label, counts(criterion.vanilla), counts(criterion.plugin)]);
    const detail = element.querySelector<HTMLElement>("[data-compare-details]")!;
    detail.replaceChildren(table);
    if (pair.vanilla.rawScore !== pair.vanilla.score || pair.plugin.rawScore !== pair.plugin.score) {
      const note = document.createElement("p");
      note.textContent = `Naming-check correction applied: raw scores were ${pair.vanilla.rawScore} / ${pair.plugin.rawScore}. Screws count as hardware. Original scores remain in the downloadable data; geometry and visual judgments are unchanged.`;
      detail.append(note);
    }
    const limitation = document.createElement("p"); limitation.textContent = pair.limitation ?? data.limitation; detail.append(limitation);
    const staging = [...new Set([...(pair.vanilla.preview?.hiddenStagingObjects ?? []), ...(pair.plugin.preview?.hiddenStagingObjects ?? [])])];
    const preview = document.createElement("p");
    preview.textContent = "HD previews use Cycles at 1536 px with denoising. Reviews refer to the original images. " +
      (staging.length ? `Studio meshes hidden in HD: ${staging.join(", ")}. Saved models and technical scores are unchanged.` : "Saved models are unchanged.");
    detail.append(preview);
  };
  const update = async () => {
    const pair = selected();
    const token = ++revision;
    stage.setAttribute("aria-busy", "true"); status.hidden = false; status.textContent = "Loading matched views…";
    vanilla.hidden = true; plugin.hidden = true;
    const a = new Image(), b = new Image();
    a.src = base + images(pair.vanilla)[view.value]; b.src = base + images(pair.plugin)[view.value];
    try {
      await Promise.all([a.decode(), b.decode()]);
      if (token !== revision) return;
      vanilla.src = a.src; plugin.src = b.src;
      vanilla.alt = `${pair.modelTitle}: ${pair.taskTitle}, ${view.value}, no-plugin result`;
      plugin.alt = `${pair.modelTitle}: ${pair.taskTitle}, ${view.value}, with plugin`;
      vanilla.hidden = false; plugin.hidden = false; status.hidden = true;
      text("verdict", `${pair.votes.baseline} preferred no plugin · ${pair.votes.candidate} preferred plugin${pair.votes.tie ? ` · ${pair.votes.tie} tied` : ""}`);
      text("note", pair.note);
      text("framing", quality.value === "original" ? "Original review images" : "HD preview · 1536 px · denoised · Reviews use original images");
      text("cohort", pair.cohort ?? "");
      for (const [key, src] of [["vanilla", a.src], ["plugin", b.src]])
        element.querySelector<HTMLAnchorElement>(`[data-compare-open-${key}]`)!.href = src;
      renderDetails(pair);
      const url = new URL(location.href); url.searchParams.set("task", pair.task); url.searchParams.set("model", pair.model); url.searchParams.set("view", view.value); url.searchParams.set("run", run.value); url.searchParams.set("quality", quality.value);
      history.replaceState(null, "", url);
    } catch {
      if (token === revision) { status.hidden = false; status.textContent = "This image pair could not load. Choose another view or reload the page."; }
    } finally { if (token === revision) stage.setAttribute("aria-busy", "false"); }
  };
  const updateViews = () => {
    const pair = selected();
    const views = Object.keys(images(pair.vanilla)).filter(name => images(pair.plugin)[name]);
    fill(view, views.map(name => [name, name === "bottom" ? "Underside" : name[0].toUpperCase() + name.slice(1)]), view.value || new URLSearchParams(location.search).get("view") || "perspective");
    void update();
  };
  const updateRuns = () => {
    const options = data.pairs.filter(pair => pair.task === task.value && pair.model === model.value)
      .map(pair => [String(pair.repetition ?? 1), `Run ${pair.repetition ?? 1}`] as [string, string]);
    fill(run, options, run.value || new URLSearchParams(location.search).get("run") || "1");
    run.parentElement!.hidden = options.length < 2;
    updateViews();
  };
  const updateModels = () => {
    fill(model, modelOptions(data.pairs, task.value), model.value || new URLSearchParams(location.search).get("model") || "");
    updateRuns();
  };
  task.addEventListener("change", updateModels); model.addEventListener("change", updateRuns);
  run.addEventListener("change", updateViews); quality.addEventListener("change", updateViews);
  view.addEventListener("change", () => void update());
  quality.value = new URLSearchParams(location.search).get("quality") === "original" ? "original" : "hd";
  void fetch(element.dataset.source!).then(async response => {
    if (!response.ok) throw new Error("Comparison dataset unavailable");
    data = await response.json();
    if (!isVanillaPluginDataset(data)) throw new Error("Expected verified no-plugin versus plugin comparisons");
    fill(task, [...new Map(data.pairs.map(pair => [pair.task, ({signal_lantern:"Signal lantern",joinery_stool:"Joinery stool",task_lamp_clearance_holdout:"Task lamp",tabletop_press:"Lever press",winch_drawbridge:"Drawbridge"} as Record<string,string>)[pair.task] ?? pair.taskTitle])).entries()], new URLSearchParams(location.search).get("task") ?? "");
    updateModels();
  }).catch(() => { status.textContent = "Comparison data could not load. Reload the page or use the results documentation."; stage.setAttribute("aria-busy", "false"); });
}
