import {test,expect} from 'bun:test';
import {createServer} from 'node:net';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {requestViewport,ViewportService,navigationSchema} from '../scripts/live-viewport';
import {LIVE_VIEWPORT_URI} from './live-viewport';
import {imagePoint,selectionContext,snapshotFromResult} from './ui/live-state';
import {runBlender} from '../scripts/blender-process';

const sessionId='a'.repeat(32),token='b'.repeat(64);
const snapshot={sessionId,seq:1,revision:2,file:'',scene:'Scene',frame:1,capturedAt:123,
  width:640,height:480,maxEdge:1000,objectCount:1,objects:[{id:'42',name:'Cube',type:'MESH',location:[0,0,0],dimensions:[2,2,2]}],png:'iVBORw0KGgo='};

test('gesture navigation accepts bounded complete gestures and rejects unsafe or incomplete input',()=>{
  for(const action of ['ORBIT','PAN']){
    expect(navigationSchema.safeParse({action,dx:.2,dy:-.4}).success).toBe(true);
    expect(navigationSchema.safeParse({action,dx:.2}).success).toBe(false);
    expect(navigationSchema.safeParse({action,dx:2,dy:0}).success).toBe(false);
  }
  expect(navigationSchema.safeParse({action:'ZOOM',amount:-.5}).success).toBe(true);
  for(const amount of [undefined,Infinity,NaN,1.01])
    expect(navigationSchema.safeParse({action:'ZOOM',amount}).success).toBe(false);
  expect(navigationSchema.safeParse({action:'FRAME_ALL'}).success).toBe(true);
  expect(navigationSchema.safeParse({action:'EXECUTE'}).success).toBe(false);
});

test('image clicks account for both horizontal and vertical letterboxing',()=>{
  const rect={left:10,top:20,width:800,height:600};
  expect(imagePoint(410,320,rect,1600,900)).toEqual({x:0.5,y:0.5});
  expect(imagePoint(410,30,rect,1600,900)).toBeUndefined();
  expect(imagePoint(20,320,rect,600,900)).toBeUndefined();
  expect(imagePoint(410,320,rect,600,900)).toEqual({x:0.5,y:0.5});
});

test('selection context carries exact capture identity and optional pixels without triggering a message',()=>{
  const content=selectionContext(snapshot,snapshot.objects[0]);
  expect(content[0].text).toContain('"selectedObject":{"id":"42","name":"Cube"');
  expect(content[0].text).toContain('"capture":1');
  expect(content[1]).toMatchObject({type:'image',data:snapshot.png});
  expect(selectionContext(snapshot,null,false)).toHaveLength(1);
  const {png,...state}=snapshot;
  expect(snapshotFromResult({structuredContent:state,content:[{type:'image',mimeType:'image/png',data:png}]})).toEqual(snapshot);
});

async function mockBridge(handler:(request:any,socket:any)=>void,run:(path:string)=>Promise<void>){
  const root=await mkdtemp(join(tmpdir(),'bas-live-test-'));
  const server=createServer(socket=>{let input='';socket.on('data',chunk=>{input+=chunk;if(input.includes('\n'))handler(JSON.parse(input.split('\n')[0]),socket);});});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const descriptor=join(root,'connection.json');
  await writeFile(descriptor,JSON.stringify({protocol:1,port:(server.address() as any).port,token,sessionId}));
  try{await run(descriptor);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
}

test('local transport authenticates, handles split responses and refuses session switches',async()=>{
  await mockBridge((request,socket)=>{
    expect(request).toMatchObject({protocol:1,token,command:'snapshot',params:{sessionId}});
    const data=JSON.stringify({ok:true,result:snapshot})+'\n';
    socket.write(data.slice(0,30));setTimeout(()=>socket.end(data.slice(30)),5);
  },async path=>{
    expect(await requestViewport('snapshot',{}, {path})).toEqual(snapshot);
    await expect(requestViewport('snapshot',{sessionId:'c'.repeat(32)},{path})).rejects.toThrow('different Blender session');
  });
});

test('transport bounds wait time and rejects malformed replies',async()=>{
  await mockBridge((_,socket)=>socket.end('invalid\n'),async path=>{
    await expect(requestViewport('snapshot',{}, {path})).rejects.toThrow('invalid viewport response');
  });
  await mockBridge(()=>{},async path=>{
    await expect(requestViewport('snapshot',{}, {path,timeoutMs:30})).rejects.toThrow('did not respond');
  });
});

test('service serializes calls and recovers after an unsuccessful operation',async()=>{
  let active=0,peak=0,calls=0;
  const service=new ViewportService(async()=>{
    peak=Math.max(peak,++active);await new Promise(resolve=>setTimeout(resolve,3));active--;
    if(calls++===0)throw Error('Blender changed');return snapshot;
  });
  const results=await Promise.allSettled([service.call('snapshot',{}),service.call('snapshot',{})]);
  expect(results[0].status).toBe('rejected');expect(results[1].status).toBe('fulfilled');expect(peak).toBe(1);
});

test('MCP exposes live viewport and app-only helpers with no external web connection',async()=>{
  const client=new Client({name:'live-test',version:'1'});
  try{
    await client.connect(new StdioClientTransport({command:'bun',args:[join(import.meta.dir,'server.ts')],stderr:'pipe'}));
    const tools=(await client.listTools()).tools;
    expect(tools.find(t=>t.name==='blender_open_viewport')?._meta).toMatchObject({ui:{resourceUri:LIVE_VIEWPORT_URI}});
    for(const name of ['blender_viewport_snapshot','blender_viewport_pick','blender_viewport_navigate'])
      expect(tools.find(t=>t.name===name)?._meta).toMatchObject({ui:{resourceUri:LIVE_VIEWPORT_URI,visibility:['app']}});
    const resource=(await client.readResource({uri:LIVE_VIEWPORT_URI})).contents[0];
    expect(resource.mimeType).toBe('text/html;profile=mcp-app');
    expect(resource.text).toContain('Attach view');expect(resource.text).not.toContain('/*VIEWPORT_SCRIPT*/');
    expect(resource._meta).toMatchObject({ui:{csp:{connectDomains:[],resourceDomains:[]}}});
  }finally{await client.close();}
},15000);

test.skipIf(!(process.env.BLENDER_EXECUTABLE??Bun.which('blender')))('real Blender addon authenticates, scopes commands, encodes PNG and cleans up its own connection',async()=>{
  const root=await mkdtemp(join(tmpdir(),'bas-live-contract-'));
  try{
    const run=await runBlender({scriptPath:join(import.meta.dir,'../scripts/_live_viewport_contract.py'),scriptArgs:[root],timeoutMs:30000});
    expect(run.timedOut).toBe(false);
    if(run.exitCode!==0)throw Error(run.stderr+'\n'+run.stdout);
    expect(await Bun.file(join(root,'contract.json')).json()).toEqual({protocol:true,png:true,lifecycle:true});
  }finally{await rm(root,{recursive:true,force:true});}
},35000);
