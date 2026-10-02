/** Nomes de exportação respeitam o servidor sem aceitar caminhos ou controles. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const downloads=[];
let disposition='';
const sandbox={URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Headers,Response,Blob,setTimeout:()=>0,
  document:{createElement:()=>({href:'',download:'',click(){downloads.push(this.download);}})},
  fetch:async()=>new Response('synthetic content',{headers:{'Content-Disposition':disposition}})};
vm.createContext(sandbox);
vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(root,'src/api.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,sandbox);
for (const [header,want] of [
  ['attachment; filename="diagnostico-escola-2026-10-02_02-00-01-UTC-aabbcc.zip"','diagnostico-escola-2026-10-02_02-00-01-UTC-aabbcc.zip'],
  ["attachment; filename*=UTF-8''auditoria-institui%C3%A7%C3%A3o.csv",'auditoria-instituição.csv'],
  ['attachment; filename="../../host.env"','fallback.zip'],
  ['attachment; filename="C:\\secrets.txt"','fallback.zip'],
  ['attachment; filename=".env"','fallback.zip'],
  ["attachment; filename*=UTF-8''%0Aprivate",'fallback.zip'],
  ["attachment; filename*=UTF-8''bad%ZZname",'fallback.zip'],
  ['', 'fallback.zip']
]){
  disposition=header;
  await sandbox.PigeAPI.download('/diagnostics/export','fallback.zip');
  assert.equal(downloads.at(-1),want);
}
disposition='attachment; filename="auditoria-escola-2026-10-02.csv"';
await sandbox.PigeAPI.downloadPost('/reports/export',{},'fallback.csv');
assert.equal(downloads.at(-1),'auditoria-escola-2026-10-02.csv');
console.log('Download: nomes datados do servidor, Unicode, POST e rejeição de caminhos/controles OK.');
