import {readFile, realpath, stat} from 'node:fs/promises';
import {basename, join, relative, isAbsolute} from 'node:path';
import {registerAppResource, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import type {McpServer} from '@modelcontextprotocol/server';
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
