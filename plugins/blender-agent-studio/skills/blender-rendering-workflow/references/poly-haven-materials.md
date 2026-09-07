# Scanned materials and HDRIs

Photorealism does not require inventing every surface from scratch. Author the
scene and its important forms; use suitable high-quality scans when they improve
realism. Do not default to plain matte colors or generic Noise textures for
visible wood grain, textile weave, stone or plaster in a photorealistic request.
Treat resolution, physical scale, shader wiring and geometry as separate checks.

## Search and acquire

The bundled tools are **Powered by Poly Haven**. They use the public API with an
identifying User-Agent and visible provider credit. The downloaded texture/HDRI
assets are [CC0](https://polyhaven.com/license); no API key is needed. This is an
independent integration, not an official Poly Haven product.

1. `blender_search_polyhaven_assets`: choose `assetType: "textures"` or `"hdris"`
   and a concise query such as `linen`, `wood floor` or `morning`. Search returns
   candidate IDs and source pages; it does not download files.
2. `blender_download_polyhaven_asset`: provide the exact `assetId`, `outputDir`
   and resolution (`1k`, `2k`, `4k`, `8k`). Textures default to separate diffuse,
   roughness and OpenGL normal maps. Request displacement, metallic or AO only
   when the material and shot need them. HDRIs download a Radiance HDR image.
3. Use 4K as a reasonable hero-material starting point; choose 8K when projected
   texel density or close-up detail warrants its memory cost. Preview materials
   before increasing resolution. The tool fails rather than silently falling
   back if the requested map/resolution is unavailable.
4. Reuse the downloaded files and manifest across iterations. Downloads require
   a new or empty directory, verify source MD5/size, and record SHA-256, map
   roles, source URLs, license and color-space guidance. Partial failures are
   recorded as failed manifests, never complete asset sets.

For a standalone skill install, Bun can run the same integration without MCP or
extra packages:

```powershell
bun "<skill-root>/scripts/poly-haven-cli.ts" search --query linen --type textures
bun "<skill-root>/scripts/poly-haven-cli.ts" download --asset-id rough_linen `
  --resolution 4k --output-dir assets/rough-linen
bun "<skill-root>/scripts/poly-haven-cli.ts" download --asset-id kiara_3_morning `
  --type hdris --resolution 4k --output-dir assets/morning-hdri
```

This surface intentionally covers texture maps and HDRIs. It does not download
third-party models or execute `.blend` files from the network.

## Apply and verify

- Color/albedo uses sRGB. Roughness, metalness, AO, displacement and normal maps
  use Non-Color/data interpretation. Feed normals through a Normal Map node;
  these downloads use the OpenGL (+Y) convention. Keep the HDRI's linear input
  interpretation and connect it through an Environment Texture node.
- Establish UVs and physical scale before judging a material. Preserve UVs
  through cloth deformation. Tangent-space normal maps need consistent UVs;
  projecting color through box coordinates does not automatically make a
  tangent normal map correct.
- Put grain in the direction of the modeled joinery and weave along the fabric.
  Avoid making a whole room one enormous texture tile or repeating the same knot
  identically on every board. Keep displacement strength in scene units.
- Start with diffuse, roughness and normal. Displacement needs suitable mesh
  density and can distort silhouettes or contacts. AO is not a substitute for
  actual contact shadows; do not double-darken the Cycles beauty indiscriminately.
- Inspect both a material close-up and the full composition. High-resolution
  textures cannot fix inflated cushions, regular wave-like bedding, floating
  props, incorrect scale or flat lighting. Improve geometry and transport too.
- Pack external images or deliver them beside the source with stable relative
  paths. Use authored-render preflight to inspect image sizes, color spaces,
  packing and missing dependencies. Reopen the final `.blend` in a clean process.
- Record which work is authored and which materials/HDRIs are sourced. Keep
  large source images and generated scenes outside the plugin repository.

API references: [public API](https://github.com/Poly-Haven/Public-API),
[API terms](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md).
