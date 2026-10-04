export function comparisonViewer(base: string): string {
  return `<section class="comparison" data-comparison data-source="${base}benchmarks/gallery-matrix/comparison.json" aria-label="Benchmark comparison">
  <div class="comparison-controls">
    <label>Task<select data-compare-task aria-label="Benchmark task"></select></label>
    <label>Model<select data-compare-model aria-label="Generator model"></select></label>
    <label>View<select data-compare-view aria-label="Camera view"></select></label>
    <label>Images<select data-compare-quality aria-label="Image quality"><option value="hd">Preview</option><option value="original">Review images</option></select></label>
  </div>
  <div class="comparison-stage" data-compare-stage style="--split:50%" aria-busy="true">
    <img data-compare-vanilla alt="No plugin result" width="1536" height="1536" hidden>
    <img data-compare-plugin class="comparison-after" alt="Result with plugin" width="1536" height="1536" hidden>
    <span class="comparison-label comparison-label-before">No plugin</span>
    <span class="comparison-label comparison-label-after">With plugin</span>
    <div class="comparison-divider" aria-hidden="true"><span>↔</span></div>
    <input data-compare-range class="comparison-range" type="range" min="0" max="100" value="50" aria-label="Image comparison split; no plugin on the left, with plugin on the right" aria-valuetext="50% no plugin visible">
    <p class="comparison-status" data-compare-status role="status">Loading comparisons…</p>
  </div>
  <div class="comparison-caption"><span>Drag to compare · Arrow keys work too</span><button type="button" data-compare-reset>Reset split</button></div>
  <div class="comparison-links"><span>Full size:</span> <a data-compare-open-vanilla target="_blank" rel="noopener">No plugin</a><a data-compare-open-plugin target="_blank" rel="noopener">With plugin</a></div>
  <p class="comparison-framing" data-compare-framing></p>
  <details class="comparison-details"><summary>Scores &amp; review</summary>
  <p data-compare-cohort></p>
  <div class="comparison-verdict"><p class="eyebrow">Blinded visual review</p><p data-compare-verdict></p><p class="comparison-note" data-compare-note></p></div>
    <div data-compare-details></div>
    <a href="${base}benchmarks/gallery-matrix/comparison.json" download>Download comparison data</a>
  </details>
  <noscript><p>The interactive comparison needs JavaScript. The <a href="${base}benchmarks/gallery-matrix/comparison.json">comparison data</a> contains direct image paths and validation results.</p></noscript>
</section>`;
}
