// Explicit static routes for remote viewing; baking writes are accepted only locally.
import http from 'node:http';import fs from 'node:fs/promises';import{createReadStream}from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const root=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(root,'../..'),require=createRequire(repo+'/package.json'),three=path.resolve(path.dirname(require.resolve('three')),'..');
const art=process.env.RA2_ORIGINAL_ASSETS;if(!art)throw Error('Set RA2_ORIGINAL_ASSETS to the original installed assets directory');
const staticFiles=new Map(['index.html','viewer.mjs','motion.css','catalog.mjs','bake-atlas.mjs'].map(n=>['/'+n,path.join(root,n)]));staticFiles.set('/',root+'/index.html');staticFiles.set('/tanya-actions.glb',repo+'/assets/hd/models/tanya/tanya-actions.glb');staticFiles.set('/original-tanya.png',art+'/sprites/tany.png');
let canvas;const server=http.createServer(async(req,res)=>{try{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/bake-result'&&req.method==='POST'){
  if(req.headers.origin!=='http://127.0.0.1:4179'||req.headers['cf-connecting-ip']){res.writeHead(403).end();return;}
  let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>64*1024*1024)throw Error('Bake body too large');chunks.push(c);}const b=JSON.parse(Buffer.concat(chunks));const dir=repo+'/assets/hd/sprites';
  for(const[key,name]of [['image','tany.png'],['mask','tany-remap.png']]){if(!b[key]?.startsWith('data:image/png;base64,'))throw Error('PNG required');const bytes=Buffer.from(b[key].split(',')[1],'base64');if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Invalid PNG');await fs.writeFile(path.join(dir,name),bytes);}
  if(b.metadata?.frames!==619||b.metadata.frameRects?.length!==619)throw Error('Incorrect frame mapping');const m=JSON.parse(await fs.readFile(dir+'/manifest.json'));m.sprites.tany=b.metadata;await fs.writeFile(dir+'/manifest.json',JSON.stringify(m,null,2)+'\n');await fs.mkdir(repo+'/.cache/motion',{recursive:true});await fs.writeFile(repo+'/.cache/motion/bake-bounds.json',JSON.stringify(b.bounds));res.writeHead(200).end('Saved');return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 if(p.startsWith('/canvas/')){canvas.middlewares(req,res,()=>res.writeHead(404).end());return;}
 let file=staticFiles.get(p);if(p.startsWith('/vendor/')&&!p.includes('..')&&/^\/vendor\/(build|examples\/jsm)\//.test(p))file=path.join(three,p.slice(8));
 if(!file){res.writeHead(404).end();return;}const st=await fs.stat(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':st.size});if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 }catch(e){console.error(e.message);res.writeHead(500).end('Preview unavailable');}});
const{createCanvasPreview}=await import('../canvas-hd-preview/server.mjs');canvas=await createCanvasPreview({base:'/canvas/',repo,httpServer:server});server.listen(4179,'127.0.0.1',()=>console.log('SHP motion preview ready http://127.0.0.1:4179/'));
