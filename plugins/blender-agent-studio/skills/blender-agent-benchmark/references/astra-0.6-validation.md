# Astra 0.6 development validation

2026-09-07. This release adds tested rendering and asset-acquisition capabilities.
It does **not** establish a general modeling-quality improvement over 0.5.0.

## Controlled generation slices

Generation used GPT-6 Astra at medium effort, Codex CLI 0.153.2, Blender
5.2.1 LTS (`9e2066aef7ef`), isolated source snapshots and output directories,
identical task prompts and permissions within each pair. Visual evaluation used
three GPT-5.6 Terra medium judges with blinded, counterbalanced six-view evidence.
Each cell contains one generation. The workshop baseline was reused for the
repair comparison, so the repair is development evidence, not an independent
validation sample. No Astra-versus-Sol/Terra/Luna generation comparison was run.

| Task / candidate | Automated scores, old / candidate | Visual preference, old / candidate | Non-regression gate | Generation seconds, old / candidate |
| --- | --- | --- | --- | --- |
| Signal lantern / initial | 100 / 100; both hard gates pass | 0 / 3 | Pass | 414 / 512 |
| Observatory workshop / initial | 100 / 100; both hard gates pass | 3 / 0 | Fail | 496 / 566 |
| Observatory workshop / revised coverage guidance | 100 / 100; both hard gates pass | 2 / 1 | Fail | 496 / 755 |

The initial workshop left broad exterior panels visually unfinished. The revision
emphasized finishing the promised scope across multiple views. Its exterior
improved, but its faceted footprint and inconsistent panel language still lost
the majority preference. The lantern improvement does not offset that regression.
The historical full suite and repeated representative holdouts remain untested
for this release. Do not present these results as a passed release-wide visual
gate, a speed gain, or a capability ranking. Model judges remain proxies for
human judgment.

Local source snapshot SHA-256 identifiers (sorted relative path/content-hash
lists; dependencies and temporary output excluded):

- Published 0.5.0: `f1616c8969350b094f872dcceac36ca2f1ac1b4015a9acc47e8ca533a7abaf71`
- Initial candidate: `6f49f2e0c5eea68d730f1a7bf20fe60a5405fbe43ddc419e4ba507cb7f64f940`
- Revised generation guidance: `e9df7dfc0908c1e65f422d218274adef073c3226aadf3ed97f80dbfcd4c5dcfc`

Raw generations, comparisons, mappings and traces are retained locally under
`work/bedroom-bench`, outside Git. These hashes identify development snapshots;
later failure-reporting and documentation edits are not new benchmark runs.

## Tool and scene validation

- 30 Bun tests and six Python tests passed, including real Blender process and
  authored-render tests. Metadata and synchronized guidance validation passed.
- Checked that factory startup preserves the supplied file, Python failures
  propagate, and failed processes cannot expose stale successful metrics.
- Authored rendering preserves camera, lighting, world, color management and
  source bytes; validates missing dependencies; bounds output; and mutes
  compositor File Output nodes. A separate workshop scene also rendered through
  the MCP surface with its authored lighting intact.
- Live Poly Haven search and a 4K floor-map download exercised the MCP transport,
  source size/MD5 verification, SHA-256 provenance and physical material wiring.
  A 1K morning HDRI also downloaded through the standalone CLI. Mocked tests
  cover corrupt files, size limits, unsupported resolutions, hosts
  and reused output directories. Not every asset or resolution was downloaded.
- A bedroom study used original architecture/furniture, a simulated duvet,
  scanned materials, morning HDRI and real volume scattering. Two CC0 accent
  asset sets supplied cushions and a plant. This was iterative dogfooding, not
  a blinded photorealism benchmark.
- Additional throw simulations made the bedroom worse. The accepted earlier
  drape was restored in source; rebuilt geometry/UV hashes, modifiers and sheen
  settings matched the accepted file exactly. More simulation complexity was
  not treated as evidence of better quality.

Powered by [Poly Haven](https://polyhaven.com). Its assets are
[CC0](https://polyhaven.com/license); the integration does not imply endorsement.
