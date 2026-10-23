import {readFile} from 'node:fs/promises';
import {connect} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {z} from 'zod';

const connectionSchema = z.object({protocol:z.literal(1),port:z.number().int().min(1).max(65535),
  token:z.string().regex(/^[a-f0-9]{64}$/),sessionId:z.string().regex(/^[a-f0-9]{32}$/)});
export const objectSchema = z.object({id:z.string(),name:z.string().max(1024),type:z.string(),
  location:z.array(z.number()).length(3),dimensions:z.array(z.number()).length(3)});
export const snapshotSchema = z.object({sessionId:z.string(),seq:z.number().int().positive(),revision:z.number().int(),
  file:z.string(),scene:z.string(),frame:z.number(),capturedAt:z.number(),
  width:z.number().int().min(1).max(1280),height:z.number().int().min(1).max(1280),maxEdge:z.number(),
  objectCount:z.number().int(),objects:z.array(objectSchema).max(250),
  png:z.string().max(9_000_000).regex(/^iVBORw0KGgo[A-Za-z0-9+/=]*$/).optional()});
export type ViewportSnapshot = z.infer<typeof snapshotSchema>;
export type ViewportObject = z.infer<typeof objectSchema>;
export const viewActions = ['FRONT','BACK','LEFT','RIGHT','TOP','BOTTOM',
  'ORBIT_LEFT','ORBIT_RIGHT','ORBIT_UP','ORBIT_DOWN','ZOOM_IN','ZOOM_OUT',
  'ORBIT','PAN','ZOOM','FRAME_ALL'] as const;
export const navigationSchema = z.object({action:z.enum(viewActions),
  dx:z.number().min(-1).max(1).optional(),dy:z.number().min(-1).max(1).optional(),
  amount:z.number().min(-1).max(1).optional()}).superRefine((p,ctx)=>{
  if((p.action==='ORBIT'||p.action==='PAN')&&(p.dx===undefined||p.dy===undefined))
    ctx.addIssue({code:'custom',message:'Orbit and pan require dx and dy.'});
  if(p.action==='ZOOM'&&p.amount===undefined)
    ctx.addIssue({code:'custom',message:'Zoom requires an amount.'});
});
export type BridgeCommand = 'snapshot'|'pick'|'navigate';

export function connectionPath() {
  return process.env.BAS_VIEWPORT_CONNECTION || join(tmpdir(),'blender-agent-studio','viewport.json');
}

export async function requestViewport(command:BridgeCommand,params:Record<string,unknown>,
  options:{path?:string;timeoutMs?:number} = {}):Promise<unknown> {
  let descriptor;
  try { descriptor=connectionSchema.parse(JSON.parse(await readFile(options.path??connectionPath(),'utf8'))); }
  catch { throw Error('Connect Blender first: install addon/blender_agent_studio_live.py from the plugin folder, then open the 3D View sidebar → Agent Studio → Connect Agent Studio.'); }
  if(params.sessionId && params.sessionId!==descriptor.sessionId)throw Error('A different Blender session is connected. Reopen the viewport.');
  // The descriptor cannot redirect the connection off-machine. No paths, code,
  // arbitrary methods or addon credentials are returned to the UI or model.
  return new Promise((resolve,reject)=>{
    const socket=connect({host:'127.0.0.1',port:descriptor.port});
    const chunks:Buffer[]=[];let size=0,done=false;
    const finish=(error?:Error,value?:unknown)=>{
      if(done)return;done=true;clearTimeout(timer);
      // Let the current data callback return before tearing down the native
      // socket (Bun 1.3 on Windows can otherwise free it during dispatch).
      setTimeout(()=>socket.destroy(),0);
      if(error)reject(error);else resolve(value);
    };
    const timer=setTimeout(()=>finish(Error('Blender did not respond in time. Stop playback or rendering, then refresh.')),options.timeoutMs??12000);
    socket.on('connect',()=>socket.write(JSON.stringify({protocol:1,token:descriptor.token,command,params:{...params,sessionId:descriptor.sessionId}})+'\n'));
    socket.on('data',chunk=>{
      if(done)return;
      const bytes=typeof chunk==='string'?Buffer.from(chunk):chunk;
      size+=bytes.length;
      if(size>10_000_000){finish(Error('Viewport response exceeds the size limit.'));return;}
      chunks.push(bytes);
      if(!bytes.includes(10))return;
      try {
        const reply=JSON.parse(Buffer.concat(chunks).toString('utf8').split('\n')[0]);
        if(reply.ok!==true)finish(Error(typeof reply.error==='string'?reply.error.slice(0,1000):'Blender rejected the viewport request.'));
        else finish(undefined,reply.result);
      }catch{finish(Error('Blender returned an invalid viewport response.'));}
    });
    socket.on('error',()=>finish(Error('Cannot reach Blender. In its Agent Studio sidebar, disconnect and connect again.')));
    socket.on('close',()=>finish(Error('Blender closed the viewport connection. Refresh to reconnect.')));
  });
}

// Multiple open panels share the bridge. Serial execution keeps navigation,
// capture and picking in a deterministic order without accumulating a backlog.
export class ViewportService {
  private pending:Promise<unknown> = Promise.resolve();
  private queued=0;
  constructor(private request:typeof requestViewport=requestViewport){}
  async call(command:BridgeCommand,params:Record<string,unknown>) {
    if(this.queued>=4)throw Error('Viewport is busy. Try again after the current capture.');
    this.queued++;
    const result=this.pending.catch(()=>{}).then(()=>this.request(command,params));
    this.pending=result;
    try {
      const value=await result;
      if(command==='pick')return z.object({sessionId:z.string(),seq:z.number(),object:objectSchema.nullable()}).parse(value);
      return snapshotSchema.parse(value);
    }finally{this.queued--;}
  }
}
