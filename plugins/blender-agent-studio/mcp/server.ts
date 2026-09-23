import {registerViewer, viewerToolMeta, makeGallery, galleryMeta} from "./viewer.ts";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { compareAssets, describeAsset } from "../scripts/scene-analysis.ts";
import { createPolyHavenClient } from "../skills/blender-rendering-workflow/scripts/poly-haven.ts";
import { prepareMixamoSearch } from "../scripts/mixamo.ts";
import {
  readJsonFile,
  resolveBlenderExecutable,
  runBlender,
} from "../scripts/blender-process.ts";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validationScripts = join(
  pluginRoot,
  "skills",
  "blender-asset-validation",
  "scripts",
);
const authoredRenderer = join(pluginRoot, "skills/blender-rendering-workflow/scripts/render_scene.py");
const polyHaven = createPolyHavenClient();

const server = new McpServer({
  name: "blender-agent-studio",
  version: JSON.parse(await readFile(join(pluginRoot, ".codex-plugin/plugin.json"), "utf8")).version,
});

registerViewer(server);

server.registerTool("blender_prepare_mixamo_search", {
  title: "Prepare Mixamo browser search",
  description: "Prepare a Mixamo search URL and browser workflow. Requires host browser tools to read live results, preview and download; does not itself search the catalog or handle Adobe credentials.",
  inputSchema: z.object({query: z.string().trim().min(1).max(200)}),
  annotations: {readOnlyHint: true, openWorldHint: false},
}, async ({query}) => result(prepareMixamoSearch(query)));

server.registerTool("blender_import_mixamo_animation", {
  title: "Import downloaded Mixamo animation",
  description: "Import one local animated FBX with its skeleton into a new standalone .blend. Keeps actions and reports frame ranges. No retargeting or modification of existing scenes. Output directory must not exist. Match fps to the Mixamo download setting.",
  inputSchema: z.object({
    fbxPath: z.string(), outputDir: z.string(), clipName: z.string().trim().min(1).max(120),
    fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).default(30),
    blenderPath: z.string().optional(),
    timeoutMs: z.number().int().min(1000).max(300000).default(60000),
  }),
}, async ({fbxPath, outputDir, clipName, fps, blenderPath, timeoutMs}) => {
  try {
    const output = resolve(outputDir);
    const process = await runBlender({blenderPath, timeoutMs,
      scriptPath: join(pluginRoot, "skills/blender-animation-workflow/scripts/import_mixamo.py"),
      scriptArgs: ["--input", resolve(fbxPath), "--output-dir", output, "--clip-name", clipName, "--fps", String(fps)],
    });
    if (process.exitCode !== 0 || process.timedOut) return {...result({process, report: null}), isError: true};
    return result({process, report: await readJsonFile(join(output, "mixamo-import.json"))});
  } catch (error) { return errorResult(error); }
});

function result(output: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
    structuredContent: output as Record<string, unknown>,
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

server.registerTool(
  "blender_fit_reference_camera",
  {
    title: "Fit reference camera framing",
    description: "Fit scale/focal length and lens shift from 3-32 explicit 2D/3D correspondences. Fixed camera pose and geometry; saves a candidate .blend in a new directory. Review with blender_compare_reference before retaining parameters in durable source. This does not solve camera pose or prove model similarity.",
    inputSchema: z.object({
      assetPath: z.string(), outputDir: z.string(), cameraName: z.string().optional(),
      referenceWidth: z.number().int().min(1).max(8192),
      referenceHeight: z.number().int().min(1).max(8192),
      landmarks: z.array(z.object({name: z.string(), objectName: z.string(),
        referenceUv: z.array(z.number().min(0).max(1)).length(2),
        localPoint: z.array(z.number()).length(3).default([0, 0, 0]),
      })).min(3).max(32),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1000).max(300000).default(60000),
    }),
  },
  async ({assetPath, outputDir, cameraName, referenceWidth, referenceHeight, landmarks, blenderPath, timeoutMs}) => {
    try {
      const output = resolve(outputDir);
      const args = ["--input", resolve(assetPath), "--output-dir", output,
        "--width", String(referenceWidth), "--height", String(referenceHeight),
        "--landmarks-json", JSON.stringify(landmarks)];
      if (cameraName) args.push("--camera", cameraName);
      const process = await runBlender({blenderPath, scriptPath: join(validationScripts, "fit_reference_camera.py"), scriptArgs: args, timeoutMs});
      if (process.exitCode !== 0 || process.timedOut) return {...result({process, report: null}), isError: true};
      return result({process, report: await readJsonFile(join(output, "camera-fit.json"))});
    } catch (error) { return errorResult(error); }
  },
);

