import {test,expect} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeGallery,viewerHtml,VIEWER_URI,withPreview,loadGallery} from './viewer';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {galleryFromResult,restoreGallery,previewDirectory} from './ui/result';

test('reopened results reload all views without metadata or inline images',async()=>{
 const gallery={title:'Scene render',status:'Ready',images:[{label:'Front',src:'data:image/png;base64,iVBORw0KGgo='},{label:'Rear',src:'data:image/png;base64,iVBORw0KGgo='}],details:[['Engine','CYCLES']] as Array<[string,string]>,notice:''};
 const response=withPreview({content:[],structuredContent:{manifest:{status:'complete'}}},gallery,'render-output');
 expect(JSON.stringify(response.structuredContent)).not.toContain('base64');
 let calls=0;
 const call=async (outputDir:string)=>{calls++;expect(outputDir).toBe('render-output');return {structuredContent:{gallery}};};
 expect(await restoreGallery({structuredContent:response.structuredContent},undefined,call)).toEqual(gallery);
 expect(await restoreGallery({content:response.content},undefined,call)).toEqual(gallery);
 // Old saved results have no preview field; the original outputDir/input works.
 expect(await restoreGallery({content:[{type:'text',text:JSON.stringify({outputDir:'render-output'})}]},undefined,call)).toEqual(gallery);
 expect(await restoreGallery({}, {outputDir:'render-output'},call)).toEqual(gallery);
 expect(calls).toBe(4);
 expect(await restoreGallery(response,undefined,call)).toEqual(gallery);
 expect(calls).toBe(4);
 expect(previewDirectory({content:[null,{type:'text',text:'not JSON'}]})).toBeUndefined();
 await expect(restoreGallery({isError:true},{outputDir:'render-output'},call)).rejects.toThrow('Render failed');
 expect(calls).toBe(4);
 await expect(restoreGallery({structuredContent:response.structuredContent},undefined,async()=>({isError:true}))).rejects.toThrow('Preview unavailable');
 const inline={content:[{type:'image',mimeType:'image/png',data:'iVBORw0KGgo='}],structuredContent:response.structuredContent};
 expect((await restoreGallery(inline,undefined,async()=>{throw Error('Older host');}))?.images).toHaveLength(1);
});

test('a fresh MCP process reloads saved previews through an app-only tool',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bas-preview-reopen-'));
 const client=new Client({name:'preview-reopen',version:'1'});
 try {
  await writeFile(join(root,'front.png'),Buffer.from('89504e470d0a1a0a','hex'));
  await writeFile(join(root,'rear.png'),Buffer.from('89504e470d0a1a0a','hex'));
  await writeFile(join(root,'render-manifest.json'),JSON.stringify({status:'complete',preflight:{engine:'CYCLES'},renders:[
   {path:join(root,'front.png'),camera:'Front',frame:1},{path:join(root,'rear.png'),camera:'Rear',frame:1},
  ]}));
  await client.connect(new StdioClientTransport({command:'bun',args:[join(import.meta.dir,'server.ts')],stderr:'pipe'}));
  const tool=(await client.listTools()).tools.find(t=>t.name==='blender_get_preview');
  expect(tool?._meta).toMatchObject({ui:{resourceUri:VIEWER_URI,visibility:['app']}});
  const result=await client.callTool({name:'blender_get_preview',arguments:{outputDir:root}});
  expect(result.isError).not.toBe(true);
  const gallery=galleryFromResult(result);
  expect(gallery?.images.map(i=>i.label)).toEqual(['Front · Frame 1','Rear · Frame 1']);
  expect(gallery?.details).toContainEqual(['Engine','CYCLES']);
  await writeFile(join(root,'render-manifest.json'),JSON.stringify({status:'failed',renders:[]}));
  expect((await client.callTool({name:'blender_get_preview',arguments:{outputDir:root}})).isError).toBe(true);
  await writeFile(join(root,'render-manifest.json'),JSON.stringify({status:'preflight',renders:[],preflight:{engine:'CYCLES'}}));
  expect(await loadGallery(root)).toMatchObject({status:'Preflight',images:[]});
 }finally{await client.close();await rm(root,{recursive:true,force:true});}
},15000);

test('viewer displays standard image content when host omits custom metadata',()=>{
 const content=[{type:'text',text:'render complete'},{type:'image',mimeType:'image/png',data:'iVBORw0KGgo='}];
 expect(galleryFromResult({content})?.images[0].src).toBe('data:image/png;base64,iVBORw0KGgo=');
 expect(galleryFromResult({_meta:{'blender/viewer':{}},content})?.images).toHaveLength(1);
 const gallery={title:'Comparison',status:'Ready',images:[],details:[],notice:''};
 expect(galleryFromResult({_meta:{'blender/viewer':gallery},content})).toBe(gallery);
 expect(galleryFromResult({content:[{type:'image',mimeType:'image/svg+xml',data:'javascript:alert(1)'}]})).toBeUndefined();
 expect(galleryFromResult({content:[]})).toBeUndefined();
});
test('viewer resource is discoverable and render tools reference it',async()=>{
 const client=new Client({name:'ui-test',version:'1'});
 try {
  await client.connect(new StdioClientTransport({command:'bun',args:[join(import.meta.dir,'server.ts')],stderr:'pipe'}));
  const tools=await client.listTools();
  for(const name of ['blender_render_scene','blender_render_evidence','blender_compare_reference'])expect(tools.tools.find(t=>t.name===name)?._meta).toMatchObject({ui:{resourceUri:VIEWER_URI}});
  const resource=await client.readResource({uri:VIEWER_URI});
  expect(resource.contents[0].mimeType).toBe('text/html;profile=mcp-app');
  expect(resource.contents[0].text).toContain('Render details');
  expect(resource.contents[0].text).not.toContain('/*VIEWER_SCRIPT*/');
 }finally{await client.close();}
},15000);
test('gallery scopes image reads and caps aggregate bytes without leaking rejected paths',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bas-gallery-'));
 const png=Buffer.from('89504e470d0a1a0a','hex');
 try{
  await writeFile(join(root,'ok.png'),png);await writeFile(join(root,'bad.png'),'not png');await writeFile(join(root,'big.png'),Buffer.alloc(10_000_001));
  const result=await makeGallery('Render',root,[{path:join(root,'ok.png'),label:'Front'},{path:join(root,'bad.png'),label:'Bad'},{path:join(root,'big.png'),label:'Big'},{path:join(import.meta.dir,'server.ts'),label:'Outside'}]);
  expect(result.images).toHaveLength(1);expect(result.notice).toContain('3 image(s)');expect(JSON.stringify(result)).not.toContain('server.ts');
 }finally{await rm(root,{recursive:true,force:true});}
});
