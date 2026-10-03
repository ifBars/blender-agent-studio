# Comparison gallery previews

The gallery contains thirteen no-plugin / plugin pairs: eight from the October
spatial pilot and five from the September quality study. The earlier set adds
three signal lantern attempts, a lever press and a winch drawbridge. Models and
cohorts are kept separate; the lantern uses GPT 6 Sol, not GPT 6.1 Sol.

## Why the old images looked soft

The benchmark evidence images are 384 x 384 pixels. The gallery displayed them
at up to 660 CSS pixels tall, and more physical pixels on a high-density screen.
That enlargement softened detail. The evidence renderer uses Eevee and did not
explicitly fix sampling settings. This identified a sampling-control gap, not
proof that every visible texture was render noise.

The new display preset renders the saved native models at 1536 x 1536 pixels
with Cycles, 64 samples, OpenImageDenoise and the same neutral studio for each
side. Depth of field, motion blur, authored compositing and sequencing are off.
These are fresh renders, not upscaled or AI-restored images. The page offers
full-size image links and a switch back to the original review images.

## Preserve the experiment

HD previews do not replace benchmark evidence or change scores. The original
images and their hashes remain available in the same dataset. Historical
reviews describe those original images, not the new Cycles previews. New
lighting/refraction and denoising can change the appearance of materials.

Only these explicitly named staging meshes may be hidden in HD previews:
`Studio ground`, `Studio | ground`, `Studio | desk plane`,
`Studio | compact curved backdrop`, and `Preview floor`. Nothing is removed
from the saved model. Every condition records the names hidden, render settings
and source hash. Original export failures remain failures. The older lantern
repeat 1, press and drawbridge reviews already used floor-hidden evidence;
that is the evidence retained under Original review for those rows. The
drawbridge slider shows still views; its historical review also used sampled
animation frames.

Legacy summaries did not record artifact hashes. Their source hashes are
captured during gallery preparation and marked accordingly; they are not
presented as hashes recorded during generation. The October runs retain their
original artifact hashes, which are checked before rendering.

## Build and publish

First restore the frozen eight-pair spatial dataset from its
[release archive](https://github.com/ifBars/blender-agent-studio/releases/tag/vanilla-plugin-pilot-2026-10-02),
or build it with `tools/build-benchmark-previews.ts`. Then run:

```powershell
bun tools/expand-benchmark-gallery.ts `
  --spatial-data site/public/benchmarks/plugin-vs-vanilla/comparison.json `
  --legacy-root .tmp/quality-study-2026-09-23 `
  --vanilla-runs ../benchmarks/plugin-vs-vanilla-2026-10-02/runs `
  --plugin-runs ../benchmarks/spatial-2026-10-02/runs `
  --output ../benchmarks/gallery-expanded-2026-10-02 `
  --blender 'D:/SteamLibrary/steamapps/common/Blender/blender.exe'
```

The renderer requires an OptiX device and bounds each saved asset to ten
minutes. It never saves the opened blend. Completed previews can be reused
only when their source hash, views and staging exclusions match. An incomplete
preview directory stops the run for inspection. Keep all generated files out
of Git.

The release archive contains `benchmarks/gallery-v2/`: thirteen pairs, 172 HD
images and 172 original images. Pin the release URL, archive SHA-256, dataset
path and counts in `site/benchmark-previews.json`. `bun run docs:assets` checks
both image sets before restoring them for the site build.
