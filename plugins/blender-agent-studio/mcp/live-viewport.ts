import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {McpServer} from '@modelcontextprotocol/server';
import {registerAppResource,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {z} from 'zod';
import {ViewportService,navigationSchema,type ViewportSnapshot} from '../scripts/live-viewport';

export const LIVE_VIEWPORT_URI='ui://blender-agent-studio/live-viewport-v1.html';
const service=new ViewportService();
const appMeta={ui:{resourceUri:LIVE_VIEWPORT_URI,visibility:['app']}};
const session=z.string().regex(/^[a-f0-9]{32}$/);
const sequence=z.number().int().positive();
let html:Promise<string>|undefined;
export function liveViewportHtml() {
  return html??=(async()=>{
    const build=await Bun.build({entrypoints:[join(import.meta.dir,'ui/live-viewport.ts')],target:'browser',minify:true});
    if(!build.success)throw Error('Could not build the live viewport.');
    const script=(await build.outputs[0].text()).replaceAll('</script','<\\/script');
    return (await readFile(join(import.meta.dir,'ui/live-viewport.html'),'utf8')).replace('/*VIEWPORT_SCRIPT*/',()=>script);
  })();
}
const errorResult=(error:unknown)=>({isError:true,content:[{type:'text' as const,text:error instanceof Error?error.message:'Viewport unavailable.'}]});
function appResult(value:unknown){return {content:[],structuredContent:value as Record<string,unknown>};}

export function registerLiveViewport(server:McpServer) {
  server.registerTool('blender_open_viewport',{
    title:'Blender live viewport',
    description:'Show the connected Blender session in an interactive viewport. Returns a current image, scene/frame and visible object names. Requires the bundled Agent Studio Live addon and an open 3D View. Does not open files or change geometry. This is a viewport capture, not a final render or validation pass.',
    inputSchema:z.object({}),
    annotations:{readOnlyHint:true,openWorldHint:false},
    _meta:{ui:{resourceUri:LIVE_VIEWPORT_URI},'openai/ui':{entrypoints:[{type:'thread'}]}},
  },async()=>{
    try {
      const capture=await service.call('snapshot',{force:true}) as ViewportSnapshot;
      const {png,...state}=capture;
      return {content:[{type:'text' as const,text:JSON.stringify(state)},
        ...(png?[{type:'image' as const,mimeType:'image/png',data:png}]:[])],
        structuredContent:state,_meta:{'blender/liveViewport':capture}};
    }catch(error){return errorResult(error);}
  });
  server.registerTool('blender_viewport_snapshot',{
    title:'Refresh live viewport',description:'App-only refresh. Reuses unchanged captures; returns pixels only for a new capture.',
    inputSchema:z.object({sessionId:session.optional(),since:z.number().int().min(0).default(0),force:z.boolean().default(false)}),
    annotations:{readOnlyHint:true,openWorldHint:false},_meta:appMeta,
  },async params=>{try{return appResult(await service.call('snapshot',params));}catch(error){return errorResult(error);}});
  server.registerTool('blender_viewport_pick',{
    title:'Identify viewport object',description:'App-only identification from a current capture; does not change Blender selection. Rejects stale captures. Use objectId for non-mesh objects.',
    inputSchema:z.object({sessionId:session,seq:sequence,x:z.number().min(0).max(1).optional(),y:z.number().min(0).max(1).optional(),objectId:z.string().max(64).optional()})
      .refine(p=>p.objectId!==undefined || (p.x!==undefined&&p.y!==undefined),'Supply objectId or x and y.'),
    annotations:{readOnlyHint:true,openWorldHint:false},_meta:appMeta,
  },async params=>{try{return appResult(await service.call('pick',params));}catch(error){return errorResult(error);}});
  server.registerTool('blender_viewport_navigate',{
    title:'Navigate live viewport',description:'App-only bounded orbit, zoom or axis view. Changes the connected Blender viewport, never scene geometry or camera objects.',
    inputSchema:navigationSchema.safeExtend({sessionId:session,seq:sequence}),
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},_meta:appMeta,
  },async params=>{try{return appResult(await service.call('navigate',params));}catch(error){return errorResult(error);}});
  registerAppResource(server,'Blender live viewport',LIVE_VIEWPORT_URI,{mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{
    uri:LIVE_VIEWPORT_URI,mimeType:RESOURCE_MIME_TYPE,text:await liveViewportHtml(),
    _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}}},
  }]}));
}
