/** Portal: transporte real preservado, dados privados e estado sob navegação concorrente. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(path='/family',search=''){
 const apps=[],events={},calls=[],history=[],downloads=[];
 const sandbox={console,URLSearchParams,URL,Headers,Response,Blob,AbortController,setTimeout,clearTimeout,Intl,
  location:{pathname:path,search},history:{pushState(_a,_b,url){history.push(url);},replaceState(_a,_b,url){history.push(url);}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({click(){downloads.push(this.download);}})},
  fetch:async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify({}));}};
 sandbox.window=sandbox;sandbox.addEventListener=(type,fn)=>events[type]=fn;sandbox.removeEventListener=()=>{};
 vm.createContext(sandbox);
 const surface=path==='/professor'?'teacher':'family';
 for(const file of ['vendor/vue-3.5.13.global.prod.js',surface+'-renders.js'])vm.runInContext(fs.readFileSync(root+'dist/'+file,'utf8'),sandbox);
 sandbox.Vue.onMounted=fn=>events.mounted=fn;sandbox.Vue.onUnmounted=()=>{};
 sandbox.Vue.createApp=options=>({mount(){apps.push(options);}});
 vm.runInContext(fs.readFileSync(root+'dist/'+surface+'.js','utf8'),sandbox);
 // O transporte privado e o SDK público têm ciclos independentes.
 const supportCalls=[];
 sandbox.PigeSupport.load=async(...args)=>{supportCalls.push(args);};
 sandbox.PigeSupport.dispose=()=>{supportCalls.push(['dispose']);};
 const app=apps[0],ctx=app.setup();sandbox.PigeMFA.accept=async()=>false;
 const render=()=>app.render.call(ctx,ctx,[]);
 return {sandbox,ctx,render,events,calls,history,downloads,supportCalls};
}
function nodes(v){return !v||typeof v!=='object'?[]:[v,...(Array.isArray(v.children)?v.children.flatMap(nodes):[])];}
function text(v){return nodes(v).map(n=>typeof n.children==='string'?n.children:'').join(' ');}
const student=(id,financial=true)=>({id,name:'Aluno '+id,number:'001',financial_authorized:financial,enrollments:[{id:'enr-'+id,number:'M1',class_name:'Turma A',year_name:'2027',status:'active'}],documents:[{id:'doc-'+id,type_name:'Autorização',status:'pending',file_id:null}]});
const account={id:'guardian',name:'Responsável Teste',role:'guardian',school_ids:['school-a','school-b']};
{
 const {ctx,sandbox,supportCalls}=fixture();
 ctx.s.ready=true;
 await sandbox.Vue.nextTick();
 assert.deepEqual(supportCalls.at(-1),[undefined,'login']);
 ctx.s.account=account;ctx.s.schoolId='school-a';
 await sandbox.Vue.nextTick();
 assert.deepEqual(supportCalls.at(-1),['school-a','guardian_portal','guardian']);
 ctx.s.account={...account,id:'student',role:'student'};
 await sandbox.Vue.nextTick();
 assert.deepEqual(supportCalls.at(-1),['school-a','student_portal','student']);
}
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
 ctx.section('finance');ctx.section('finance');assert.equal(history.length,1,'Clique repetido não duplica histórico');assert.match(history[0],/^\/family\?view=finance&student=a$/);
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

// Drawer focus follows DOM patching, never a CSS visibility animation or a timer.
{
 const css=fs.readFileSync(root+'public/family.css','utf8');
 const mobile=css.match(/\.family-sidebar\{transform:translateX\(-100%\);([^}]+)\}/)?.[1];
 assert.ok(mobile,'Regra mobile da gaveta existe');
 assert.match(mobile,/transition:transform \.2s;/);
 assert.doesNotMatch(mobile,/transition:[^;]*(visibility|all)/,'Visibilidade não pode atrasar foco inicial');
 const {ctx,sandbox}=fixture();const focused=[];
 sandbox.document.getElementById=id=>({focus(){focused.push(id);}});
 ctx.openMenu();assert.equal(ctx.s.menuOpen,true);assert.equal(focused.length,0);
 await sandbox.Vue.nextTick();assert.deepEqual(focused,['family-menu-close']);
 ctx.closeMenu();assert.equal(ctx.s.menuOpen,false);await sandbox.Vue.nextTick();
 assert.equal(focused.at(-1),'family-menu-toggle');
 focused.length=0;ctx.openMenu();ctx.closeMenu();await sandbox.Vue.nextTick();
 assert.deepEqual(focused,['family-menu-toggle'],'Abertura obsoleta não captura foco após fechamento');
 focused.length=0;ctx.closeMenu();ctx.openMenu();await sandbox.Vue.nextTick();
 assert.deepEqual(focused,['family-menu-close'],'Fechamento obsoleto não captura foco após reabertura');
}
console.log('Family drawer: immediate visibility, deferred focus and rapid open/close guards OK.');

{
 const {ctx,render,sandbox}=fixture();
 ctx.s.ready=true;ctx.s.account={...account,role:'student'};ctx.s.schoolId='school-a';
 ctx.s.students=[{...student('a'),document_pendencies:[{document_type_id:'atest',name:'Atestado atual',status:'expired'}]}];
 ctx.s.studentId='a';
 assert.match(text(render()),/Portal do aluno/);
 assert.doesNotMatch(text(render()),/Meus alunos|Portal da família|Justificativas de ausência/);
 ctx.section('documents');
 assert.match(text(render()),/Atestado atual/);
 assert.match(text(render()),/Histórico de documentos/);
 assert.equal(ctx.pendingDocuments().length,1);
 ctx.s.students[0].document_pendencies=[];
 assert.equal(ctx.pendingDocuments().length,0,'Histórico pendente não reabre a exigência atual');
 delete ctx.s.students[0].document_pendencies;
 assert.match(text(render()),/Consulta de pendências indisponível/);
 assert.doesNotMatch(text(render()),/Nenhuma pendência documental registrada/);
 ctx.s.account=account;
 assert.match(text(render()),/Portal da família/);

 let finish;
 sandbox.fetch=()=>new Promise(resolve=>{finish=resolve;});
 ctx.section('materials');await tick();
 assert.match(text(render()),/Carregando atividades/);
 assert.doesNotMatch(text(render()),/Nenhuma atividade/);
 finish(new Response(JSON.stringify({detail:'Atividades indisponíveis'}),{status:503}));
 await tick();
 assert.match(text(render()),/Atividades indisponíveis/);
 assert.doesNotMatch(text(render()),/Nenhuma atividade/);
 const retry=ctx.loadSchoolwork();await tick();finish(new Response('[]'));await retry;
 assert.match(text(render()),/Nenhuma atividade/);
 assert.doesNotMatch(text(render()),/Atividades indisponíveis|Carregando atividades/);
}

{
 const {ctx,sandbox,render}=fixture();ctx.s.ready=true;ctx.s.account=account;
 ctx.s.schoolId='school-a';ctx.s.students=[student('a')];ctx.s.studentId='a';
 sandbox.fetch=async url=>{
  const page=new URL(url,'https://example.test').searchParams.get('page');
  const status=page==='2'?'overdue':'pending';
  return new Response(JSON.stringify({items:[{id:'item-'+page,description:'Mensalidade',due_on:'2026-05-01',amount:'120.00',status}],
    total:31,overdue_count:1,note:'Cobranças da matrícula'}));
 };
 await ctx.finance();
 assert.match(text(render()),/1 vencida\(s\)/,'O total de vencidas inclui as demais páginas');
 ctx.section('finance');assert.match(text(render()),/Página 1 de 2/);
 await ctx.finance(2);assert.match(text(render()),/Página 2 de 2/);
 assert.match(text(render()),/Vencida/);
 assert.equal(ctx.label('received_external'),'Recebido externamente');
}


{
 const {ctx,sandbox}=fixture('/professor');
 const focused=[];
 sandbox.document.getElementById=id=>({focus(){focused.push(id);}});
 ctx.s.menuOpen=true;
 ctx.navigate('overview');
 await sandbox.Vue.nextTick();
 assert.equal(ctx.s.menuOpen,false);
 assert.equal(focused.at(-1),'teacher-title','Selecionar seção no menu docente leva o foco ao título');
}
{
 const {sandbox}=fixture(), requested=[], downloaded=[];
 const term=(id,index)=>({period_id:id,period_name:index+'º Bimestre',order_index:index,starts_on:'2026-03-01',
  class_group_id:'turma',class_label:'Turma A · Unidade Centro',grade_display:'0',result_label:'Consolidado',
  attendance:{total:4,absent:1,justified_absence:0,unrecorded:0,percentage:75}});
 const enrollment=(id,periods)=>({enrollment_id:id,number:id,class_name:'Turma A',year_name:'2026',bulletin_model:'panel',
  subjects:[{diary_id:'diario',component_name:'Planejamento estratégico',periods}],official_editions:[],display_sections:[]});
 const pupil={student_id:'aluno',student_name:'Aluno de teste',student_number:'001',school_name:'Escola A',
  enrollments:[enrollment('anterior',[term('p1',1)]),enrollment('atual',[term('p1',1),term('p2',2)])]};
 const component=sandbox.PigeLearning.component;
 const ctx=component.setup({schoolId:'escola',request:async path=>{requested.push(path);return {students:[pupil],note:'Resultados publicados'};},
  download:async path=>{downloaded.push(path);}});
 await ctx.load();
 ctx.state.enrollmentId='atual';
 ctx.state.groupId=ctx.periodGroups.value[1].id;
 await ctx.load();
 assert.equal(ctx.state.enrollmentId,'atual');
 assert.equal(ctx.visibleGroups.value.length,1);
 const view=sandbox.Vue.proxyRefs(ctx);
 const html=component.render.call(view,view,[]);
 const vnodes=nodes(html);
 const cells=label=>vnodes.filter(v=>v.type==='td'&&v.props?.['data-label']===label).map(text);
 assert.equal(cells('Nota / conceito')[0].trim(),'0');
 assert.equal(cells('Frequência')[0].trim(),'75%');
 assert.ok(vnodes.some(v=>v.type==='caption'&&text(v).includes('2º Bimestre')));
 assert.ok(!vnodes.some(v=>v.type==='caption'&&text(v).includes('1º Bimestre')));
 await ctx.download();
 assert.equal(downloaded[0],'/profile/learning/aluno/report.pdf?enrollment_id=atual&school_id=escola');
 assert.ok(requested.every(r=>r==='/profile/learning?school_id=escola'));
}

{
 const {ctx,sandbox,render}=fixture();
 ctx.s.ready=true;ctx.s.account=account;ctx.s.schoolId='school-a';ctx.s.studentId='s1';
 ctx.s.students=[{...student('s1'),academic_authorized:false,enrollments:[],documents:[]}];
 ctx.section('academic');
 assert.equal(ctx.s.section,'finance');
 const consent={checkout:{id:'ch-1',mode:'detached',status:'paid',quote:{charged_cents:15000},payments:[]},
                authorization:null,can_authorize:true,terms_version:'v1',terms:'Autorizo débitos futuros.'};
 const calls=[];
 sandbox.fetch=async(url,opts)=>{calls.push([url,opts]);return new Response(JSON.stringify(consent));};
 ctx.s.charges=[{id:'charge-1',description:'Mensalidade',status:'received',amount:'150.00',due_on:'2026-11-10',has_card_checkout:true}];
 await ctx.cards.load('charge-1');assert.match(text(render()),/Autorizar débitos por título/);
 assert.equal(calls.length,1);await ctx.cards.submit();assert.equal(calls.length,1);
 ctx.cards.state.agreed=true;ctx.cards.state.until='2027-10-05';ctx.cards.state.limit='160.50';await ctx.cards.submit();
 assert.equal(calls[1][0],'/api/v1/family/students/s1/charges/charge-1/cards/authorize');
 assert.deepEqual(JSON.parse(calls[1][1].body),{terms_version:'v1',accepted:true,ends_on:'2027-10-05',limit_cents:16050});
 assert.equal(ctx.cards.link('https://outra.example/checkoutSession/show?id=ch-1'),'');
 assert.doesNotMatch(text(render()),/Justificativas de ausência/);
}
console.log('Financeiro familiar: pagador exclusivo, consentimento explícito, teto em centavos e checkout restrito ao Asaas OK.');

for(const academic of [false,true]){
 const {ctx,sandbox,events,render,history}=fixture('/family','?view=academic&student=s1');
 const calls=[],button=caption=>nodes(render()).find(n=>n.type==='button'&&text(n).trim()===caption);
 const selected={...student('s1'),academic_authorized:academic};
 const charge={id:'fatura',description:'Mensalidade',status:'received',amount:'150.00',due_on:'2026-11-10',has_card_checkout:true};
 const checkout={id:'checkout',mode:'detached',status:'paid',quote:{charged_cents:15000},payments:[]};
 let active=false;
 sandbox.PigeInstitution.load=async()=>{};
 sandbox.PigeMFA.init=()=>{};
 sandbox.fetch=async(url,opts={})=>{
   calls.push([url,opts.method||'GET']);
   let result;
   if(url.endsWith('/auth/refresh'))result={access_token:'synthetic',user:account};
   else if(url.endsWith('/family/context'))result={students:[selected],schools:[]};
   else if(url.includes('/charges?'))result={items:[charge],page:1,page_size:30,total:1,overdue_count:0};
   else if(url.endsWith('/cards/authorize')){active=true;result={active};}
   else if(url.endsWith('/cards/revoke')){active=false;result={active};}
   else if(url.endsWith('/cards'))result={checkout,can_authorize:!active,terms:'Aceito o limite e a validade.',terms_version:'v1',authorization:active?{active,ends_on:'2027-11-05',limit_cents:15000}:null};
   else if(url.includes('/community-feed?'))result={items:[],total:0};
   else throw new Error('Requisição inesperada '+url);
   return new Response(JSON.stringify(result));
 };
 events.mounted();
 for(let t=0;t<12&&!ctx.s.ready;t++)await tick();
 assert.equal(ctx.s.ready,true);assert.equal(ctx.s.error,'');
 if(academic){assert.equal(ctx.s.section,'academic');button('Financeiro').props.onClick();}
 else{
   assert.equal(ctx.s.section,'finance');
   for(const name of ['academic','materials','absences','documents','news','agenda','students']){
     sandbox.location.search='?view='+name+'&student=s1';await events.popstate();
     assert.equal(ctx.s.section,'finance',name);assert.match(history.at(-1),/view=finance/);
   }
   assert.ok(!nodes(render()).some(n=>n.props?.['aria-label']==='Acompanhamento escolar'));
   assert.ok(calls.every(([url])=>!/learning|materials|absences|documents|community-feed/.test(url)));
   sandbox.location.search='?view=support&student=s1';await events.popstate();assert.equal(ctx.s.section,'support');
   button('Financeiro').props.onClick();
 }
 await button('Consultar cartão desta cobrança').props.onClick();
 assert.ok(button('Autorizar débitos por título').props.disabled);
 ctx.cards.state.agreed=true;ctx.cards.state.until='2027-11-05';ctx.cards.state.limit='150.00';
 const form=nodes(render()).find(n=>n.type==='form'&&text(n).includes('Autorizar débitos por título'));
 await form.props.onSubmit({preventDefault(){}});
 assert.ok(button('Revogar autorização').props.disabled);
 ctx.cards.state.revoke=true;await button('Revogar autorização').props.onClick();
 assert.ok(button('Autorizar débitos por título'));assert.ok(!button('Revogar autorização'));
 assert.deepEqual(calls.filter(([,method])=>method==='POST').map(([url])=>url.split('/').at(-1)),['refresh','authorize','revoke']);
}
console.log('Portal da família: navegação e histórico por vínculo, adesão e revogação do cartão pela fatura.');
