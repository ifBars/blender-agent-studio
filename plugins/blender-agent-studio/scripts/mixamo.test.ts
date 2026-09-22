import {expect, test} from 'bun:test';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {prepareMixamoSearch} from './mixamo.ts';
import {runBlender} from './blender-process.ts';

test('Mixamo handoff encodes queries and explicitly requires browser results', () => {
  const handoff = prepareMixamoSearch(' walk & turn/#? ');
  const query = new URLSearchParams(new URL(handoff.url).hash.slice(3));
  expect(query.get('query')).toBe('walk & turn/#?');
  expect(query.get('type')).toBe('Motion,MotionPack');
  expect(handoff.status).toBe('browser_required');
  expect(() => prepareMixamoSearch('  ')).toThrow();
  expect(() => prepareMixamoSearch('a'.repeat(201))).toThrow();
});

const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which('blender');
const root = resolve(import.meta.dir, '..');
test.skipIf(!blender)('Mixamo MCP import preserves FBX motion and source, rejects overwrite and static FBX', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bas-mixamo-'));
  const client = new Client({name: 'mixamo-test', version: '1'});
  try {
    const fixture = join(dir, 'fixture.py');
    await writeFile(fixture, String.raw`
import bpy, sys
from pathlib import Path
out = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.object.armature_add()
rig = bpy.context.object
bone = rig.pose.bones[0]
for frame, height in [(1,0), (16,1), (31,0)]:
    bone.location.z = height
    bone.keyframe_insert(data_path='location', frame=frame)
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 31
bpy.ops.export_scene.fbx(filepath=str(out / 'motion.fbx'), use_selection=True, add_leaf_bones=False, bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False)
rig.animation_data_clear()
bpy.ops.export_scene.fbx(filepath=str(out / 'static.fbx'), use_selection=True, add_leaf_bones=False, bake_anim=False)
`);
    const built = await runBlender({blenderPath: blender!, scriptPath: fixture, scriptArgs: [dir], timeoutMs: 20000});
    expect(built.exitCode, built.stdout + built.stderr).toBe(0);
    await client.connect(new StdioClientTransport({command: 'bun', args: [join(root, 'mcp/server.ts')], cwd: root, stderr: 'pipe'}));
    const search = await client.callTool({name: 'blender_prepare_mixamo_search', arguments: {query: 'walking'}});
    expect(search.isError).not.toBe(true);
    expect((search.structuredContent as any).status).toBe('browser_required');
    const source = join(dir, 'motion.fbx');
    const digest = async () => createHash('sha256').update(await readFile(source)).digest('hex');
    const before = await digest();
    const args = {fbxPath: source, outputDir: join(dir, 'imported'), clipName: 'Walk', fps: 30, blenderPath: blender};
    const imported = await client.callTool({name: 'blender_import_mixamo_animation', arguments: args});
    expect(imported.isError, JSON.stringify(imported.content)).not.toBe(true);
    const report = (imported.structuredContent as any).report;
    expect(report.source_sha256).toBe(before);
    expect(await digest()).toBe(before);
    expect(report.actions[0].name).toBe('Walk');
    expect(report.armatures[0].bone_count).toBe(1);
    expect(report.frame_range[1] - report.frame_range[0]).toBeGreaterThanOrEqual(29);
    const verify = join(dir, 'verify.py');
    await writeFile(verify, `import bpy\nbpy.ops.wm.open_mainfile(filepath=${JSON.stringify(report.candidate)})\ns=bpy.context.scene\nr=next(o for o in s.objects if o.type=='ARMATURE')\ns.frame_set(s.frame_start)\na=r.pose.bones[0].matrix.translation.copy()\ns.frame_set((s.frame_start+s.frame_end)//2)\nb=r.pose.bones[0].matrix.translation.copy()\nassert (b-a).length > .1, (a,b)\nassert r.animation_data.action.name=='Walk'\n`);
    const verified = await runBlender({blenderPath: blender!, scriptPath: verify, timeoutMs: 20000});
    expect(verified.exitCode, verified.stdout + verified.stderr).toBe(0);
    const occupied = await client.callTool({name: 'blender_import_mixamo_animation', arguments: args});
    expect(occupied.isError).toBe(true);
    expect((occupied.structuredContent as any).report).toBeNull();
    const staticFile = await client.callTool({name: 'blender_import_mixamo_animation', arguments: {...args, fbxPath: join(dir, 'static.fbx'), outputDir: join(dir, 'static-output')}});
    expect(staticFile.isError).toBe(true);
    expect((staticFile.structuredContent as any).report).toBeNull();
  } finally {
    await client.close();
    await rm(dir, {recursive: true, force: true});
  }
}, 90000);
