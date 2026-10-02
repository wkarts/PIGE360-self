/** Builds an isolated browser fixture without changing frontend/dist. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.argv[2];if(!out)throw new Error('Provide fixture output directory');
fs.mkdirSync(out,{recursive:true});
const decode=value=>value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>entity[0]==='#'?String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'})[entity.toLowerCase()]);
const ctx={console,document:{createElement(){return{textContent:'',get innerHTML(){return this.textContent;},set innerHTML(value){this.textContent=decode(value);this.children=[{getAttribute(){return decode(value.slice(10,-2));}}];}};}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'vendor/vue-3.5.13.global.prod.js'),'utf8'),ctx);
const errors=[];const render=ctx.Vue.compile(fs.readFileSync(path.join(root,'templates/email.html'),'utf8'),{hoistStatic:false,onError:e=>errors.push(String(e))});
assertEmpty(errors);function assertEmpty(items){if(items.length)throw new Error(items.join('\n'));}
fs.writeFileSync(path.join(out,'renders.js'),'var _Vue=Vue;var PigeRenders={email:'+render.toString()+'};');
fs.writeFileSync(path.join(out,'email.js'),ts.transpileModule(fs.readFileSync(path.join(root,'src/email.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText);
for(const name of ['workspace','dialogs'])fs.writeFileSync(path.join(out,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(root,'src',name+'.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText);
fs.copyFileSync(path.join(root,'src/app.css'),path.join(out,'app.css'));
for(const name of ['workspace.css','dossier.css','email.css'])fs.copyFileSync(path.join(root,'public',name),path.join(out,name));
fs.copyFileSync(path.join(root,'vendor/vue-3.5.13.global.prod.js'),path.join(out,'vue.js'));
fs.copyFileSync(path.join(root,'tests/email-browser-fixture.js'),path.join(out,'fixture.js'));
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="workspace.css"><link rel="stylesheet" href="dossier.css"><link rel="stylesheet" href="email.css"><style>body{padding:24px;background:#f3f5f8}#app{max-width:1360px;margin:auto}@media(max-width:800px){body{padding:12px}}</style></head><body><div id="app"></div><script src="vue.js"></script><script src="renders.js"></script><script src="fixture.js"></script><script src="dialogs.js"></script><script src="email.js"></script><script>PigeDialogs.install();Vue.createApp(PigeEmail.component,{schoolId:"school-one",admin:true}).mount("#app")</script></body></html>');
