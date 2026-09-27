/* Registra somente classes de falhas: nunca mensagem, stack, URL ou formulário. */
(()=>{'use strict';let sent=0;const seen=new Set();const area=location.pathname==='/online.html'?'portal':'school';
function report(event){if(sent>=5||seen.has(event)||!navigator.onLine)return;seen.add(event);sent++;
fetch('/api/v1/diagnostics/client-event',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},body:JSON.stringify({event,area}),keepalive:true}).catch(()=>{});}
window.addEventListener('error',event=>report(event.target!==window?'resource_error':'javascript_error'),true);
window.addEventListener('unhandledrejection',()=>report('unhandled_rejection'));
})();
