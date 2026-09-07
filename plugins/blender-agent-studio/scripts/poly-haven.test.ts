import {test, expect} from "bun:test";
import {createHash} from "node:crypto";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createPolyHavenClient} from "../skills/blender-rendering-workflow/scripts/poly-haven.ts";

const payload=Buffer.from("fixture image bytes");
const entry={url:"https://dl.polyhaven.org/file/ph-assets/fixture.jpg",size:payload.length,md5:createHash('md5').update(payload).digest('hex')};
test("search caches metadata and downloads only requested maps with verified provenance",async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bas-polyhaven-'));
  const calls:string[]=[];
  const client=createPolyHavenClient(async(url,init)=>{
    calls.push(url); expect((init?.headers as any)['User-Agent']).toContain('Blender-Agent-Studio');
    if(url.includes('/assets')) return Response.json({rough_linen:{name:'Rough Linen',tags:['cloth'],categories:['fabric']},stone:{name:'Stone'}});
    if(url.includes('/files')) return Response.json({Diffuse:{'4k':{jpg:entry}}});
    return new Response(payload);
  });
  try {
    expect((await client.search('linen','textures')).assets.map(a=>a.id)).toEqual(['rough_linen']);
    await client.search('cloth','textures');
    expect(calls.filter(u=>u.includes('/assets')).length).toBe(1);
    const result=await client.download({assetId:'rough_linen',assetType:'textures',resolution:'4k',maps:['diffuse'],outputDir:dir});
    expect(result.manifest.status).toBe('complete'); expect(result.manifest.license).toBe('CC0');
    expect(result.manifest.files[0].colorSpace).toBe('sRGB');
    expect(await readFile(result.manifest.files[0].path)).toEqual(payload);
    expect(result.manifest.files[0].sha256).toBe(createHash('sha256').update(payload).digest('hex'));
    await expect(client.download({assetId:'rough_linen',assetType:'textures',resolution:'4k',maps:['diffuse'],outputDir:dir})).rejects.toThrow('new or empty');
  } finally {await rm(dir,{recursive:true,force:true});}
});

test("rejects unavailable resolutions, unexpected hosts, oversized sets and corrupted downloads",async()=>{
  for(const mode of ['resolution','host','size','checksum']) {
    const dir=await mkdtemp(join(tmpdir(),'bas-polyhaven-fail-'));
    const altered={...entry,...(mode==='host'?{url:'https://other.invalid/fixture.jpg'}:{}),...(mode==='size'?{size:999}:{}),...(mode==='checksum'?{md5:'0'.repeat(32)}:{})};
    let downloads=0;
    const client=createPolyHavenClient(async(url)=>{
      if(url.includes('/files')) return Response.json({Diffuse:{'4k':{jpg:altered}}});
      downloads++; return new Response(payload);
    });
    try {
      await expect(client.download({assetId:'fixture',assetType:'textures',resolution:mode==='resolution'?'8k':'4k',maps:['diffuse'],outputDir:dir,maxBytes:100})).rejects.toThrow();
      expect(downloads).toBe(mode==='checksum'?1:0);
      if(mode==='checksum') expect(JSON.parse(await readFile(join(dir,'asset-manifest.json'),'utf8')).status).toBe('failed');
    } finally {await rm(dir,{recursive:true,force:true});}
  }
});
