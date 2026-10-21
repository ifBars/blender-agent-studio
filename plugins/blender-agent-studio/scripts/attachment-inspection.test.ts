import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assessAttachmentEvidence, compareAttachmentReports, inspectAttachments, validateAttachmentRequest, type AttachmentRequest } from "./attachment-inspection.ts";
import { runBlender } from "./blender-process.ts";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const request: AttachmentRequest = {
  assetPath: "asset.blend", outputJson: "evidence.json", frames: [1, 13],
  anchors: [{ id: "leg", objectName: "Leg", vertexIndices: [2] }, { id: "sock", objectName: "Sock", vertexIndices: [2] }],
  connections: [{ name: "ankle", anchorA: "leg", anchorB: "sock", maxDistance: 0.02 }],
  timeoutMs: 60_000,
};

test("attachment contract rejects ambiguous, empty and self-fulfilling checks", () => {
  expect(validateAttachmentRequest(request)).toEqual(request);
  for (const change of [
    { frames: [13, 1] }, { frames: [1, 1] }, { connections: [] },
    { anchors: [request.anchors[0], request.anchors[0]] },
    { anchors: [{ ...request.anchors[0], vertexGroup: "group" }, request.anchors[1]] },
    { anchors: [{ ...request.anchors[0], vertexIndices: [2, 2] }, request.anchors[1]] },
    { connections: [{ ...request.connections[0], anchorB: "leg" }] },
    { connections: [{ ...request.connections[0], anchorB: "missing" }] },
  ]) expect(() => validateAttachmentRequest({ ...request, ...change })).toThrow();
});

test("missing sampled evidence cannot report success", async () => {
  await expect(assessAttachmentEvidence({ scenes: [] }, request)).rejects.toThrow();
});

test("connected anchor aliases cannot measure the same patch against itself", () => {
  for (const selectors of [
    [{ vertexIndices: [2, 3] }, { vertexIndices: [3, 2] }],
    [{ vertexGroup: "seam" }, { vertexGroup: "seam" }],
  ]) {
    const anchors = selectors.map((selector, i) => ({ id: i ? "sock" : "leg", objectName: "Leg", ...selector }));
    expect(() => validateAttachmentRequest({ ...request, anchors })).toThrow("same surface patch");
  }
  // Distinct patches on a continuous mesh remain useful for seam checks.
  expect(validateAttachmentRequest({ ...request, anchors: [
    request.anchors[0], { ...request.anchors[1], objectName: "Leg", vertexIndices: [3] },
  ] }).anchors).toHaveLength(2);
});

test("saved evidence rejects resolved patch aliases, including legacy binding hashes", async () => {
  for (const legacy of [false, true]) {
    const evidence = {
      schema_version: "bas-surface-motion/0.1", source_sha256: "a".repeat(64),
      scenes: [{ frame: 1 }, { frame: 13 }],
      bindings: request.anchors.map((a, i) => ({
        id: `bas:surface:${a.id}`,
        object_name: "Leg",
        binding_sha256: (legacy || i === 0 ? "b" : "c").repeat(64),
        ...(legacy ? {} : { surface_weights: [[0, 1 / 6 + i * 1e-8], [1, 1 / 3], [2, 1 / 2 - i * 1e-8]] }),
      })),
    };
    await expect(assessAttachmentEvidence(evidence, request)).rejects.toThrow("same surface patch");
  }
});

test("maximum resolved patches fit in reusable baseline evidence", async () => {
  const indices = Array.from({ length: 4096 }, (_, i) => 499_999 - 4095 + i);
  const anchors = Array.from({ length: 32 }, (_, i) => ({ id: `a${i}`, objectName: `Mesh${i}`, vertexIndices: indices }));
  const args = validateAttachmentRequest({ ...request, anchors, connections: [
    { name: "seam", anchorA: "a0", anchorB: "a1", maxDistance: 0.02 },
  ] });
  const weights = indices.map((index, i) => [index, (i + 1) / (4096 * 4097 / 2)]);
  const evidence = {
    schema_version: "bas-surface-motion/0.1", source_sha256: "a".repeat(64),
    bindings: anchors.map((a, i) => ({
      id: `bas:surface:${a.id}`, object_name: a.objectName, selector: a, vertex_count: weights.length,
      binding_sha256: i.toString(16).padStart(64, "0"), topology_sha256: "b".repeat(64), surface_weights: weights,
    })),
    scenes: args.frames.map(frame => ({
      schema_version: "bas-scene-ir/0.1", source: "asset.blend", blender_version: "5.2.2", frame,
      meters_per_unit: 1, limitations: [],
      objects: anchors.map(a => ({ id: `bas:surface:${a.id}`, kind: "SURFACE_ANCHOR", parent: null,
        semantic_role: "bas:evaluated_surface_anchor", bounds: null, mesh: null,
        world_matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
      })),
    })),
  };
  const report = await assessAttachmentEvidence(evidence, args);
  expect(report.status).toBe("review_required");
  expect(Buffer.byteLength(JSON.stringify({ request: args, evidence, report, comparison: null }, null, 2)))
    .toBeLessThan(16 * 1024 * 1024);
});