server.registerTool(
  "blender_diagnose_topology",
  {
    title: "Locate degenerate mesh elements",
    description: "Read-only evaluated-mesh diagnostics: counts and bounded world-space locations of degenerate faces and zero-length edges. Element indices refer to evaluated meshes, not editable source indices. Open boundaries are not classified as defects. Writes a new JSON file.",
    inputSchema: z.object({assetPath: z.string(), outputJson: z.string(),
      objectName: z.string().optional(), limit: z.number().int().min(1).max(100).default(20),
      blenderPath: z.string().optional(), timeoutMs: z.number().int().min(1000).max(300000).default(60000)}),
  },
  async ({assetPath, outputJson, objectName, limit, blenderPath, timeoutMs}) => {
    try {
      const output = resolve(outputJson);
      await mkdir(dirname(output), {recursive: true});
      const args = ["--input", resolve(assetPath), "--output", output, "--limit", String(limit)];
      if (objectName) args.push("--object", objectName);
      const process = await runBlender({blenderPath, scriptPath: join(validationScripts, "diagnose_topology.py"), scriptArgs: args, timeoutMs});
      if (process.exitCode !== 0 || process.timedOut) return {...result({process, report: null}), isError: true};
      return result({process, outputJson: output, report: await readJsonFile(output)});
    } catch (error) { return errorResult(error); }
  },
);

server.registerTool(
  "blender_compare_reference",
  {
    _meta: viewerToolMeta,
    title: "Compare model projection with a reference image",
    description: "Render geometry through an authored reference camera and return a reference/silhouette/overlay image. Optional explicit white-foreground mask enables missing/excess coverage and IoU. Does not infer camera, foreground or 3D quality. Match pose/crop first; read-only source, new output directory.",
    inputSchema: z.object({
      assetPath: z.string().describe(".blend with a camera matching the reference view"),
      referencePath: z.string(),
      outputDir: z.string(),
      maskPath: z.string().optional().describe("Optional white foreground / black background silhouette mask with exactly the reference image dimensions. Do not supply a photograph as a mask."),
      cameraName: z.string().optional().describe("Exact camera name; defaults to the active authored camera"),
      landmarks: z.array(z.object({
        name: z.string(), objectName: z.string(),
        referenceUv: z.array(z.number().min(0).max(1)).length(2),
        localPoint: z.array(z.number()).length(3).default([0, 0, 0]),
      })).max(32).default([]).describe("Known reference features: normalized XY from image top-left and corresponding object-local XYZ (default origin). Reports projected pixel error; no camera fitting or occlusion inference."),
      maxEdge: z.number().int().min(128).max(1024).default(512),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1000).max(300000).default(60000),
    }),
  },
  async ({assetPath, referencePath, outputDir, maskPath, cameraName, landmarks, maxEdge, blenderPath, timeoutMs}) => {
    try {
      const output = resolve(outputDir);
      const args = ["--input", resolve(assetPath), "--reference", resolve(referencePath),
        "--output-dir", output, "--max-edge", String(maxEdge)];
      if (maskPath) args.push("--mask", resolve(maskPath));
      if (cameraName) args.push("--camera", cameraName);
      if (landmarks.length) args.push("--landmarks-json", JSON.stringify(landmarks));
      const process = await runBlender({blenderPath,
        scriptPath: join(validationScripts, "compare_reference.py"), scriptArgs: args, timeoutMs});
      if (process.exitCode !== 0 || process.timedOut) return {...result({process, report: null}), isError: true};
      const report = await readJsonFile(join(output, "comparison.json"));
      const response = result({process, report});
      const gallery = await makeGallery("Reference comparison", output, [{path: join(output, "comparison.png"), label: "Reference / model / overlay"}, {path: join(output, "overlay.png"), label: "Overlay"}], [["Purpose", "Projected geometry comparison"], ["Similarity", maskPath ? "See mask metrics in tool result" : "Visual comparison; no mask score"]]);
      return {...response, _meta: galleryMeta(gallery), content: [...response.content,
        {type: "image" as const, mimeType: "image/png", data: (await readFile(join(output, "comparison.png"))).toString("base64")}]};
    } catch (error) { return errorResult(error); }
  },
);

