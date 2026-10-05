import {App,applyDocumentTheme,applyHostStyleVariables} from '@modelcontextprotocol/ext-apps';
import type {Gallery} from '../viewer';
import {restoreGallery} from './result';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const img=el<HTMLImageElement>('image'),views=el<HTMLSelectElement>('views'),zoom=el<HTMLButtonElement>('zoom');
let gallery:Gallery|undefined;
let input:Record<string,unknown>|undefined;
let generation=0;
function empty(message:string,status:string) {
 gallery=undefined;img.hidden=true;img.removeAttribute('src');el('controls').hidden=true;el('details').hidden=true;el('notice').hidden=true;
 el('empty').hidden=false;el('empty').textContent=message;el('status').textContent=status;
}
function select() {
 const item=gallery?.images[views.selectedIndex];if(!item)return;
 img.src=item.src;img.alt=item.label;img.hidden=false;el('empty').hidden=true;
 el('caption').textContent=`${views.selectedIndex+1} / ${gallery!.images.length}`;
 el('stage').classList.remove('zoom');zoom.setAttribute('aria-pressed','false');zoom.textContent='100%';
}
function render(value:unknown) {
 const g=value as Gallery;
 if(!g||!Array.isArray(g.images)||!Array.isArray(g.details)){empty('No preview is available for this result.','No preview');return;}
 gallery={...g,images:g.images.filter(i=>typeof i?.src==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(i.src)).slice(0,12)};
 el('title').textContent=String(g.title||'Blender preview');el('status').textContent=String(g.status||'Ready');
 views.replaceChildren(...gallery.images.map((item,i)=>{const option=document.createElement('option');option.textContent=item.label;option.value=String(i);return option;}));
 el('controls').hidden=!gallery.images.length;views.hidden=gallery.images.length<2;
 if(gallery.images.length)select();else {img.hidden=true;el('empty').hidden=false;el('empty').textContent='No image was produced. See the render details.';}
 el('facts').replaceChildren();for(const [key,value] of g.details.slice(0,16)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=String(key);dd.textContent=String(value);el('facts').append(dt,dd);}
 el('details').hidden=!g.details.length;el('notice').textContent=g.notice||'';el('notice').hidden=!g.notice;
}
views.onchange=select;zoom.onclick=()=>{const active=el('stage').classList.toggle('zoom');zoom.setAttribute('aria-pressed',String(active));zoom.textContent=active?'Fit':'100%';};
img.onerror=()=>empty('This image could not be displayed. The rendered file remains in the output directory.','Image unavailable');
const app=new App({name:'Blender render viewer',version:'1.0.0'},{});
app.ontoolinput=(params)=>{generation++;input=params.arguments;empty('Rendering. Your preview will appear when it is ready.','Working…');};
app.ontoolresult=async (result)=>{
 const current=++generation;
 if(result.isError){empty('The render did not complete. Check the tool response for details.','Render failed');return;}
 empty('Loading your rendered views…','Loading…');
 try {
  const restored=await restoreGallery(result,input,outputDir=>app.callServerTool({name:'blender_get_preview',arguments:{outputDir}}));
  if(current===generation)render(restored);
 }catch{
  if(current===generation)empty('The preview files could not be loaded. Reopen this panel to retry, or render again if the files were moved or removed.','Preview unavailable');
 }
};
app.ontoolcancelled=()=>{generation++;empty('Rendering was cancelled.','Cancelled');};
app.onhostcontextchanged=ctx=>{if(ctx.theme)applyDocumentTheme(ctx.theme);if(ctx.styles?.variables)applyHostStyleVariables(ctx.styles.variables);};
app.connect().then(()=>{const ctx=app.getHostContext();if(ctx?.theme)applyDocumentTheme(ctx.theme);if(ctx?.styles?.variables)applyHostStyleVariables(ctx.styles.variables);}).catch(()=>empty('Open this viewer in an MCP Apps-compatible host. Inline image results remain available.','Connection unavailable'));
