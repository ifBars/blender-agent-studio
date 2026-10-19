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

// Keep fresh tool results and reopened previews on the same presentation path.
export function sceneGallery(outputDir:string,manifest:Record<string,any>,preflight=manifest.status==='preflight') {
 return makeGallery(preflight?'Scene details':'Scene render',outputDir,
  (manifest.renders??[]).map((render:any)=>({path:render.path,label:`${render.camera} · Frame ${render.frame}`})),
  [['Engine',manifest.preflight?.engine??'Unknown'],
   ['Size',manifest.effective?.resolution?.join(' × ')??manifest.preflight?.resolution?.slice(0,2).join(' × ')??'Unknown'],
   ['Samples',String(manifest.effective?.samples??'Authored')],
   ['Denoising',manifest.denoise?.effectivePolicy??'Authored'],['Device',manifest.device?.effective??'Not selected']],
  preflight?'Preflight':'Ready');
}

export function evidenceGallery(outputDir:string,manifest:Record<string,any>) {
 return makeGallery('Model views',outputDir,[...(manifest.contact_sheet?[{path:manifest.contact_sheet,label:'All views'}]:[]),
  ...(manifest.views??[]).map((path:string,index:number)=>({path,label:manifest.requested_views?.[index]??`View ${index+1}`}))],
  [['Scope',manifest.evidence_scope??'Evidence'],['Lighting',manifest.requested_presentation??'Studio']]);
}

export function comparisonGallery(outputDir:string,hasMask:boolean) {
 return makeGallery('Reference comparison',outputDir,
  [{path:join(outputDir,'comparison.png'),label:'Reference / model / overlay'},{path:join(outputDir,'overlay.png'),label:'Overlay'}],
  [['Purpose','Projected geometry comparison'],['Similarity',hasMask?'See mask metrics in tool result':'Visual comparison; no mask score']]);
}

export function timelapseGallery(outputDir:string,manifest:Record<string,any>) {
 return makeGallery('Modeling progress',outputDir,manifest.checkpoints.map((step:any)=>({path:step.path,label:step.label})),
  [['Video',manifest.videoPath],['Duration',`${manifest.durationSeconds}s`],['Capture','Actual build checkpoints']]);
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
   return sceneGallery(root,m);
  }
  if(name==='evidence.json') {
   if(!Array.isArray(m.views))throw Error('Invalid evidence');
   return evidenceGallery(root,m);
  }
  if(name==='comparison.json') {
   if(m.scope!=='projected_geometry_reference_comparison')throw Error('Invalid comparison');
   return comparisonGallery(root,Boolean(m.mask));
  }
  if(m.status!=='complete'||!Array.isArray(m.checkpoints))throw Error('Incomplete timelapse');
  return timelapseGallery(root,m);
 }
 throw Error('No completed preview manifest');
}
