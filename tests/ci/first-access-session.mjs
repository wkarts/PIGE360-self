// Executa o script real sem navegador: token só no fragmento inicial e cookie HttpOnly.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync(new URL('../../frontend/public/first-access.js',import.meta.url),'utf8');
const id='11111111-1111-4111-8111-111111111111',token='synthetic-invitation-token-0000000000000000';
async function page(hash='',search='',failure=false,loginPath='/', pathname='/first-access.html', detail={}){
  const fields={},calls=[],history=[];
  for(const key of ['status','invite-form','institution-name','institution-logo','school','password','confirmation','login-link','access-context','access-title','recovery-form','email'])fields[key]={hidden:true,textContent:'',value:''};
  fields['login-link'].href='/';
  for(const key of ['invite-form','recovery-form']){
    fields[key].addEventListener=(_,handler)=>fields[key].submit=handler;
    fields[key].querySelector=()=>({disabled:false});
  }
  const identity={display_name:'Colégio Horizonte',primary_color:'#A12255',version:4,logo_url:'/api/v1/institution/assets/'+'a'.repeat(64)+'.png'};
  const context={URLSearchParams,location:{hash,search,pathname,replace:url=>history.push(url)},
    document:{title:'',getElementById:key=>fields[key]||null,querySelector:()=>({})},
    history:{replaceState:(_,__,url)=>history.push(url)},
    localStorage:new Proxy({},{get(){throw Error('token em armazenamento JavaScript');}}),
    sessionStorage:new Proxy({},{get(){throw Error('token em armazenamento JavaScript');}}),
    fetch:async(path,options)=>{
      calls.push({path,options});
      return {ok:!failure,json:async()=>path.endsWith('/identity')?identity:path.endsWith('/inspect')?{invitation_id:id,school_name:'Nome cadastral',login_path:loginPath,...detail}:{message:'Senha definida.',login_path:loginPath}};
    }};
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {fields,calls,history,context};
}

const initial=await page('#'+token);
assert.equal(initial.fields['invite-form'].hidden,false);
assert.equal(initial.fields['institution-logo'].hidden,false);
assert.equal(initial.context.document.title,'Colégio Horizonte · Primeiro acesso');
assert.equal(initial.history[0],'/first-access.html?invitation='+id);
assert.deepEqual(JSON.parse(initial.calls.find(c=>c.path.endsWith('/inspect')).options.body),{token});
initial.fields.password.value=initial.fields.confirmation.value='Synthetic-Test-Password!';
await initial.fields['invite-form'].submit({preventDefault(){}});
const accept=initial.calls.find(c=>c.path.endsWith('/accept'));
assert.deepEqual(JSON.parse(accept.options.body),{invitation_id:id,password:'Synthetic-Test-Password!'});
assert.equal(accept.options.credentials,'same-origin');
assert.equal(accept.options.headers['X-CSRF-Protection'],'1');
assert.equal(initial.fields.password.value,'');
assert.equal(initial.fields['invite-form'].hidden,true);
for (const [loginPath,expected] of [['/professor','/professor'], ['/family','/family'], ['/','/'], ['https://example.invalid/','/']]) {
  const {fields}=await page('#'+token,'',false,loginPath);
  assert.equal(fields['login-link'].href,expected);
  fields.password.value=fields.confirmation.value='Synthetic-Test-Password!';
  await fields['invite-form'].submit({preventDefault(){}});
  assert.equal(fields['login-link'].href,expected);
}
const legacy=await page('#'+token,'',false,'/professor','/first-access',{continue_path:'/professor/first-access'});
assert.deepEqual(legacy.history,['/professor/first-access#'+token]);
assert.equal(legacy.fields['invite-form'].hidden,true);
const untrusted=await page('#'+token,'',false,'/family','/first-access',{continue_path:'https://example.invalid/first-access'});
assert.equal(untrusted.history[0],'/first-access?invitation='+id);
const reset=await page('#'+token,'',false,'/professor','/first-access',{purpose:'password_reset'});
assert.equal(reset.fields['access-title'].textContent,'Redefina sua senha');
for(const [path,portal,login] of [['/professor/recuperar-senha','teacher','/professor'],['/family/recuperar-senha','family','/family']]){
  const screen=await page('','',false,'/',path);
  assert.equal(screen.fields['recovery-form'].hidden,false);
  assert.equal(screen.fields['login-link'].href,login);
  assert.equal(screen.fields['invite-form'].hidden,true);
  assert.equal(screen.calls.some(c=>c.path.endsWith('/inspect')),false);
  screen.fields.email.value='fake@example.test';
  await screen.fields['recovery-form'].submit({preventDefault(){}});
  const sent=screen.calls.find(c=>c.path.endsWith('/password-recovery'));
  assert.deepEqual(JSON.parse(sent.options.body),{portal,email:'fake@example.test'});
  assert.equal(screen.fields['recovery-form'].hidden,true);
}
const refreshed=await page('','?invitation='+id);
assert.equal(refreshed.fields['invite-form'].hidden,false);
assert.deepEqual(JSON.parse(refreshed.calls.find(c=>c.path.endsWith('/inspect')).options.body),{invitation_id:id});
const failed=await page('#'+token,'',true);
assert.equal(failed.history.length,0);
assert.equal(failed.context.location.hash,'#'+token);
assert.equal(failed.fields['invite-form'].hidden,true);
console.log('Primeiro acesso: refresh, fragmento, ausência de armazenamento JS, identidade e limpeza OK.');
