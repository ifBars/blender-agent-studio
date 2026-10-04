type Condition = { score: number | null; rawScore: number | null; hardGate: boolean; rawHardGate: boolean; seconds: number | null; triangles: number | null; images: Record<string, string>; imageHashes?: Record<string,string>; originalImages?: Record<string, string>; rawImages?: Record<string, string>; preview?: { hiddenStagingObjects?: string[]; description?: string }; evidenceUnavailable?: boolean; failedChecks?: Array<{name?: string; label?: string; id?: string; detail?: string}>; failure?: string | null; executionMode: string; guidanceHash: string | null; skillFingerprint: string | null };
type Pair = { id?: string; repetition?: number; cohort?: string; limitation?: string; task: string; taskTitle: string; model: string; modelTitle: string; vanilla: Condition & {scoreCorrection?:string}; plugin: Condition & {scoreCorrection?:string};
  votes: { baseline: number; candidate: number; tie: number }; note: string;
  criteria: Array<{ id: string; label: string; vanilla: Record<string, number>; plugin: Record<string, number> }> };
type Dataset = { schemaVersion: number; experiment: string; pairs: Pair[]; framing: string; limitation: string };

export function isVanillaPluginDataset(data: any): data is Dataset {
  return data?.schemaVersion === 2 && data?.experiment === "vanilla_vs_plugin" && Array.isArray(data.pairs) && data.pairs.length > 0 &&
    data.pairs.every((pair: any) => {
      const resource=pair.resourcePolicy, shared=Boolean(pair.sharedResourceGuidanceHash&&resource?.cpuHardCapPercent===20&&resource?.concurrency===1&&
        pair.vanilla?.guidanceHash===pair.sharedResourceGuidanceHash&&pair.plugin?.guidanceHash===pair.sharedResourceGuidanceHash);
      return pair.vanilla?.executionMode === "baseline" && !pair.vanilla.skillFingerprint && (!pair.vanilla.guidanceHash||shared) &&
        pair.plugin?.executionMode === "skills" && !!pair.plugin.skillFingerprint && (!pair.plugin.guidanceHash||shared);
    });
}

export function modelOptions(pairs: Pair[], task: string): Array<[string, string]> {
  return [...new Map(pairs.filter(pair => pair.task === task).map(pair => [pair.model, pair.modelTitle])).entries()];
}

export function findPair(pairs: Pair[], task: string, model: string): Pair | undefined {
  return pairs.find(pair => pair.task === task && pair.model === model);
}

export function splitPosition(clientX: number, left: number, width: number): number {
  return width > 0 ? Math.max(0, Math.min(100, Math.round((clientX - left) / width * 100))) : 50;
}

export function imageFraming(original: boolean, a: {width: number; height: number}, b: {width: number; height: number}): string {
  const edges = [...new Set([Math.max(a.width, a.height), Math.max(b.width, b.height)])].filter(edge => edge > 1);
  if (!edges.length) return "Visual evidence unavailable";
  return `${original ? "Review images" : "Preview"} · ${edges.join(" / ")} px longest edge${original ? "" : " · Reviews use the original evidence"}`;
}

export function viewLabel(name: string): string {
  const frame = /^frame_(\d+)$/.exec(name);
  return frame ? `Frame ${Number(frame[1])}` : name === "bottom" ? "Underside" : name[0].toUpperCase() + name.slice(1);
}

