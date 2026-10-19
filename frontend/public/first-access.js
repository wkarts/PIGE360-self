'use strict';
(() => {
  let token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
  const status=document.getElementById('status'),form=document.getElementById('invite-form');
  const send=async(path,body)=>{const r=await fetch('/api/v1/invitations/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},body:JSON.stringify(body),cache:'no-store',credentials:'same-origin'});const data=await r.json();if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'Revise a senha informada.');return data;};
  send('inspect',{token}).then(data=>{document.getElementById('school').textContent=data.school_name;status.textContent='Escolha uma senha com pelo menos 12 caracteres. O convite será utilizado somente ao confirmar.';form.hidden=false;}).catch(e=>{status.textContent=e.message;token='';});
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button'),password=document.getElementById('password'),confirmation=document.getElementById('confirmation');if(password.value!==confirmation.value){status.textContent='As senhas não conferem.';return;}button.disabled=true;try{const result=await send('accept',{token,password:password.value});token='';password.value='';confirmation.value='';form.hidden=true;status.textContent=result.message;}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
})();
