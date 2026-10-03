type Condition = { score: number; rawScore: number; hardGate: boolean; rawHardGate: boolean; seconds: number; triangles: number; images: Record<string, string>; executionMode: string; guidanceHash: string | null; skillFingerprint: string | null };
type Pair = { task: string; taskTitle: string; model: string; modelTitle: string; vanilla: Condition; plugin: Condition;
  votes: { baseline: number; candidate: number; tie: number }; note: string;
  criteria: Array<{ id: string; label: string; vanilla: Record<string, number>; plugin: Record<string, number> }> };
type Dataset = { schemaVersion: number; experiment: string; pairs: Pair[]; framing: string; limitation: string };

export function isVanillaPluginDataset(data: any): data is Dataset {
  return data?.schemaVersion === 2 && data?.experiment === "vanilla_vs_plugin" && Array.isArray(data.pairs) && data.pairs.length > 0 &&
    data.pairs.every((pair: any) => pair.vanilla?.executionMode === "baseline" && !pair.vanilla.skillFingerprint && !pair.vanilla.guidanceHash &&
      pair.plugin?.executionMode === "skills" && !!pair.plugin.skillFingerprint && !pair.plugin.guidanceHash);
}

export function splitPosition(clientX: number, left: number, width: number): number {
  return width > 0 ? Math.max(0, Math.min(100, Math.round((clientX - left) / width * 100))) : 50;
}

export function initComparison(element: HTMLElement, base: string) {
  const select = (name: string) => element.querySelector<HTMLSelectElement>(`[data-compare-${name}]`)!;
  const task = select("task"), model = select("model"), view = select("view");
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
    const limitation = document.createElement("p"); limitation.textContent = data.limitation; detail.append(limitation);
  };
  const update = async () => {
    const pair = data.pairs.find(pair => pair.task === task.value && pair.model === model.value)!;
    const token = ++revision;
    stage.setAttribute("aria-busy", "true"); status.hidden = false; status.textContent = "Loading matched views…";
    vanilla.hidden = true; plugin.hidden = true;
    const a = new Image(), b = new Image();
    a.src = base + pair.vanilla.images[view.value]; b.src = base + pair.plugin.images[view.value];
    try {
      await Promise.all([a.decode(), b.decode()]);
      if (token !== revision) return;
      vanilla.src = a.src; plugin.src = b.src;
      vanilla.alt = `${pair.modelTitle}: ${pair.taskTitle}, ${view.value}, no-plugin result`;
      plugin.alt = `${pair.modelTitle}: ${pair.taskTitle}, ${view.value}, with plugin`;
      vanilla.hidden = false; plugin.hidden = false; status.hidden = true;
      text("verdict", `${pair.votes.baseline} preferred no plugin · ${pair.votes.candidate} preferred plugin${pair.votes.tie ? ` · ${pair.votes.tie} tied` : ""}`);
      text("note", pair.note); text("framing", data.framing); renderDetails(pair);
      const url = new URL(location.href); url.searchParams.set("task", pair.task); url.searchParams.set("model", pair.model); url.searchParams.set("view", view.value);
      history.replaceState(null, "", url);
    } catch {
      if (token === revision) { status.hidden = false; status.textContent = "This image pair could not load. Choose another view or reload the page."; }
    } finally { if (token === revision) stage.setAttribute("aria-busy", "false"); }
  };
  const updateViews = () => {
    const pair = data.pairs.find(pair => pair.task === task.value && pair.model === model.value)!;
    const views = Object.keys(pair.vanilla.images).filter(name => pair.plugin.images[name]);
    fill(view, views.map(name => [name, name === "bottom" ? "Underside" : name[0].toUpperCase() + name.slice(1)]), view.value || new URLSearchParams(location.search).get("view") || "perspective");
    void update();
  };
  const updateModels = () => {
    fill(model, data.pairs.filter(pair => pair.task === task.value).map(pair => [pair.model, pair.modelTitle]), model.value || new URLSearchParams(location.search).get("model") || "gpt-6-astra");
    updateViews();
  };
  task.addEventListener("change", updateModels); model.addEventListener("change", updateViews); view.addEventListener("change", () => void update());
  void fetch(element.dataset.source!).then(async response => {
    if (!response.ok) throw new Error("Comparison dataset unavailable");
    data = await response.json();
    if (!isVanillaPluginDataset(data)) throw new Error("Expected verified no-plugin versus plugin comparisons");
    fill(task, [...new Map(data.pairs.map(pair => [pair.task, pair.taskTitle])).entries()], new URLSearchParams(location.search).get("task") ?? "");
    updateModels();
  }).catch(() => { status.textContent = "Comparison data could not load. Reload the page or use the results documentation."; stage.setAttribute("aria-busy", "false"); });
}
