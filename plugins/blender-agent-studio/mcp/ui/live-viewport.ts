import {App,applyDocumentTheme,applyHostStyleVariables} from '@modelcontextprotocol/ext-apps';
import type {ViewportSnapshot,ViewportObject} from '../../scripts/live-viewport';
import {imagePoint,selectionContext,snapshotFromResult} from './live-state';

const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const shot=el<HTMLImageElement>('shot');
const app=new App({name:'Blender Agent Studio live viewport',version:'1.0.0'},{});
let snapshot:ViewportSnapshot|undefined,selected:ViewportObject|null=null;
let ready=false,busy=false,connected=false,attached=false,closed=false,attaching=false;
let timer:ReturnType<typeof setTimeout>|undefined;
let epoch=0, failures=0;
type Motion={action:string;dx?:number;dy?:number;amount?:number};
let pending:Motion|undefined;
let drag:{id:number;startX:number;startY:number;x:number;y:number;moved:boolean;pan:boolean;button:number}|undefined;
const clamp=(n:number)=>Math.max(-1,Math.min(1,n));
function error(message=''){el('error').textContent=message;el('error').hidden=!message;}
function controls(){
  document.body.dataset.live=String(connected);
  el('status').textContent=connected?'Connected to Blender':ready?'Reconnecting…':'Connecting…';
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-action],#attach,#objects button'))
    button.disabled=busy||attaching||!connected||!snapshot?.png;
  el<HTMLButtonElement>('clear').disabled=attaching||!ready;

}
function schedule(){clearTimeout(timer);if(ready&&!closed&&!document.hidden)timer=setTimeout(()=>refresh(false),Math.min(10000,2000*2**Math.min(failures,3)));}
function disconnected(reason:unknown){
  connected=false;failures++;pending=undefined;
  error(`${(reason as Error).message} Reconnecting automatically…`);controls();
}
function objects(){
  const query=el<HTMLInputElement>('filter').value.toLocaleLowerCase();
  const items=snapshot?.objects.filter(o=>o.name.toLocaleLowerCase().includes(query))??[];
  el('objects').replaceChildren(...items.map(o=>{
    const button=document.createElement('button'),name=document.createElement('span'),type=document.createElement('small');
    name.textContent=o.name;type.textContent=o.type.toLowerCase();button.append(name,type);
    button.setAttribute('aria-pressed',String(selected?.id===o.id));
    button.onclick=()=>pick({objectId:o.id});return button;
  }));
  el('count').textContent=snapshot?`${snapshot.objectCount} visible objects${snapshot.objectCount>snapshot.objects.length?' · showing the first 250':''}`:'';
}
function show(next:ViewportSnapshot){
  if(snapshot&&next.sessionId!==snapshot.sessionId)throw Error('A different Blender session is connected. Reopen this viewport.');
  if(!next.png&&snapshot?.seq===next.seq)next={...next,png:snapshot.png};
  if(snapshot?.seq!==next.seq)el('marker').hidden=true;
  snapshot=next;connected=true;failures=0;
  if(next.png){shot.src=`data:image/png;base64,${next.png}`;shot.hidden=false;el('empty').hidden=true;}
  else{shot.hidden=true;shot.removeAttribute('src');el('empty').hidden=false;el('empty').textContent='Loading this viewport capture…';}
  el('origin').textContent=`${next.file?next.file.split(/[\\/]/).pop():'Unsaved file'} / ${next.scene}`;
  el('origin').title=next.file||'Unsaved file';el('frame').textContent=`Frame ${next.frame}`;
  objects();controls();
}
async function call(name:string,args:Record<string,unknown>){
  const result=await app.callServerTool({name,arguments:args});
  if(result.isError)throw Error(result.content?.find(c=>c.type==='text')?.text??'Viewport request failed.');
  return result;
}
async function clearReference(){
  if(attached)await app.updateModelContext({content:[]});
  attached=false;selected=null;el('reference').hidden=true;el('marker').hidden=true;objects();
}
async function refresh(force:boolean){
  if(!ready||busy||attaching||closed)return;
  busy=true;controls();const current=epoch;
  try{
    const result=await call('blender_viewport_snapshot',{...(snapshot?{sessionId:snapshot.sessionId}:{}),since:snapshot?.png?snapshot.seq:0,force});
    if(current!==epoch||closed)return;
    const next=snapshotFromResult(result);if(!next)throw Error('Blender returned no viewport.');
    show(next);error();
  }catch(e){disconnected(e);}
  finally{busy=false;controls();drain();schedule();}
}
async function attach(object:ViewportObject|null){
  if(!snapshot?.png||attaching||!connected)return;
  const reference=snapshot;
  pending=undefined;clearTimeout(timer);attaching=true;controls();
  try{
    await clearReference();
    selected=object;
    el('reference').hidden=false;el('selected').textContent=object?.name??'Viewport reference';
    el('selection-status').textContent='Attaching…';
    el<HTMLButtonElement>('copy').hidden=!object;
    // No message is sent. Context is attached for the user's next prompt.
    const caps=app.getHostCapabilities();
    const includeImage=!!(caps?.updateModelContext?.image||caps?.experimental?.['openai/modelContext']);
    await app.updateModelContext({content:selectionContext(reference,object,includeImage)});
    attached=true;el('selection-status').textContent=includeImage?'Attached to your next message':'Object and scene details attached';error();
  }catch(e){el('selection-status').textContent=object?'This host could not attach the reference. Copy the name instead.':'This host could not attach the view.';error((e as Error).message);}
  attaching=false;objects();controls();schedule();
}
async function pick(params:Record<string,unknown>){
  if(busy||attaching||!snapshot?.png||!connected)return;
  busy=true;clearTimeout(timer);controls();
  try{
    const result=await call('blender_viewport_pick',{sessionId:snapshot.sessionId,seq:snapshot.seq,...params});
    const object=(result.structuredContent as any)?.object??null;
    if(!object){error('No object at this point. Click a surface or choose an object from the list.');return;}
    await attach(object);
    if(params.x!==undefined&&object){
      const bounds=shot.getBoundingClientRect(),stage=el('stage').getBoundingClientRect();
      const scale=Math.min(bounds.width/snapshot.width,bounds.height/snapshot.height);
      const w=snapshot.width*scale,h=snapshot.height*scale;
      const marker=el('marker');marker.style.left=`${bounds.left-stage.left+(bounds.width-w)/2+Number(params.x)*w}px`;
      marker.style.top=`${bounds.top-stage.top+(bounds.height-h)/2+Number(params.y)*h}px`;marker.hidden=false;
    }else el('marker').hidden=true;
  }catch(e){disconnected(e);}
  finally{busy=false;controls();schedule();}
}
async function navigate(action:string,params:Record<string,unknown>={}){
  if(busy||attaching||!snapshot)return;
  busy=true;clearTimeout(timer);controls();
  try{
    const result=await call('blender_viewport_navigate',{sessionId:snapshot.sessionId,seq:snapshot.seq,action,...params});
    const next=snapshotFromResult(result);if(next)show(next);error();
  }catch(e){disconnected(e);}
  finally{busy=false;controls();drain();schedule();}
}
// Coalesce input while a capture is in flight. Every command uses the latest
// returned sequence; no unbounded queue or concurrent stale navigation calls.
function drain(){
  if(!pending||busy||attaching||closed||!connected)return;
  const {action,...params}=pending;pending=undefined;void navigate(action,params);
}
function motion(next:Motion){
  if(!ready||!snapshot||attaching||closed||!connected)return;
  if(pending?.action===next.action)pending={action:next.action,
    ...(next.dx===undefined?{}:{dx:clamp((pending.dx??0)+next.dx),dy:clamp((pending.dy??0)+(next.dy??0))}),
    ...(next.amount===undefined?{}:{amount:clamp((pending.amount??0)+next.amount)})};
  else pending=next;
  drain();
}
const stage=el('stage');
stage.onpointerdown=event=>{
  if(!snapshot?.png||!connected||attaching||drag||(event.button!==0&&event.button!==1))return;
  event.preventDefault();stage.focus();stage.setPointerCapture(event.pointerId);
  drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,
    moved:false,pan:event.shiftKey,button:event.button};
};
stage.onpointermove=event=>{
  if(!drag||drag.id!==event.pointerId)return;
  if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<5)return;
  const bounds=stage.getBoundingClientRect();
  const dx=clamp((event.clientX-drag.x)/bounds.width),dy=clamp((event.clientY-drag.y)/bounds.height);
  drag.moved=true;drag.x=event.clientX;drag.y=event.clientY;
  stage.dataset.gesture=drag.pan?'pan':'orbit';
  motion({action:drag.pan?'PAN':'ORBIT',dx,dy});
};
stage.onpointerup=event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const finished=drag;drag=undefined;delete stage.dataset.gesture;
  if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  if(!finished.moved&&finished.button===0&&snapshot&&!busy){
    const point=imagePoint(event.clientX,event.clientY,shot.getBoundingClientRect(),snapshot.width,snapshot.height);
    if(point)void pick(point);
  }
};
stage.onpointercancel=stage.onlostpointercapture=()=>{drag=undefined;delete stage.dataset.gesture;};
stage.addEventListener('wheel',event=>{
  if(!snapshot?.png||attaching||!connected)return;
  event.preventDefault();
  motion({action:'ZOOM',amount:clamp(event.deltaY*(event.deltaMode===1?.04:event.deltaMode===2?.6:.002))});
},{passive:false});
stage.onkeydown=event=>{
  const action:Record<string,string>={ArrowLeft:'ORBIT_LEFT',ArrowRight:'ORBIT_RIGHT',ArrowUp:'ORBIT_UP',ArrowDown:'ORBIT_DOWN',
    '+':'ZOOM_IN','=':'ZOOM_IN','-':'ZOOM_OUT',Home:'FRAME_ALL',f:'FRAME_ALL',F:'FRAME_ALL',
    '1':event.ctrlKey?'BACK':'FRONT','3':event.ctrlKey?'LEFT':'RIGHT','7':event.ctrlKey?'BOTTOM':'TOP'};
  if(event.key==='Escape'){event.preventDefault();void clearReference().then(controls).catch(e=>error(e.message));}
  else if(action[event.key]){event.preventDefault();motion({action:action[event.key]});}
};
shot.onerror=()=>{snapshot=undefined;disconnected(Error('Waiting for a new viewport capture.'));schedule();};
el('attach').onclick=()=>attach(null);
el('clear').onclick=async()=>{try{await clearReference();error();}catch(e){error((e as Error).message);}};
el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(selected?.name??'');el('selection-status').textContent='Object name copied';}catch{el('selection-status').textContent='Select and copy the object name above.';}};
el<HTMLInputElement>('filter').oninput=objects;
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-action]'))button.onclick=()=>motion({action:button.dataset.action!});
el('expand').onclick=async()=>{try{const mode=app.getHostContext()?.displayMode==='fullscreen'?'inline':'fullscreen';await app.requestDisplayMode({mode});}catch(e){error((e as Error).message);}};
function host(context:any){
  if(context.theme)applyDocumentTheme(context.theme);
  if(context.styles?.variables)applyHostStyleVariables(context.styles.variables);
  if(context.displayMode){document.body.classList.toggle('fullscreen',context.displayMode==='fullscreen');el('expand').textContent=context.displayMode==='fullscreen'?'Collapse':'Expand';el('marker').hidden=true;}
  if(context.availableDisplayModes)el('expand').hidden=!context.availableDisplayModes.includes('fullscreen');
}
app.onhostcontextchanged=host;
app.ontoolinput=()=>{epoch++;};
app.ontoolresult=async result=>{
  if(result.isError){disconnected(Error(result.content?.find(c=>c.type==='text')?.text??'Connect Agent Studio in Blender.'));schedule();return;}
  try{const next=snapshotFromResult(result);if(next)show(next);if(!snapshot?.png)await refresh(false);else schedule();}catch(e){disconnected(e);schedule();}
};
app.onteardown=async()=>{closed=true;pending=undefined;drag=undefined;epoch++;clearTimeout(timer);return {};};
document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden)schedule();});
window.addEventListener('resize',()=>{el('marker').hidden=true;});
app.connect().then(()=>{ready=true;host(app.getHostContext()??{});controls();schedule();}).catch(()=>{error('Open this viewport in an MCP Apps-compatible host.');controls();});
controls();