const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
test.skipIf(!blender)("live armature attachment drift is detected and repaired with unchanged object transforms", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bas-attachment-test-"));
  try {
    const script = join(dir, "fixture.py");
    await writeFile(script, `
import bpy, sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.read_factory_settings(use_empty=True)
rigdata=bpy.data.armatures.new("Rig")
rig=bpy.data.objects.new("Rig",rigdata)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bone=rigdata.edit_bones.new("shin")
bone.head=(0,0,0)
bone.tail=(0,0,1)
bpy.ops.object.mode_set(mode='OBJECT')
meshes=[]
for name in ["Leg","Sock"]:
    data=bpy.data.meshes.new(name)
    data.from_pydata([(-.1,0,0),(.1,0,0),(.1,0,1),(-.1,0,1)],[],[(0,1,2,3)])
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    vg=obj.vertex_groups.new(name="shin")
    vg.add([0,1,2,3],1.0,'REPLACE')
    obj.vertex_groups.new(name="inspection_alias").add([0,1,2,3],0.5,'REPLACE')
    obj.vertex_groups.new(name="inspection_distinct").add([2,3],1.0,'REPLACE')
    for label, values in [("weighted", [.3,.6,.9]), ("scaled", [.1,.2,.3]), ("different", [.1,.2,.4])]:
        group=obj.vertex_groups.new(name=label)
        for index,weight in enumerate(values):
            group.add([index],weight,'REPLACE')
    if name=="Leg":
        mod=obj.modifiers.new("Skin","ARMATURE")
        mod.object=rig
    meshes.append(obj)
pose=rig.pose.bones["shin"]
pose.rotation_mode='XYZ'
for frame,angle in [(1,0),(13,0.8)]:
    pose.rotation_euler.x=angle
    pose.keyframe_insert(data_path='rotation_euler',frame=frame)
bpy.context.scene.frame_set(1)
bpy.context.scene.frame_end=13
bpy.ops.wm.save_as_mainfile(filepath=str(out/"before.blend"))
mod=meshes[1].modifiers.new("Skin","ARMATURE")
mod.object=rig
bpy.ops.wm.save_as_mainfile(filepath=str(out/"after.blend"))
bpy.ops.export_scene.gltf(filepath=str(out/"after.glb"),export_animations=True)
mod=meshes[1].modifiers.new("UnsafeTopology","SUBSURF")
bpy.ops.wm.save_as_mainfile(filepath=str(out/"unsupported.blend"))
`);
    const built = await runBlender({ blenderPath: blender!, scriptPath: script, scriptArgs: [dir] });
    expect(built.exitCode, built.stderr + built.stdout).toBe(0);
    const asset = join(dir, "before.blend");
    const hash = async () => createHash("sha256").update(await readFile(asset)).digest("hex");
    const originalHash = await hash();
    const inspect = (file: string, output: string) => inspectAttachments({
      ...request, assetPath: join(dir, file), outputJson: join(dir, output), blenderPath: blender!,
    });
    const before = (await inspect("before.blend", "before.json")).report;
    expect(before.status).toBe("constraints_failed");
    expect(before.samples[0].checks[0].distance).toBeLessThan(1e-7);
    expect(before.connections[0].failingFrames).toEqual([13]);
    expect(before.connections[0].maximumDistance).toBeGreaterThan(0.7);
    // Different group names and proportional weights still resolve to the same patch.
    for (const selector of [{ vertexGroup: "inspection_alias" }, { vertexIndices: [3, 2, 1, 0] }]) {
      await expect(inspectAttachments({
        ...request, assetPath: asset, outputJson: join(dir, "aliased.json"), blenderPath: blender!,
        anchors: [
          { id: "leg", objectName: "Leg", vertexGroup: "shin" },
          { id: "sock", objectName: "Leg", ...selector },
        ],
      })).rejects.toThrow("same surface patch");
    }
    const distinct = await inspectAttachments({
      ...request, assetPath: asset, outputJson: join(dir, "distinct.json"), blenderPath: blender!,
      anchors: [
        { id: "leg", objectName: "Leg", vertexGroup: "shin" },
        { id: "sock", objectName: "Leg", vertexGroup: "inspection_distinct" },
      ],
    });
    expect(distinct.report.connections[0].maximumDistance).toBeGreaterThan(0.4);
    const weightedRequest = {
      ...request, assetPath: asset, blenderPath: blender!,
      anchors: [
        { id: "leg", objectName: "Leg", vertexGroup: "weighted" },
        { id: "sock", objectName: "Leg", vertexGroup: "scaled" },
      ],
    };
    await expect(inspectAttachments({ ...weightedRequest, outputJson: join(dir, "scaled.json") }))
      .rejects.toThrow("same surface patch");
    const differentWeights = await inspectAttachments({
      ...weightedRequest, outputJson: join(dir, "different-weights.json"),
      anchors: [weightedRequest.anchors[0], { ...weightedRequest.anchors[1], vertexGroup: "different" }],
    });
    expect(differentWeights.report.connections[0].maximumDistance).toBeGreaterThan(0.05);
    const after = (await inspect("after.blend", "after.json")).report;
    expect(after.status).toBe("review_required"); // never an aesthetic pass
    expect(after.connections[0].maximumDistance).toBeLessThan(1e-7);
    expect(after.anchorMotion.every(a => a.maximumDisplacementFromFirstFrame > 0.7)).toBe(true);
    expect(compareAttachmentReports(before, after).status).toBe("selected_constraints_improved");
    expect(compareAttachmentReports(after, before).status).toBe("constraints_regressed");
    // Pre-alias-check baselines keep their original binding hash and remain usable.
    const legacy = JSON.parse(await readFile(join(dir, "before.json"), "utf8"));
    for (const binding of legacy.evidence.bindings) delete binding.surface_weights;
    await writeFile(join(dir, "legacy.json"), JSON.stringify(legacy));
    const legacyComparison = await inspectAttachments({
      ...request, assetPath: join(dir, "after.blend"), outputJson: join(dir, "legacy-repair.json"),
      baselineJson: join(dir, "legacy.json"), blenderPath: blender!,
    });
    expect(legacyComparison.comparison?.status).toBe("selected_constraints_improved");
    expect(compareAttachmentReports(before, { ...after, bindings: after.bindings.map((b: any) => ({ ...b, binding_sha256: "different" })) }).status).toBe("rebind_review_required");
    await expect(inspectAttachments({
      ...request, assetPath: asset, outputJson: join(dir, "changed-contract.json"), baselineJson: join(dir, "before.json"),
      connections: [{ ...request.connections[0], maxDistance: 999 }],
    })).rejects.toThrow("Baseline connections differ");
    // Use exported bone-weight groups rather than assuming native vertex order.
    const imported = await inspectAttachments({
      ...request, assetPath: join(dir, "after.glb"), outputJson: join(dir, "imported.json"), blenderPath: blender!,
      anchors: request.anchors.map(a => ({ id: a.id, objectName: a.objectName, vertexGroup: "shin" })),
    });
    expect(imported.report.connections[0].maximumDistance).toBeLessThan(1e-6);
    expect(imported.report.anchorMotion.every(a => a.maximumDisplacementFromFirstFrame > 0.3)).toBe(true);
    expect(await hash()).toBe(originalHash);
    await expect(inspect("before.blend", "before.json")).rejects.toThrow("new file");
    await expect(inspect("unsupported.blend", "unsupported.json")).rejects.toThrow("Unsupported modifier");
    await expect(inspectAttachments({
      ...request, assetPath: asset, outputJson: join(dir, "missing.json"), blenderPath: blender!,
      anchors: [{ id: "leg", objectName: "Leg", vertexGroup: "absent" }, request.anchors[1]],
    })).rejects.toThrow("Missing vertex group");
    const client = new Client({ name: "attachment-test", version: "1" }, { capabilities: {} });
    try {
      const root = resolve(import.meta.dir, "..");
      await client.connect(new StdioClientTransport({ command: "bun", args: [join(root, "mcp/server.ts")], cwd: root, stderr: "pipe" }));
      const reply = await client.callTool({ name: "blender_inspect_attachments", arguments: {
        ...request, assetPath: join(dir, "after.blend"), outputJson: join(dir, "mcp.json"), blenderPath: blender,
        baselineJson: join(dir, "before.json"),
      } });
      expect(reply.isError, JSON.stringify(reply)).not.toBe(true);
      expect((reply.structuredContent as any).comparison.status).toBe("selected_constraints_improved");
      expect((reply.structuredContent as any).comparison.changes[0].repairedFrames).toEqual([13]);
    } finally { await client.close(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 180_000);