server.registerTool(
  "blender_version",
  {
    title: "Blender version",
    description:
      "Verify the configured Blender executable and return its exact build fingerprint.",
    inputSchema: z.object({
      blenderPath: z.string().optional(),
    }),
  },
  async ({ blenderPath }) => {
    try {
      const executable = resolveBlenderExecutable(blenderPath);
      const proc = Bun.spawn([executable, "--version"], {
        stdout: "pipe",
        stderr: "pipe",
        windowsHide: true,
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return result({ executable, exitCode, stdout, stderr });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "blender_inspect_asset",
  {
    title: "Inspect Blender asset",
    description:
      "Inspect a .blend, .glb, .gltf, .fbx, or .obj in Blender 5.2 and write machine-readable geometry, hierarchy, material, and animation metrics.",
    inputSchema: z.object({
      assetPath: z.string(),
      outputJson: z.string(),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1_000).max(1_800_000).default(300_000),
    }),
  },
  async ({ assetPath, outputJson, blenderPath, timeoutMs }) => {
    try {
      const resolvedOutput = resolve(outputJson);
      await mkdir(dirname(resolvedOutput), { recursive: true });
      const process = await runBlender({
        blenderPath,
        scriptPath: join(validationScripts, "inspect_asset.py"),
        scriptArgs: [
          "--input",
          resolve(assetPath),
          "--output",
          resolvedOutput,
        ],
        timeoutMs,
      });
      const metrics =
        process.exitCode === 0 && !process.timedOut && existsSync(resolvedOutput)
          ? await readJsonFile(resolvedOutput)
          : null;
      return { ...result({ process, outputJson: resolvedOutput, metrics }),
        isError: process.exitCode !== 0 || process.timedOut };
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "blender_render_evidence",
  {
    _meta: viewerToolMeta,
    title: "Render Blender evidence",
    description:
      "Render standardized multiview evidence and a contact sheet for a Blender asset using fixed cameras and lighting.",
    inputSchema: z.object({
      assetPath: z.string(),
      outputDir: z.string(),
      resolution: z.number().int().min(128).max(1024).default(384),
      views: z.array(z.enum(["perspective", "front", "back", "left", "right", "top"]))
        .min(1).max(6).refine(values => new Set(values).size === values.length, "Views must be unique")
        .default(["perspective", "front", "back", "left", "right", "top"])
        .describe("Use two relevant views at resolution 256 for fast repair previews. Partial views do not replace final multiview validation."),
      presentation: z.enum(["auto", "neutral", "dark", "light"]).default("auto")
        .describe("Adaptive contrast by default; pin a studio preset for repeatable comparisons."),
      animationFrames: z.array(z.number().int().min(0)).max(12).default([]),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1_000).max(1_800_000).default(600_000),
    }),
  },
  async ({
    assetPath,
    outputDir,
    resolution,
    views,
    presentation,
    animationFrames,
    blenderPath,
    timeoutMs,
  }) => {
    try {
      const resolvedOutput = resolve(outputDir);
      await mkdir(resolvedOutput, { recursive: true });
      const args = [
        "--input",
        resolve(assetPath),
        "--output-dir",
        resolvedOutput,
        "--resolution",
        String(resolution),
        "--views",
        views.join(","),
        "--presentation",
        presentation,
      ];
      if (animationFrames.length) {
        args.push("--frames", animationFrames.join(","));
      }
      const process = await runBlender({
        blenderPath,
        scriptPath: join(validationScripts, "render_evidence.py"),
        scriptArgs: args,
        timeoutMs,
      });
      const manifest = process.exitCode === 0 && !process.timedOut && existsSync(join(resolvedOutput, "evidence.json"))
        ? await readJsonFile(join(resolvedOutput, "evidence.json")) as Record<string, any> : null;
      const response = result({process, outputDir: resolvedOutput, manifest});
      if (!manifest) return {...response, isError: true};
      const candidates = [
        ...(manifest.contact_sheet ? [{path: manifest.contact_sheet, label: "All views"}] : []),
        ...(manifest.views ?? []).map((path:string, i:number)=>({path, label: manifest.requested_views?.[i] ?? `View ${i+1}`})),
      ];
      const gallery = await makeGallery("Model views", resolvedOutput, candidates,
        [["Scope", manifest.evidence_scope ?? "Evidence"], ["Lighting", manifest.requested_presentation ?? "Studio"]]);
      const content: Array<any> = [...response.content];
      if (gallery.images[0]) content.push({type: "image", mimeType: "image/png", data: gallery.images[0].src.split(",")[1]});
      return {...response, content, _meta: galleryMeta(gallery)};
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "blender_render_scene",
  {
    _meta: viewerToolMeta,
    title: "Render authored Blender scene",
    description: "Preflight or render a .blend using its authored cameras, lights, world, volumes and color management. Use for interiors, cinematic lighting and final beauty images; use render_evidence for standardized geometry views. Never saves the source. Output directory must be new or empty. Returns first rendered PNG inline.",
    inputSchema: z.object({
      assetPath: z.string(), outputDir: z.string(),
      inspectOnly: z.boolean().default(false).describe("List cameras, lights, volumes, missing image/library dependencies and settings without rendering."),
      scene: z.string().optional(),
      cameras: z.array(z.string()).max(6).default([]).describe("Exact existing camera names; omitted uses active camera. At most 12 camera/frame combinations."),
      frames: z.array(z.number().int().min(-1_048_574).max(1_048_574)).max(12).default([]),
      maxEdge: z.number().int().min(128).max(4096).default(1280),
      samples: z.number().int().min(1).max(4096).default(64).describe("Cycles sample cap; does not raise authored samples."),
      device: z.enum(["auto", "cpu", "OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"]).default("auto"),
      denoise: z.enum(["preserve", "preview", "final", "off"]).default("preserve").describe("Cycles denoising policy. Preview favors GPU speed; final favors OIDN quality. Preserve leaves authored settings; off disables render denoising only. Compositor denoising remains authored."),
      timeLimitSeconds: z.number().int().min(1).max(1800).default(120).describe("Per-render Cycles time limit; whole process also bounded by timeoutMs."),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1000).max(1_800_000).default(600_000),
    }),
  },
  async ({assetPath, outputDir, inspectOnly, scene, cameras, frames, maxEdge, samples, device, denoise, timeLimitSeconds, blenderPath, timeoutMs}) => {
    try {
      if (Math.max(1, cameras.length) * Math.max(1, frames.length) > 12) {
        throw new Error("At most 12 camera/frame combinations are allowed");
      }
      const resolvedOutput = resolve(outputDir);
      const args = ["--input", resolve(assetPath), "--output-dir", resolvedOutput,
        "--max-edge", String(maxEdge), "--samples", String(samples), "--device", device, "--denoise", denoise,
        "--time-limit", String(timeLimitSeconds)];
      if (inspectOnly) args.push("--inspect-only");
      if (scene) args.push(`--scene=${scene}`);
      for (const camera of cameras) args.push(`--camera=${camera}`);
      if (frames.length) args.push("--frames", ...frames.map(String));
      const process = await runBlender({blenderPath, scriptPath: authoredRenderer, scriptArgs: args, timeoutMs});
      // Do not return a manifest left by an older invocation after a failure.
      const manifest = process.exitCode === 0 && !process.timedOut
        ? await readJsonFile(join(resolvedOutput, "render-manifest.json")) as Record<string, any>
        : null;
      const response = result({process, outputDir: resolvedOutput, manifest});
      const content: Array<any> = [...response.content];
      if (manifest?.renders?.length) {
        const png = await readFile(manifest.renders[0].path);
        if (png.length <= 10_000_000) content.push({type: "image", mimeType: "image/png", data: png.toString("base64")});
        else content.push({type: "text", text: `PNG exceeds the 10 MB inline limit; open the rendered image at ${manifest.renders[0].path}`});
      }
      const gallery = manifest ? await makeGallery(inspectOnly ? "Scene details" : "Scene render", resolvedOutput,
        (manifest.renders ?? []).map((r:any)=>({path:r.path,label:`${r.camera} · Frame ${r.frame}`})),
        [["Engine", manifest.preflight?.engine ?? "Unknown"],
         ["Size", manifest.effective?.resolution?.join(" × ") ?? manifest.preflight?.resolution?.slice(0,2).join(" × ") ?? "Unknown"],
         ["Samples", String(manifest.effective?.samples ?? "Authored")],
         ["Denoising", manifest.denoise?.effectivePolicy ?? "Authored"],
         ["Device", manifest.device?.effective ?? "Not selected"]], inspectOnly ? "Preflight" : "Ready") : null;
      return {...response, content, ...(gallery ? {_meta: galleryMeta(gallery)} : {}), isError: process.exitCode !== 0 || process.timedOut};
    } catch (error) { return errorResult(error); }
  },
);

server.registerTool("blender_search_polyhaven_assets", {
  title: "Search Poly Haven assets",
  description: "Search high-quality CC0 PBR textures or HDRIs by words such as linen, oak or morning. Powered by Poly Haven. Returns asset IDs for the bounded download tool; no files are downloaded by search.",
  inputSchema: z.object({query: z.string().trim().min(1).max(120), assetType: z.enum(["textures", "hdris"]).default("textures"), limit: z.number().int().min(1).max(20).default(8)}),
}, async ({query, assetType, limit}) => {
  try {return result(await polyHaven.search(query, assetType, limit));} catch(error) {return errorResult(error);}
});

server.registerTool("blender_download_polyhaven_asset", {
  title: "Download Poly Haven texture or HDRI",
  description: "Download a selected CC0 texture map set or HDRI at an explicit resolution into a new/empty directory. Powered by Poly Haven. Verifies upstream checksums and records local paths, source, license, map color spaces and SHA-256 hashes. Does not download models or execute files.",
  inputSchema: z.object({
    assetId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,127}$/), assetType: z.enum(["textures", "hdris"]).default("textures"),
    resolution: z.enum(["1k", "2k", "4k", "8k"]).default("4k"),
    maps: z.array(z.enum(["diffuse", "roughness", "normal", "displacement", "metallic", "ao"])).min(1).max(6).default(["diffuse", "roughness", "normal"]),
    outputDir: z.string(), maxBytes: z.number().int().min(1_000_000).max(1_024_000_000).default(512_000_000),
  }),
}, async (options) => {
  try {return result(await polyHaven.download(options));} catch(error) {return errorResult(error);}
});

server.registerTool("blender_inspect_motion", {
  title: "Inspect evaluated motion and bake evidence",
  description: "Read-only samples of 1-8 named meshes at 2-12 increasing frames. Reports evaluated local geometry hashes, transforms and native bake metadata. Does not bake, measure physical correctness or judge animation quality. Writes a new JSON file; no Rust runtime required.",
  inputSchema: z.object({
    assetPath: z.string(), outputJson: z.string().describe("New JSON path in an existing directory."),
    frames: z.array(z.number().int().min(-1_048_574).max(1_048_574)).min(2).max(12),
    objectNames: z.array(z.string().min(1).max(1024)).min(1).max(8),
    blenderPath: z.string().optional(),
    timeoutMs: z.number().int().min(1000).max(300_000).default(60_000),
  }),
}, async ({assetPath, outputJson, frames, objectNames, blenderPath, timeoutMs}) => {
  try {
    if(frames.some((frame,i)=>i>0 && frame<=frames[i-1])) throw new Error("frames must be distinct and increasing");
    if(new Set(objectNames).size!==objectNames.length) throw new Error("objectNames must be distinct");
    const output=resolve(outputJson);
    if(existsSync(output)) throw new Error("outputJson must be a new file");
    const process=await runBlender({blenderPath,timeoutMs,
      scriptPath:join(validationScripts,"inspect_motion.py"),
      scriptArgs:["--input",resolve(assetPath),"--output",output,"--frames",frames.join(","),"--targets",...objectNames]});
    if(process.exitCode!==0 || process.timedOut) return {...result({process,report:null}),isError:true};
    return result({report:await readJsonFile(output),outputJson:output});
  } catch(error) {return errorResult(error);}
});

const sceneSchema = z.object({
  frame: z.number().int().min(-1_048_574).max(1_048_574).optional().describe("Evaluate this frame without saving the source; omitted uses its saved frame. Does not bake simulations. Use the same explicit frame for repair evidence."),
  assetPath: z.string(), outputJson: z.string().optional().describe("Optional new JSON file for full SceneIR and analysis. Parent directory must exist."),
  objectId: z.string().optional().describe("Exact object ID from describe_scene; omit for whole active scene."),
  includeDescendants: z.boolean().default(true),
  offset: z.number().int().min(0).max(2048).default(0),
  limit: z.number().int().min(1).max(200).default(40),
  proximity: z.number().min(0).max(1e9).default(0.01).describe("World-unit AABB proximity threshold; not surface distance."),
  groundZ: z.number().min(-1e12).max(1e12).optional(),
  groundObjects: z.array(z.string()).max(200).default([]).describe("Only explicitly named objects are checked against groundZ."),
  contactPairs: z.array(z.array(z.string()).length(2)).max(200).default([]).describe("Exact mesh-object pairs intended to touch according to the brief. Detects definite AABB gaps; overlapping bounds do not prove surface contact. Covers full selection."),
  connectionPoints: z.array(z.object({
    name: z.string().min(1).max(256), objectA: z.string(), pointA: z.array(z.number().min(-1e9).max(1e9)).length(3),
    objectB: z.string(), pointB: z.array(z.number().min(-1e9).max(1e9)).length(3),
    maxDistance: z.number().min(0).max(1e9),
  })).max(100).default([]).describe("Known construction anchors, in each object's local coordinates, that must meet within maxDistance world units. Named empties are supported. Reports gap and world-space B-minus-A correction; this does not prove surface contact. Preserve anchors across repairs; do not move markers independently to pass."),
  tolerance: z.number().min(0).max(1e9).default(0.001),
  triangleBudget: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  requireClosedMesh: z.boolean().default(false),
  blenderPath: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(1_800_000).default(300_000),
});

for (const name of ["blender_describe_scene", "blender_quality_report"] as const) {
  server.registerTool(name, {
    title: name === "blender_describe_scene" ? "Describe Blender scene" : "Blender quality report",
    description: name === "blender_describe_scene"
      ? "Extract SceneIR and analyze with the Rust runtime. Returns compact evaluated bounds, authored roles, hierarchy and paginated AABB relation candidates. Read-only; requires setup:runtime."
      : "Evaluate explicit triangle, closed-mesh, named ground and intended contact constraints with the Rust runtime. Returns measurable findings and required visual-review questions, never an aesthetic score. Constraints cover the full selected assembly, independent of pagination. Read-only; requires setup:runtime.",
    inputSchema: sceneSchema,
  }, async ({ assetPath, outputJson, blenderPath, timeoutMs, frame, objectId, includeDescendants, offset, limit, proximity, groundZ, groundObjects, contactPairs, connectionPoints, tolerance, triangleBudget, requireClosedMesh }) => {
    try {
      if (groundObjects.length && groundZ === undefined) throw new Error("groundObjects requires explicit groundZ");
      return result(await describeAsset({ assetPath, outputJson, blenderPath, timeoutMs, frame,
        options: { object_id: objectId, include_descendants: includeDescendants, offset, limit, proximity,
          ground_z: groundZ, ground_objects: groundObjects, contact_pairs: contactPairs, connection_points: connectionPoints.map(c=>({name:c.name,object_a:c.objectA,point_a:c.pointA,object_b:c.objectB,point_b:c.pointB,max_distance:c.maxDistance})), tolerance, triangle_budget: triangleBudget, require_closed_mesh: requireClosedMesh } }));
    } catch (error) { return errorResult(error); }
  });
}

server.registerTool("blender_compare_scenes", {
  title: "Compare Blender scenes",
  description: "Extract two SceneIR snapshots and report deterministic structural changes plus only explicitly requested regression constraints. Use after a repair with baseline and candidate assets. This does not measure aesthetic improvement, semantic correctness, exact contact, materials or lighting. Read-only; requires setup:runtime.",
  inputSchema: z.object({
    baselineAssetPath: z.string().describe("Preserved candidate or other baseline asset."),
    frame: z.number().int().min(-1_048_574).max(1_048_574).optional().describe("Evaluate both assets at this same frame; differing saved frames or unit scales are rejected. Does not bake simulations."),
    candidateAssetPath: z.string().describe("Regenerated repair or comparison asset."),
    outputJson: z.string().optional().describe("Optional new JSON file containing both SceneIR snapshots and the diff. Parent directory must exist."),
    requiredObjects: z.array(z.string()).max(2048).default([]).describe("Objects that must exist in the candidate. Names absent from both scenes are rejected as likely mistakes."),
    invariantObjects: z.array(z.string()).max(2048).default([]).describe("Objects to which parenting, role, movement, dimension and topology preservation gates apply. Empty means every matched object."),
    forbidRemovedObjects: z.boolean().default(false),
    preserveParenting: z.boolean().default(false),
    preserveSemanticRoles: z.boolean().default(false),
    maxTriangleIncrease: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().describe("Maximum allowed increase across the complete scene."),
    maxCenterShift: z.number().min(0).max(1e9).optional().describe("Maximum world-unit center movement for each invariant object."),
    maxDimensionChange: z.number().min(0).max(1e9).optional().describe("Maximum absolute world-unit dimension change on any axis for each invariant object."),
    forbidNewTopologyFindings: z.boolean().default(false).describe("Fail increases in disconnected components, non-manifold edges, degenerate faces or missing-material faces on invariant objects."),
    tolerance: z.number().min(0).max(1e9).default(1e-6).describe("Ignore smaller transform, center and dimension changes in the factual diff."),
    blenderPath: z.string().optional(),
    timeoutMs: z.number().int().min(1000).max(1_800_000).default(300_000),
  }),
}, async ({baselineAssetPath, candidateAssetPath, outputJson, frame, requiredObjects, invariantObjects,
  forbidRemovedObjects, preserveParenting, preserveSemanticRoles, maxTriangleIncrease,
  maxCenterShift, maxDimensionChange, forbidNewTopologyFindings, tolerance, blenderPath, timeoutMs}) => {
  try {
    return result(await compareAssets({baselineAssetPath, candidateAssetPath, outputJson, blenderPath, timeoutMs, frame,
      options: {required_objects: requiredObjects, invariant_objects: invariantObjects,
        forbid_removed_objects: forbidRemovedObjects, preserve_parenting: preserveParenting,
        preserve_semantic_roles: preserveSemanticRoles, max_triangle_increase: maxTriangleIncrease,
        max_center_shift: maxCenterShift, max_dimension_change: maxDimensionChange,
        forbid_new_topology_findings: forbidNewTopologyFindings, tolerance}}));
  } catch (error) { return errorResult(error); }
});

await server.connect(new StdioServerTransport());
