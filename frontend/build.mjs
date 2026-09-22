/** Build local sem CDN: TypeScript + templates Vue pré-compilados. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const version=process.env.APP_VERSION || fs.readFileSync(path.join(root,'../VERSION'),'utf8').trim();
if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(version))throw new Error('APP_VERSION inválida');
const dist=path.join(root,'dist');fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
const compiler=process.env.TSC_BINARY || (fs.existsSync(path.join(root,'node_modules/typescript/bin/tsc')) ? path.join(root,'node_modules/typescript/bin/tsc') : 'tsc');
execFileSync(compiler,['-p',path.join(root,'tsconfig.json')],{stdio:'inherit'});
const source=fs.readFileSync(path.join(root,'vendor/vue-3.5.13.global.prod.js'),'utf8');
// O compilador browser do Vue usa um elemento temporário somente para decodificar entidades.
const decodeEntities=(value)=>value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>{
  if(entity[0]==='#')return String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10));
  return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'})[entity.toLowerCase()];
});
const sandbox={console,document:{createElement(){return {textContent:'',get innerHTML(){return this.textContent},set innerHTML(value){this.textContent=decodeEntities(value);this.children=[{getAttribute(){return decodeEntities(value.slice(10,-2))}}]}}}}};vm.createContext(sandbox);vm.runInContext(source,sandbox);
execFileSync(compiler,['-p',path.join(root,'tsconfig.portal.json')],{stdio:'inherit'});
const renders={};
for(const name of ['app','portal','expansion']){
 const template=fs.readFileSync(path.join(root,'templates',name+'.html'),'utf8');
 const errors=[];
 const render=sandbox.Vue.compile(template,{hoistStatic:false,onError:error=>errors.push(String(error))});
 if(errors.length)throw new Error(name+': '+errors.join('; '));
 const code=render.toString();if(code.includes('_hoisted_'))throw new Error('Render contém constantes externas.');
 renders[name]=code;
}
fs.writeFileSync(path.join(dist,'renders.js'),'/* Vue pré-compilado; sem eval em runtime. */\nvar _Vue=Vue; var PigeRenders={'+Object.entries(renders).map(([key,code])=>key+':'+code).join(',')+'};\n');
fs.cpSync(path.join(root,'public'),dist,{recursive:true});
fs.mkdirSync(path.join(dist,'vendor'),{recursive:true});fs.copyFileSync(path.join(root,'vendor/vue-3.5.13.global.prod.js'),path.join(dist,'vendor/vue-3.5.13.global.prod.js'));
fs.copyFileSync(path.join(root,'src/app.css'),path.join(dist,'app.css'));
const staticFiles=['/','/index.html','/app.js','/portal.js','/renders.js','/app.css','/vendor/vue-3.5.13.global.prod.js'];
function collectPublic(dir,prefix='') { for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
 const name=prefix+'/'+entry.name;
 if(entry.isDirectory())collectPublic(path.join(dir,entry.name),name);
 else if(!staticFiles.includes(name))staticFiles.push(name);
} }
collectPublic(path.join(root,'public'));
const fingerprint=createHash('sha256');fingerprint.update(version);
for(const asset of [...new Set(staticFiles.map(f=>f==='/'?'/index.html':f))].sort()){fingerprint.update(asset);fingerprint.update(fs.readFileSync(path.join(dist,asset.slice(1))));}
const hash=fingerprint.digest('hex').slice(0,16);
const sw=`const CACHE='pige360-shell-${hash}'; const ASSETS=${JSON.stringify(staticFiles)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pige360-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/health/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(url.pathname==='/online.html'?'/online.html':'/index.html')));return;}
 if(ASSETS.includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});\n`;
fs.writeFileSync(path.join(dist,'sw.js'),sw);
fs.writeFileSync(path.join(dist,'build-info.json'),JSON.stringify({product:'PIGE360 Self',version,vue:'3.5.13',build_id:hash,pipeline:'typescript-vue-precompiled',external_cdn:false},null,2)+'\n');
console.log('PWA compilada:',hash);
