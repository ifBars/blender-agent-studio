import {expect,test} from "bun:test";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {sourceFingerprint,preflightPinnedMcp,hostSkillConfig} from "./pinned-mcp.ts";

test("snapshot fingerprint changes for source edits but not generated build output", async()=>{
  const root=await mkdtemp(join(tmpdir(),"bas-fingerprint-"));
  try {
    await writeFile(join(root,"source.ts"),"first");
    const before=sourceFingerprint(root);
    await mkdir(join(root,"target"));await writeFile(join(root,"target","binary"),"generated");
    expect(sourceFingerprint(root)).toBe(before);
    await writeFile(join(root,"source.ts"),"second");
    expect(sourceFingerprint(root)).not.toBe(before);
  } finally {await rm(root,{recursive:true,force:true});}
});

test("preflight records the actual pinned server inventory", async()=>{
  const output=await preflightPinnedMcp(resolve(import.meta.dir,"../../.."));
  expect(output.tools).toContain("blender_describe_scene");
  expect(output.tools).toContain("blender_quality_report");
  expect(output.tools).toContain("blender_compare_scenes");
  expect(output.version?.name).toBe("blender-agent-studio");
},15000);

test("host skill exclusions cover nested system skills without mutating them", async()=>{
  const root=await mkdtemp(join(tmpdir(),"bas-host-skills-"));
  try {
    const skill=join(root,".system","example");
    await mkdir(skill,{recursive:true}); await writeFile(join(skill,"SKILL.md"),"unchanged");
    const before=sourceFingerprint(root);
    const config=hostSkillConfig([root]);
    expect(config).toContain("/example/SKILL.md");
    expect(config).toContain("enabled=false");
    expect(sourceFingerprint(root)).toBe(before);
  } finally {await rm(root,{recursive:true,force:true});}
});
