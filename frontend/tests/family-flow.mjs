/** Portal: transporte real preservado, dados privados e estado sob navegação concorrente. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(path='/family.html',search=''){
 const apps=[],events={},calls=[],history=[],downloads=[];
 const sandbox={console,URLSearchParams,URL,Headers,Response,Blob,AbortController,setTimeout,clearTimeout,Intl,
  location:{pathname:path,search},history:{pushState(_a,_b,url){history.push(url);},replaceState(_a,_b,url){history.push(url);}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({click(){downloads.push(this.download);}})},
  fetch:async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify({}));}};
 sandbox.window=sandbox;sandbox.addEventListener=(type,fn)=>events[type]=fn;sandbox.removeEventListener=()=>{};
 vm.createContext(sandbox);
 for(const file of ['vendor/vue-3.5.13.global.prod.js','renders.js'])vm.runInContext(fs.readFileSync(root+'dist/'+file,'utf8'),sandbox);
 sandbox.Vue.onMounted=fn=>events.mounted=fn;sandbox.Vue.onUnmounted=()=>{};
 sandbox.Vue.createApp=options=>({mount(){apps.push(options);}});
 vm.runInContext(fs.readFileSync(root+'dist/family.js','utf8'),sandbox);
 const app=apps[0],ctx=app.setup();sandbox.PigeMFA.accept=async()=>false;
 const render=()=>app.render.call(ctx,ctx,[]);
 return {sandbox,ctx,render,events,calls,history,downloads};
}
function nodes(v){return !v||typeof v!=='object'?[]:[v,...(Array.isArray(v.children)?v.children.flatMap(nodes):[])];}
function text(v){return nodes(v).map(n=>typeof n.children==='string'?n.children:'').join(' ');}
const student=(id,financial=true)=>({id,name:'Aluno '+id,number:'001',financial_authorized:financial,enrollments:[{id:'enr-'+id,number:'M1',class_name:'Turma A',year_name:'2027',status:'active'}],documents:[{id:'doc-'+id,type_name:'Autorização',status:'pending',file_id:null}]});
const account={id:'guardian',name:'Responsável Teste',role:'guardian',school_ids:['school-a','school-b']};
{
 const {ctx,render}=fixture();render();ctx.s.ready=true;let tree=render();
 assert.equal(nodes(tree).filter(n=>n.type==='form').length,1);assert.match(text(tree),/Acesse seu portal/);assert.match(text(tree),/secretaria da escola/);
 assert.equal(nodes(tree).filter(n=>n.type==='input'&&n.props?.type==='password').length,1);
 ctx.s.passwordVisible=true;tree=render();assert.equal(nodes(tree).find(n=>n.props?.id==='family-password').props.type,'text');
 ctx.mfa.state.challenge='challenge';tree=render();assert.equal(nodes(tree).filter(n=>n.type==='form').length,0,'Login não concorre com desafio MFA');
 assert.match(text(tree),/Confirme seu acesso/);ctx.mfa.state.challenge='';ctx.s.account=account;ctx.s.students=[student('a')];ctx.s.studentId='a';
 tree=render();
 for(const [id,label] of [['family-student','Você está acompanhando'],['family-school','Instituição']]){
  const control=nodes(tree).find(n=>n.type==='select'&&n.props?.id===id);
  const caption=nodes(tree).find(n=>n.type==='label'&&n.props?.for===id);
  assert.ok(control,'Seletor possui ID de associação');assert.equal(text(caption),label,'Nome do seletor não incorpora opções');
  assert.equal(nodes(caption).some(n=>n.type==='select'),false,'Label explícito separado das opções');
 }
 for(const name of ['overview','students','academic','documents','finance','agenda','news','support']){ctx.s.section=name;tree=render();assert.ok(nodes(tree).find(n=>n.props?.id==='family-navigation'));assert.ok(nodes(tree).find(n=>n.props?.['aria-current']==='page'));}
 ctx.s.section='overview';ctx.s.students=[student('a',false)];assert.match(text(render()),/Restrito/);assert.doesNotMatch(text(render()),/98%|Mariana|Lucas/);
 ctx.s.financeError='falha';ctx.s.students=[student('a')];assert.match(text(render()),/Indisponível/);ctx.s.contextError=true;assert.match(text(render()),/Não foi possível carregar seu vínculo/);
}
{
 const {ctx,sandbox,history}=fixture('/documents','?student=a');assert.equal(ctx.s.section,'documents');
 ctx.s.account=account;ctx.s.students=[student('a'),student('b')];ctx.s.studentId='a';ctx.s.schoolId='school-a';
 const requests=[];sandbox.fetch=async(url,opts)=>{requests.push({url,opts});return new Response(JSON.stringify({items:[],note:'Real'}));};
 ctx.section('finance');ctx.section('finance');assert.equal(history.length,1,'Clique repetido não duplica histórico');assert.match(history[0],/^\/family.html\?view=finance&student=a$/);
 await ctx.changeStudent();assert.equal(requests[0].opts.headers.get('X-School-Id'),'school-a');assert.equal(requests[0].opts.headers.get('X-CSRF-Protection'),'1');
 ctx.s.students=[student('a',false)];requests.length=0;await ctx.changeStudent();assert.equal(requests.length,0,'Consulta financeira não é emitida sem autorização');
}
{
 const {ctx,sandbox}=fixture();ctx.s.account=account;ctx.s.schoolId='school-a';ctx.s.students=[student('a')];ctx.s.studentId='a';
 let release;sandbox.fetch=()=>new Promise(r=>release=r);const pending=ctx.changeStudent();await tick();ctx.s.studentId='b';release(new Response(JSON.stringify({items:[{id:'secret'}],note:'private'})));await pending;assert.equal(ctx.s.charges.length,0,'Financeiro atrasado não atravessa aluno');
}
{
 const {ctx,sandbox}=fixture();ctx.s.account=account;ctx.s.schoolId='school-a';ctx.s.section='news';let release;
 sandbox.fetch=()=>new Promise(r=>release=r);const old=ctx.loadFeed();await tick();ctx.s.schoolId='school-b';
 sandbox.fetch=async(url)=>new Response(JSON.stringify(url.endsWith('/family/context')?{students:[],schools:[]}:{items:[],total:0}));await ctx.load();
 release(new Response(JSON.stringify({items:[{id:'old',title:'Outra escola'}],total:1})));await old;assert.equal(ctx.s.feedItems.length,0,'Feed atrasado não atravessa instituição');assert.equal(ctx.s.selectedPost,null);
}
{
 const {ctx,sandbox}=fixture();ctx.s.account=account;ctx.s.schoolId='school-a';ctx.s.students=[student('a')];ctx.s.studentId='a';ctx.s.news=[{title:'private'}];ctx.s.selectedPost={title:'private'};
 sandbox.fetch=async()=>new Response('{}');await ctx.logout();assert.equal(ctx.s.account,null);assert.equal(ctx.s.students.length,0);assert.equal(ctx.s.news.length,0);assert.equal(ctx.s.selectedPost,null);assert.equal(ctx.s.menuOpen,false);
}
{
 const {ctx,sandbox}=fixture();ctx.s.email='account@example.test';ctx.s.password='synthetic-password';let pending;const calls=[];
 sandbox.fetch=async(url,opts)=>{calls.push({url,opts});if(url.endsWith('/auth/login'))return await new Promise(r=>pending=r);if(url.endsWith('/family/context'))return new Response(JSON.stringify({students:[student('a')],schools:[]}));return new Response(JSON.stringify({items:[],total:0}));};
 const first=ctx.login();await tick();const second=ctx.login();assert.equal(calls.length,1,'Clique repetido não duplica autenticação');pending(new Response(JSON.stringify({access_token:'synthetic',user:account})));await Promise.all([first,second]);
 assert.equal(ctx.s.password,'');assert.equal(ctx.s.account.id,'guardian');assert.ok(calls.filter(x=>!x.url.endsWith('/auth/login')).every(x=>x.opts.headers.get('Authorization')==='Bearer synthetic'));
}
console.log('Family flow: login/MFA, views reais, autorização financeira, histórico, concorrência e logout OK.');
// Refresh 200 from the old session must not resurrect it after sign-out or replace a new login.
for(const newLogin of [false,true])for(const refreshStatus of [200,401]){
 const {ctx,sandbox}=fixture();ctx.s.email='first@example.test';ctx.s.password='synthetic';
 sandbox.fetch=async(url)=>new Response(JSON.stringify(url.endsWith('/auth/login')?{access_token:'first-token',user:account}:url.endsWith('/family/context')?{students:[student('a')],schools:[]}:{items:[],total:0}));
 await ctx.login();
 let resolveRefresh,feedCalls=0;const nextAccount={...account,id:'new-account',name:'Nova sessão'};
 sandbox.fetch=async(url)=>{
  if(url.endsWith('/auth/refresh'))return await new Promise(resolve=>resolveRefresh=resolve);
  if(url.includes('community-feed')){feedCalls++;return new Response('{"detail":"expired"}',{status:401});}
  return new Response('{}');
 };
 const stale=ctx.loadFeed();await tick();assert.ok(resolveRefresh,'Feed 401 iniciou refresh');
 await ctx.logout();assert.equal(ctx.s.account,null);
 if(newLogin){
  sandbox.fetch=async(url)=>new Response(JSON.stringify(url.endsWith('/auth/login')?{access_token:'new-token',user:nextAccount}:url.endsWith('/family/context')?{students:[student('b')],schools:[]}:{items:[],total:0}));
  ctx.s.email='second@example.test';ctx.s.password='synthetic';await ctx.login();assert.equal(ctx.s.account.id,'new-account');
 }
 resolveRefresh(new Response(JSON.stringify({access_token:'stale-token',user:account}),{status:refreshStatus}));await stale;
 assert.equal(ctx.s.account?.id||null,newLogin?'new-account':null,'Refresh atrasado não ressuscita nem sobrescreve sessão');
 assert.equal(feedCalls,1,'Requisição antiga não é reenviada após troca de sessão');
 let authorization;sandbox.fetch=async(_url,options)=>{authorization=options.headers.get('Authorization');return new Response('{}');};
 await ctx.request('/auth/me');assert.equal(authorization,newLogin?'Bearer new-token':null,'Token antigo não reaparece');
}
console.log('Family auth epoch: delayed refresh cannot resurrect logout, overwrite new login or replay old requests.');
