import {readFile, realpath, stat} from 'node:fs/promises';
import {basename, join, relative, isAbsolute} from 'node:path';
import {registerAppResource, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import type {McpServer} from '@modelcontextprotocol/server';
import {z} from 'zod';
export const VIEWER_URI = 'ui://blender-agent-studio/render-viewer.html';
export const viewerToolMeta = {ui: {resourceUri: VIEWER_URI}};
export type Gallery = {title:string; status:string; images:Array<{label:string; src:string}>; details:Array<[string,string]>; notice:string};
let html: Promise<string> | undefined;
export function viewerHtml() {
  return html ??= (async()=> {
    const built=await Bun.build({entrypoints:[join(import.meta.dir,'ui/viewer.ts')],target:'browser',minify:true});
    if(!built.success) throw new Error('Could not bundle render viewer');
    const script=(await built.outputs[0].text()).replaceAll('</script','<\\/script');
    return (await readFile(join(import.meta.dir,'ui/viewer.html'),'utf8')).replace('/*VIEWER_SCRIPT*/',()=>script);
  })();
}
export function registerViewer(server:McpServer) {
 server.registerTool('blender_get_preview', {
  title:'Load a completed Blender preview',
  description:'Reload the bounded PNG gallery from a completed Blender output manifest. Does not render or modify files.',
  inputSchema:z.object({outputDir:z.string().min(1)}),
  annotations:{readOnlyHint:true,openWorldHint:false},
  _meta:{ui:{resourceUri:VIEWER_URI,visibility:['app']}},
 },async ({outputDir})=>{
  try {
   const gallery=await loadGallery(outputDir);
   // App-only responses are not added to model context. Keep the pixels in
   // structuredContent so hosts that drop _meta and image blocks can reload.
   return {content:[],structuredContent:{gallery}};
  }catch{
   return {isError:true,content:[{type:'text',text:'Preview files are unavailable. Render again to create a new preview.'}]};
  }
 });
 registerAppResource(server,'Blender render viewer',VIEWER_URI,{mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{
  uri:VIEWER_URI,mimeType:RESOURCE_MIME_TYPE,text:await viewerHtml(),
  _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}}},
 }]}));
}
// Only completed tool outputs inside this invocation's directory are eligible.
export async function makeGallery(title:string,outputDir:string,candidates:Array<{path:string;label:string}>,details:Array<[string,string]>=[],status='Ready'):Promise<Gallery> {
 const images:Gallery['images']=[];let used=0,omitted=0;
 const root=await realpath(outputDir);
 for(const candidate of candidates.slice(0,12)) {
  try {
   const path=await realpath(candidate.path), rel=relative(root,path);
   if(isAbsolute(rel)||rel==='..'||rel.startsWith('..\\')||rel.startsWith('../'))throw Error('Outside output');
   const info=await stat(path);
   if(!info.isFile()||info.size>10_000_000-used)throw Error('Preview budget');
   const data=await readFile(path);
   if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG');
   used+=data.length;images.push({label:candidate.label||basename(path),src:'data:image/png;base64,'+data.toString('base64')});
  }catch{omitted++;}
 }
 omitted+=Math.max(0,candidates.length-12);
 return {title,status,images,details,notice:omitted?`${omitted} image(s) unavailable in this viewer. Full files remain in the output directory.`:''};
}
export const galleryMeta=(gallery:Gallery)=>({'blender/viewer':gallery});

export function withPreview<T extends {content:any[];structuredContent:Record<string,unknown>}>(response:T,gallery:Gallery,outputDir:string) {
 const preview={outputDir};
 return {...response,structuredContent:{...response.structuredContent,preview},
  content:[...response.content,{type:'text' as const,text:JSON.stringify({preview})}],
  _meta:galleryMeta(gallery)};
}

// Read only known render manifests and PNGs contained in their output folder.
// The original files are the durable backing store; no in-memory token expires
// when the MCP process restarts or the conversation is reopened.
export async function loadGallery(outputDir:string):Promise<Gallery> {
 const root=await realpath(outputDir);
 for(const name of ['render-manifest.json','evidence.json','comparison.json','timelapse.json']) {
  let path:string;
  try {path=await realpath(join(root,name));}catch{continue;}
  if(relative(root,path)!==name || (await stat(path)).size>2_000_000)throw Error('Invalid preview manifest');
  const m=JSON.parse(await readFile(path,'utf8'));
  if(name==='render-manifest.json') {
   if(!['complete','preflight'].includes(m.status)||!Array.isArray(m.renders))throw Error('Incomplete render');
   return makeGallery(m.status==='preflight'?'Scene details':'Scene render',root,
    m.renders.map((r:any)=>({path:r.path,label:`${r.camera} · Frame ${r.frame}`})),
    [['Engine',m.preflight?.engine??'Unknown'],['Size',m.effective?.resolution?.join(' × ')??m.preflight?.resolution?.slice(0,2).join(' × ')??'Unknown'],
     ['Samples',String(m.effective?.samples??'Authored')],['Denoising',m.denoise?.effectivePolicy??'Authored'],['Device',m.device?.effective??'Not selected']],
    m.status==='preflight'?'Preflight':'Ready');
  }
  if(name==='evidence.json') {
   if(!Array.isArray(m.views))throw Error('Invalid evidence');
   return makeGallery('Model views',root,[...(m.contact_sheet?[{path:m.contact_sheet,label:'All views'}]:[]),
    ...m.views.map((path:string,i:number)=>({path,label:m.requested_views?.[i]??`View ${i+1}`}))],
    [['Scope',m.evidence_scope??'Evidence'],['Lighting',m.requested_presentation??'Studio']]);
  }
  if(name==='comparison.json') {
   if(m.scope!=='projected_geometry_reference_comparison')throw Error('Invalid comparison');
   return makeGallery('Reference comparison',root,[{path:join(root,'comparison.png'),label:'Reference / model / overlay'},{path:join(root,'overlay.png'),label:'Overlay'}],
    [['Purpose','Projected geometry comparison'],['Similarity',m.mask?'See mask metrics in tool result':'Visual comparison; no mask score']]);
  }
  if(m.status!=='complete'||!Array.isArray(m.checkpoints))throw Error('Incomplete timelapse');
  return makeGallery('Modeling progress',root,m.checkpoints.map((s:any)=>({path:s.path,label:s.label})),
   [['Video',m.videoPath],['Duration',`${m.durationSeconds}s`],['Capture','Actual build checkpoints']]);
 }
 throw Error('No completed preview manifest');
}
