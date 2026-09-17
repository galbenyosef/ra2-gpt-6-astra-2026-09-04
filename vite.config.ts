import { defineConfig } from 'vite';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {bootcampActors} from './src/bootcamp/catalog.js';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const models = bootcampActors.map(actor => {
  const source = fs.readFileSync(path.resolve('assets/hd/models', actor.file));
  return {type:actor.type, source, fileName:`app/models/${actor.type}-${createHash('sha256').update(source).digest('hex').slice(0,12)}.glb`};
});
const base = '/' + (process.env.RA2_BASE_PATH ?? '').replace(/^\/+|\/+$/g, '') + '/';
const deployBase = base === '//' ? '/' : base;
// Embed the checkout used for this bundle, so an older cached page reports its own version.
let buildInfo: { hash: string; committedAt: string | null } = { hash: 'unknown', committedAt: null };
try {
  const [hash, committedAt] = execFileSync('git', ['show', '-s', '--format=%H%n%cI', 'HEAD'], {
    cwd: path.dirname(fileURLToPath(import.meta.url)), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim().split('\n');
  if (/^[a-f0-9]{40}$/.test(hash) && Number.isFinite(Date.parse(committedAt))) buildInfo = { hash, committedAt };
} catch { /* Source archives without Git still run, with an explicit unknown version. */ }

// Deliberately disable Vite's public directory copying: it may contain originals
// from offline development, and those must never become hosted build artifacts.
export default defineConfig({
  base: deployBase,
  define: { __BUILD_INFO__: JSON.stringify(buildInfo), __BOOTCAMP_MODEL_URLS__: JSON.stringify(Object.fromEntries(models.map(m=>[m.type,m.fileName]))) },
  publicDir: false,
  optimizeDeps: { entries:['index.html'] },
  server: { watch: {ignored:['**/.cache/**']} },
  build: { assetsDir:'app' },
  worker: { format:'es' },
  plugins:[{
    name:'browser-only-originals',
    configureServer(server) {
      server.middlewares.use((req,res,next) => {
        const model = models.find(m => req.url?.split('?')[0] === deployBase + m.fileName);
        if(model){res.setHeader('Content-Type','model/gltf-binary');res.end(model.source);return;}
        if (req.url?.split('?')[0] === '/ra2-sw.js') {
          res.setHeader('Content-Type','application/javascript');
          res.setHeader('Cache-Control','no-cache');
          res.end(fs.readFileSync(path.resolve('public/ra2-sw.js')));return;
        }
        next();
      });
    },
    generateBundle(_options,bundle) {
      for(const model of models)this.emitFile({type:'asset',fileName:model.fileName,source:model.source});
      for(const [source,target] of [['License.txt','7z-wasm-LICENSE.txt'],['unRarLicense.txt','7z-wasm-unRAR.txt']])
        this.emitFile({type:'asset',fileName:target!,source:fs.readFileSync('node_modules/7z-wasm/'+source,'utf8')});
      this.emitFile({type:'asset',fileName:'ra2-sw.js',source:fs.readFileSync('public/ra2-sw.js','utf8')});
      this.emitFile({type:'asset',fileName:'app-shell.json',source:JSON.stringify([deployBase,...Object.keys(bundle).filter(file=>!file.endsWith('.glb')).map(file=>deployBase+file)])});
    },
  }],
});
