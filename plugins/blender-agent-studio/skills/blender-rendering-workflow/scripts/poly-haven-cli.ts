/** Standalone skill entry point. Powered by Poly Haven; Bun, no packages required. */
import {createPolyHavenClient, MAPS} from './poly-haven.ts';
const args=process.argv.slice(2);
function value(name:string, fallback?:string) {const i=args.indexOf(name); return i<0?fallback:args[i+1];}
function required(name:string) {const v=value(name); if(!v || v.startsWith('--')) throw new Error(`${name} is required`); return v;}
const type=value('--type','textures');
if(type!=='textures' && type!=='hdris') throw new Error('--type must be textures or hdris');
const client=createPolyHavenClient();
let result;
if(args[0]==='search') {
  const limit=Number(value('--limit','8'));
  if(!Number.isInteger(limit)||limit<1||limit>20) throw new Error('--limit must be 1..20');
  result=await client.search(required('--query'),type,limit);
} else if(args[0]==='download') {
  const resolution=value('--resolution','4k');
  if(!['1k','2k','4k','8k'].includes(resolution!)) throw new Error('--resolution must be 1k, 2k, 4k or 8k');
  const maps=value('--maps','diffuse,roughness,normal')!.split(',');
  if(!maps.length||maps.some(m=>!Object.hasOwn(MAPS,m))) throw new Error('Invalid texture map names');
  result=await client.download({assetId:required('--asset-id'),assetType:type,resolution:resolution as '4k',maps:maps as Array<keyof typeof MAPS>,outputDir:required('--output-dir')});
} else throw new Error('Use search --query TEXT or download --asset-id ID --output-dir NEW_DIR [--type textures|hdris] [--resolution 4k]');
console.log(JSON.stringify(result,null,2));
