// Executa o script real sem navegador: token só no fragmento inicial e cookie HttpOnly.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync(new URL('../../frontend/public/first-access.js',import.meta.url),'utf8');
const id='11111111-1111-4111-8111-111111111111',token='synthetic-invitation-token-0000000000000000';
async function page(hash='',search='',failure=false){
  const fields={},calls=[],history=[];
  for(const key of ['status','invite-form','institution-name','institution-logo','school','password','confirmation'])fields[key]={hidden:true,textContent:'',value:''};
  fields['invite-form'].addEventListener=(_,handler)=>fields['invite-form'].submit=handler;
  fields['invite-form'].querySelector=()=>({disabled:false});
  const identity={display_name:'Colégio Horizonte',primary_color:'#A12255',version:4,logo_url:'/api/v1/institution/assets/'+'a'.repeat(64)+'.png'};
  const context={URLSearchParams,location:{hash,search,pathname:'/first-access.html'},
    document:{title:'',getElementById:key=>fields[key]||null,querySelector:()=>({})},
    history:{replaceState:(_,__,url)=>history.push(url)},
    localStorage:new Proxy({},{get(){throw Error('token em armazenamento JavaScript');}}),
    sessionStorage:new Proxy({},{get(){throw Error('token em armazenamento JavaScript');}}),
    fetch:async(path,options)=>{
      calls.push({path,options});
      return {ok:!failure,json:async()=>path.endsWith('/identity')?identity:path.endsWith('/inspect')?{invitation_id:id,school_name:'Nome cadastral'}:{message:'Senha definida.'}};
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
const refreshed=await page('','?invitation='+id);
assert.equal(refreshed.fields['invite-form'].hidden,false);
assert.deepEqual(JSON.parse(refreshed.calls.find(c=>c.path.endsWith('/inspect')).options.body),{invitation_id:id});
const failed=await page('#'+token,'',true);
assert.equal(failed.history.length,0);
assert.equal(failed.context.location.hash,'#'+token);
assert.equal(failed.fields['invite-form'].hidden,true);
console.log('Primeiro acesso: refresh, fragmento, ausência de armazenamento JS, identidade e limpeza OK.');
