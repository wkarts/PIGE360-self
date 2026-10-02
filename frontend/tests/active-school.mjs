/** Respostas, arquivos e credenciais atrasados não atravessam a troca de entidade. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=ts.transpileModule(fs.readFileSync(path.join(root,'src/api.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return{promise,resolve};};
const abortError=error=>error?.name==='AbortError';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const calls=[],downloads=[],objectUrls=[],events=[];
  const sandbox={Headers,Response,Blob,FormData,CustomEvent,AbortController,AbortSignal,navigator:{onLine:true},setTimeout:()=>0,
    URL:{createObjectURL:blob=>{objectUrls.push(blob);return'blob:synthetic';},revokeObjectURL(){}},
    document:{createElement:()=>({click(){downloads.push(this.download);}})},
    dispatchEvent:event=>events.push(event),fetch:async(url,options)=>{calls.push({url,options});return new Response('{}');}};
  sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return{sandbox,api:sandbox.PigeAPI,calls,downloads,objectUrls,events};
}
{
  const {api,calls}=fixture();api.setActiveSchool('school-a');
  await api.request('/schools/school-a/students',{headers:{'X-School-Id':'school-b'}});
  assert.equal(calls[0].options.headers.get('X-School-Id'),'school-a');
  await assert.rejects(api.request('/schools/school-b/students'),abortError);
  await assert.rejects(api.request('/schools/school%2Db/students'),abortError);
  assert.equal(calls.length,1,'Rota de outra escola bloqueada antes de enviar');
}
{
  const {api,sandbox}=fixture(),pending=deferred();let signal;
  api.setActiveSchool('school-a');sandbox.fetch=(_url,options)=>{signal=options.signal;return pending.promise;};
  const result=api.request('/schools/school-a/students');api.setActiveSchool('school-b');
  assert.equal(signal.aborted,true,'Requisição de A foi cancelada');pending.resolve(new Response('{"school_id":"school-a"}'));
  await assert.rejects(result,abortError);
}
{
  const {api,sandbox}=fixture(),body=deferred();api.setActiveSchool('school-a');
  sandbox.fetch=async()=>({status:200,ok:true,json:()=>body.promise});
  const result=api.request('/schools/school-a/students');await tick();api.setActiveSchool('school-b');
  body.resolve({school_id:'school-a'});await assert.rejects(result,abortError);
}
{
  const {api,sandbox}=fixture(),body=deferred();api.setActiveSchool('school-a');
  sandbox.fetch=async()=>({status:200,ok:true,json:()=>body.promise});
  const result=api.request('/schools/school-a/students');await tick();api.setActiveSchool('school-a');
  body.resolve({school_id:'school-a'});assert.equal((await result).school_id,'school-a','Repetir a seleção atual preserva a operação');
}
for(const method of ['download','downloadPost','objectUrl']){
  const {api,sandbox,objectUrls,downloads}=fixture(),body=deferred();api.setActiveSchool('school-a');
  sandbox.fetch=async()=>({status:200,ok:true,headers:new Headers(),blob:()=>body.promise});
  const operation=method==='downloadPost'?api.downloadPost('/schools/school-a/reports',{},'report.pdf'):method==='download'?api.download('/schools/school-a/reports','report.pdf'):api.objectUrl('/schools/school-a/photo');
  await tick();api.setActiveSchool('school-b');body.resolve(new Blob(['synthetic school A']));
  await assert.rejects(operation,abortError);assert.equal(objectUrls.length,0,method+': nenhum blob exposto');assert.equal(downloads.length,0,method+': nenhum download disparado');
}
{
  const {api,sandbox}=fixture(),body=deferred();api.setActiveSchool('school-a');
  sandbox.fetch=async()=>({status:200,ok:true,json:()=>body.promise});
  const result=api.request('/schools/school-a/students');await tick();api.clear();body.resolve({school_id:'school-a'});
  await assert.rejects(result,abortError);
}
for(const method of ['request','download','downloadPost']){
  const {api,sandbox}=fixture(),body=deferred();api.setActiveSchool('school-a');
  sandbox.fetch=async()=>({status:403,ok:false,headers:new Headers(),json:()=>body.promise});
  const result=method==='request'?api.request('/schools/school-a/students'):method==='download'?api.download('/schools/school-a/reports','report.pdf'):api.downloadPost('/schools/school-a/reports',{},'report.pdf');
  await tick();api.setActiveSchool('school-b');body.resolve({detail:'Mensagem antiga da escola A'});
  await assert.rejects(result,abortError,'Erro tardio não é exibido na entidade nova');
}
{
  const {api,sandbox,calls}=fixture(),pending=deferred();
  sandbox.fetch=()=>pending.promise;
  const refresh=api.refresh();api.clear();pending.resolve(new Response('{"access_token":"expired-context-token","user":{}}'));
  await assert.rejects(refresh,abortError,'Refresh anterior à saída não reativa a sessão');
  sandbox.fetch=async(url,options)=>{calls.push({url,options});return new Response('{}');};
  await api.request('/auth/me');assert.equal(calls[0].options.headers.get('Authorization'),null);
}
console.log('Entidade ativa: headers, abort de fetch/JSON/blob/erro, download e refresh após saída OK.');
