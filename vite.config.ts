// Dev can serve verified local originals; production bundles remain source-only.
import { defineConfig, type UserConfig } from 'vite';
import { checkAssetsReady } from './scripts/setup-assets';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {bootcampActors} from './src/bootcamp/catalog.js';
import {environmentAssets} from './src/bootcamp/environment-catalog.js';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {localInstallerPlugin} from './scripts/local-installer';
const models = [...bootcampActors.map(actor=>({id:actor.type,file:actor.file})),...environmentAssets].map(actor => {
  const source = fs.readFileSync(path.resolve('assets/hd/models', actor.file));
  return {type:actor.id, source, fileName:`app/models/${actor.id}-${createHash('sha256').update(source).digest('hex').slice(0,12)}.glb`};
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
export default defineConfig(async ({ command, isPreview }): Promise<UserConfig> => {
  let localDirectory: string | undefined;
  if (command === 'serve' && !isPreview && process.env.RA2_DEV_ASSETS !== 'browser') {
    const candidates = [path.resolve('public')];
    try {
      const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
        {encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim();
      if (path.basename(common) === '.git') candidates.push(path.join(path.dirname(common), 'public'));
    } catch { /* Source archives use their own public directory. */ }
    for (const directory of process.env.RA2_PUBLIC_DIR ? [path.resolve(process.env.RA2_PUBLIC_DIR)] : [...new Set(candidates)]) {
      if ((await checkAssetsReady(directory)).ready) { localDirectory = directory; break; }
    }
  }
  const localOriginals = Boolean(localDirectory);
  if (command === 'serve' && !isPreview) console.info(localOriginals
    ? `[ra2] Reusing prepared originals from ${localDirectory}; no download or conversion.`
    : '[ra2] Using browser asset preparation/cache. No complete local originals found (or RA2_DEV_ASSETS=browser).');
  return {
  base: deployBase,
  define: { __BUILD_INFO__: JSON.stringify(buildInfo), __LOCAL_ORIGINALS__: JSON.stringify(localOriginals),
    __BOOTCAMP_MODEL_URLS__: JSON.stringify(Object.fromEntries(models.map(m=>[m.type,m.fileName]))) },
  publicDir: localOriginals ? localDirectory : false,
  optimizeDeps: { entries:['index.html'] },
  server: { watch: {ignored:['**/.cache/**', '**/.worktrees/**']} },
  build: { assetsDir:'app' },
  worker: { format:'es' },
  plugins:[localInstallerPlugin(path.dirname(fileURLToPath(import.meta.url))),{
    name:'browser-only-originals',
    configureServer(server) {
      server.middlewares.use((req,res,next) => {
        const model = models.find(m => req.url?.split('?')[0] === deployBase + m.fileName);
        if(model){res.setHeader('Content-Type','model/gltf-binary');res.end(model.source);return;}
        if ([deployBase + 'ra2-sw.js', '/ra2-sw.js'].includes(req.url?.split('?')[0] || '')) {
          res.setHeader('Content-Type','application/javascript');
          res.setHeader('Cache-Control','no-cache');
          res.end(`self.RA2_LOCAL_ORIGINALS = ${localOriginals};\n` + fs.readFileSync(path.resolve('public/ra2-sw.js'), 'utf8'));return;
        }
        next();
      });
    },
    generateBundle(_options,bundle) {
      this.emitFile({type:'asset',fileName:'Fira-Sans-Condensed-OFL.txt',source:fs.readFileSync('src/hud/fonts/OFL.txt','utf8')});
      for(const model of models)this.emitFile({type:'asset',fileName:model.fileName,source:model.source});
      for(const [source,target] of [['License.txt','7z-wasm-LICENSE.txt'],['unRarLicense.txt','7z-wasm-unRAR.txt']])
        this.emitFile({type:'asset',fileName:target!,source:fs.readFileSync('node_modules/7z-wasm/'+source,'utf8')});
      this.emitFile({type:'asset',fileName:'ra2-sw.js',source:fs.readFileSync('public/ra2-sw.js','utf8')});
      this.emitFile({type:'asset',fileName:'app-shell.json',source:JSON.stringify([deployBase,...Object.keys(bundle).filter(file=>!file.endsWith('.glb')).map(file=>deployBase+file)])});
    },
  }],
  };
});