export function imageAvailability(a: {width:number;height:number}, b: {width:number;height:number}): 'both' | 'vanilla' | 'plugin' | 'none' {
  const before = a.width > 1 && a.height > 1, after = b.width > 1 && b.height > 1;
  return before && after ? 'both' : before ? 'vanilla' : after ? 'plugin' : 'none';
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
  const selected = () => findPair(data.pairs, task.value, model.value)!;
  const images = (condition: Condition) => condition.images;
  const duration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const renderDetails = (pair: Pair) => {
    const table = document.createElement("table");
    const row = (values: string[], header = false) => {
      const tr = document.createElement("tr");
      for (const value of values) { const cell = document.createElement(header ? "th" : "td"); cell.textContent = value; tr.append(cell); }
      table.append(tr);
    };
    row(["Check", "No plugin", "With plugin"], true);
    row(["Technical gates", ...[pair.vanilla,pair.plugin].map(condition => condition.score === null ? "Unavailable" : condition.hardGate ? "Pass" : "Fail")]);
    row(["Structural proxy / 100", pair.vanilla.score === null ? "Unavailable" : String(pair.vanilla.score), pair.plugin.score === null ? "Unavailable" : String(pair.plugin.score)]);
    row(["Generation time", pair.vanilla.seconds === null ? "Unavailable" : duration(pair.vanilla.seconds), pair.plugin.seconds === null ? "Unavailable" : duration(pair.plugin.seconds)]);
    row(["Evaluated triangles", pair.vanilla.triangles?.toLocaleString() ?? "Unavailable", pair.plugin.triangles?.toLocaleString() ?? "Unavailable"]);
    const counts = (values: Record<string, number>) => Object.entries(values).filter(([, count]) => count > 0).map(([label, count]) => `${count} ${label}`).join(" · ");
    for (const criterion of pair.criteria) row([criterion.label, counts(criterion.vanilla), counts(criterion.plugin)]);
    const detail = element.querySelector<HTMLElement>("[data-compare-details]")!;
    detail.replaceChildren(table);
    for (const [label, condition] of [["No plugin", pair.vanilla], ["With plugin", pair.plugin]] as const) {
      const failures = condition.failure ?? condition.failedChecks?.map(check => check.detail ?? check.name ?? check.label ?? check.id).filter(Boolean).join("; ");
      if (failures) { const note = document.createElement("p"); note.textContent = `${label} failed checks: ${failures}`; detail.append(note); }
    }
    if (pair.vanilla.rawImages?.[view.value] && pair.plugin.rawImages?.[view.value]) {
      const raw = document.createElement("p"); raw.append("Original submission evidence: ");
      for (const [label, path] of [["No plugin", pair.vanilla.rawImages[view.value]], ["With plugin", pair.plugin.rawImages[view.value]]]) {
        const link = document.createElement("a"); link.textContent = label; link.href = base + path; link.target = "_blank"; link.rel = "noopener";
        raw.append(link, " ");
      }
      detail.append(raw);
    }
    if (pair.vanilla.rawScore !== pair.vanilla.score || pair.plugin.rawScore !== pair.plugin.score || pair.vanilla.rawHardGate !== pair.vanilla.hardGate || pair.plugin.rawHardGate !== pair.plugin.hardGate) {
      const note = document.createElement("p");
      note.textContent = pair.vanilla.scoreCorrection ?? pair.plugin.scoreCorrection ?? `Naming-check correction applied: raw scores were ${pair.vanilla.rawScore} / ${pair.plugin.rawScore}. Screws count as hardware. Original scores remain in the downloadable data; geometry and visual judgments are unchanged.`;
      detail.append(note);
    }
    const limitation = document.createElement("p"); limitation.textContent = pair.limitation ?? data.limitation; detail.append(limitation);
    const staging = [...new Set([...(pair.vanilla.preview?.hiddenStagingObjects ?? []), ...(pair.plugin.preview?.hiddenStagingObjects ?? [])])];
    const preview = document.createElement("p");
    preview.textContent = (pair.vanilla.preview?.description ?? "Previews use Cycles with denoising.") + " Historical reviews refer to the archived original evidence. " +
      (staging.length ? `Studio meshes hidden in HD: ${staging.join(", ")}. Saved models and technical scores are unchanged.` : "Saved models are unchanged.");
    detail.append(preview);
  };
  const update = async () => {
    const pair = selected();
    const token = ++revision;
    stage.setAttribute("aria-busy", "true"); status.hidden = false; status.textContent = "Loading matched views…";
    vanilla.hidden = true; plugin.hidden = true;
    const a = new Image(), b = new Image();
    const source = (condition: Condition) => base + images(condition)[view.value] + (condition.imageHashes?.[view.value] ? `?sha256=${encodeURIComponent(condition.imageHashes[view.value])}` : '');
    a.src = source(pair.vanilla); b.src = source(pair.plugin);
    try {
      await Promise.all([a.decode(), b.decode()]);
      if (token !== revision) return;
      vanilla.src = a.src; plugin.src = b.src;
      vanilla.alt = `${pair.modelTitle}: ${pair.taskTitle}, ${view.value}, no-plugin result`;
      plugin.alt = `${pair.modelTitle}: ${pair.taskTitle}, ${view.value}, with plugin`;
      const availability = imageAvailability({width:a.naturalWidth,height:a.naturalHeight},{width:b.naturalWidth,height:b.naturalHeight});
      stage.dataset.available = availability;
      vanilla.hidden = availability === 'plugin' || availability === 'none';
      plugin.hidden = availability === 'vanilla' || availability === 'none';
      range.disabled = availability !== 'both';
      element.querySelector<HTMLButtonElement>('[data-compare-reset]')!.disabled = availability !== 'both';
      element.querySelector<HTMLElement>('.comparison-caption span')!.textContent = availability === 'both' ? 'Drag to compare · Arrow keys work too' : 'Comparison slider unavailable for this view';
      status.hidden = availability === 'both';
      if (availability === 'vanilla') status.textContent = 'With-plugin image unavailable for this view. Showing the no-plugin image.';
      if (availability === 'plugin') status.textContent = 'No-plugin image unavailable for this view. Showing the with-plugin image.';
      text("verdict", pair.votes.baseline + pair.votes.candidate + pair.votes.tie === 0 ? "Visual review unavailable" : `${pair.votes.baseline} preferred no plugin · ${pair.votes.candidate} preferred plugin${pair.votes.tie ? ` · ${pair.votes.tie} tied` : ""}`);
      text("note", pair.note);
      const incomplete = availability !== 'both';
      text("framing", imageFraming(false, {width: a.naturalWidth, height: a.naturalHeight}, {width: b.naturalWidth, height: b.naturalHeight}) + (incomplete ? " · Incomplete evidence; see Scores & review" : ""));
      if (a.naturalWidth === 1 && b.naturalWidth === 1) { status.hidden = false; status.textContent = "Neither attempt produced visual evidence. See Scores & review for the failure."; }
      text("cohort", pair.cohort ?? "");
      for (const [key, src] of [["vanilla", a.src], ["plugin", b.src]])
      {
        const link = element.querySelector<HTMLAnchorElement>(`[data-compare-open-${key}]`)!;
        link.href = src;
        link.hidden = availability === 'none' || availability === (key === 'vanilla' ? 'plugin' : 'vanilla');
      }
      renderDetails(pair);
      const url = new URL(location.href); url.searchParams.set("task", pair.task); url.searchParams.set("model", pair.model); url.searchParams.set("view", view.value); url.searchParams.delete("run"); url.searchParams.delete("quality");
      history.replaceState(null, "", url);
    } catch {
      if (token === revision) { status.hidden = false; status.textContent = "This image pair could not load. Choose another view or reload the page."; }
    } finally { if (token === revision) stage.setAttribute("aria-busy", "false"); }
  };
  const updateViews = () => {
    const pair = selected();
    const views = Object.keys(images(pair.vanilla)).filter(name => images(pair.plugin)[name]);
    fill(view, views.map(name => [name, viewLabel(name)]), view.value || new URLSearchParams(location.search).get("view") || "perspective");
    void update();
  };
  const updateModels = () => {
    fill(model, modelOptions(data.pairs, task.value), model.value || new URLSearchParams(location.search).get("model") || "");
    updateViews();
  };
  task.addEventListener("change", updateModels); model.addEventListener("change", updateViews);
  view.addEventListener("change", () => void update());
  void fetch(element.dataset.source!, {cache:'no-cache'}).then(async response => {
    if (!response.ok) throw new Error("Comparison dataset unavailable");
    data = await response.json();
    if (!isVanillaPluginDataset(data)) throw new Error("Expected verified no-plugin versus plugin comparisons");
    fill(task, [...new Map(data.pairs.map(pair => [pair.task, ({signal_lantern:"Signal lantern",joinery_stool:"Joinery stool",task_lamp_clearance_holdout:"Task lamp",tabletop_press:"Lever press",winch_drawbridge:"Drawbridge",decorated_reading_room:"Reading room",night_market_courtyard:"Night market",coastal_cafe_holdout:"Coastal cafe",game_ranger_character:"Game ranger",game_scout_deformation:"Rigged scout",game_badger_merchant_holdout:"Badger merchant"} as Record<string,string>)[pair.task] ?? pair.taskTitle])).entries()], new URLSearchParams(location.search).get("task") ?? "");
    updateModels();
  }).catch(() => { status.textContent = "Comparison data could not load. Reload the page or use the results documentation."; stage.setAttribute("aria-busy", "false"); });
}
