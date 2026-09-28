import {test,expect} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeGallery,viewerHtml,VIEWER_URI} from './viewer';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {galleryFromResult} from './ui/result';

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
