import type {Gallery} from '../viewer';

// Some hosts forward standard content but omit custom tool-result metadata.
// Reuse the inline PNG instead of sending another base64 copy in model context.
export type PreviewResult = { _meta?: Record<string, unknown>; content?: unknown[]; structuredContent?: Record<string,unknown>; isError?:boolean };

export function galleryFromResult(result: PreviewResult): Gallery | undefined {
 const structured = result.structuredContent?.gallery as Gallery | undefined;
 if (structured && Array.isArray(structured.images) && Array.isArray(structured.details)) return structured;
 const metadata = result._meta?.['blender/viewer'] as Gallery | undefined;
 if (metadata && Array.isArray(metadata.images) && Array.isArray(metadata.details)) return metadata;
 const images: Gallery['images'] = [];
 let bytes = 0;
 for (const value of result.content ?? []) {
  const item = value as {type?: string; mimeType?: string; data?: string};
  if (item?.type !== 'image' || item.mimeType !== 'image/png' || typeof item.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(item.data)) continue;
  bytes += item.data.length;
  if (bytes > 14_000_000 || images.length >= 12) break;
  images.push({label: `Preview ${images.length + 1}`, src: `data:image/png;base64,${item.data}`});
 }
 return images.length ? {title: 'Blender preview', status: 'Ready', images, details: [], notice: ''} : undefined;
}

export function previewDirectory(result:PreviewResult,input?:Record<string,unknown>):string|undefined {
 const sources=[result.structuredContent];
 for(const item of result.content??[]) {
  const block=item as {type?:string;text?:string};
  if(block?.type!=='text'||typeof block.text!=='string'||block.text.length>2_000_000)continue;
  try{sources.push(JSON.parse(block.text));}catch{/* Plain-text diagnostics are not preview pointers. */}
 }
 for(const source of sources) {
  const preview=source?.preview as {outputDir?:unknown}|undefined;
  const dir=preview?.outputDir??source?.outputDir;
  if(typeof dir==='string'&&dir.length)return dir;
 }
 return typeof input?.outputDir==='string'&&input.outputDir.length?input.outputDir:undefined;
}

export async function restoreGallery(result:PreviewResult,input:Record<string,unknown>|undefined,call:(outputDir:string)=>Promise<PreviewResult>):Promise<Gallery|undefined> {
 if(result.isError)throw Error('Render failed');
 const direct=galleryFromResult(result);
 // A full gallery already carries its camera labels and render details.
 if(direct && (result._meta?.['blender/viewer']||result.structuredContent?.gallery))return direct;
 const directory=previewDirectory(result,input);
 if(!directory)return direct;
 try {
  const loaded=await call(directory);
  if(loaded.isError)throw Error('Preview unavailable');
  const gallery=galleryFromResult(loaded);
  if(!gallery)throw Error('Preview unavailable');
  return gallery;
 }catch(error){if(direct)return direct;throw error;}
}
