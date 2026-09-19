/** Browser-only Bink conversion; originals never leave the setup worker. */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import classWorkerURL from '@ffmpeg/ffmpeg/worker?worker&url';
const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
export async function convertMenuVideo(bytes:Uint8Array,onProgress:(progress:number)=>void=()=>{}) {
  const ffmpeg=new FFmpeg(),urls:string[]=[];
  async function runtime(name:string,type:string) {
    const response=await fetch(`${base}/${name}`,{credentials:'omit',signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw new Error(`FFmpeg runtime download failed (${response.status})`);
    const url=URL.createObjectURL(new Blob([await response.arrayBuffer()],{type}));urls.push(url);return url;
  }
  try {
    const [coreURL,wasmURL]=await Promise.all([runtime('ffmpeg-core.js','text/javascript'),runtime('ffmpeg-core.wasm','application/wasm')]);
    await ffmpeg.load({coreURL,wasmURL,classWorkerURL});
    ffmpeg.on('progress',({progress})=>onProgress(Math.max(0,Math.min(1,progress))));
    await ffmpeg.writeFile('menu.bik',bytes);
    const status=await ffmpeg.exec(['-i','menu.bik','-c:v','libvpx','-crf','10','-b:v','2M','-deadline','realtime','-cpu-used','2','-an','menu.webm'],180000);
    if(status!==0)throw new Error('Original menu video conversion failed. Please retry.');
    const result=await ffmpeg.readFile('menu.webm');
    if(typeof result==='string'||result.byteLength<1000)throw new Error('Original menu video is incomplete.');
    return result;
  } finally {ffmpeg.terminate();urls.forEach(url=>URL.revokeObjectURL(url));}
}
