/* Synthetic provider fixture. No mailbox, message or credential is sent outside this browser. */
var folders=['inbox','sent','drafts','spam','trash','archive'].map(role=>({id:role,name:role,role,total:3,unread:role==='inbox'?3:0}));
var calls=[],connected=true,sendStatus='sent';
var fixture={uid:3,uidvalidity:7,subject:'Reunião pedagógica · alinhamento do trimestre',from:'Secretaria Escolar <secretaria@escola.example>',to:'Ana Professora <ana@escola.example>',cc:'Coordenação <coordenacao@escola.example>',date:'2026-10-02T12:00:00Z',seen:false,flagged:false,size:1600,text:'Olá, Ana!\n\nNossa reunião pedagógica será na próxima terça-feira, às 14h, na sala dos professores.\n\nVamos conversar sobre o acompanhamento das turmas, os resultados do trimestre e as atividades de encerramento.\n\nPor favor, confira a pauta em anexo e envie suas contribuições até segunda-feira.\n\nAbraços,\nSecretaria Escolar\n\n<img src="https://unsafe.invalid/tracker" onerror="alert(1)">',message_id:'<sample@escola.example>',attachments:[{part:'1',filename:'Pauta da reunião.txt',content_type:'text/plain',size:14}]};
var PigeAPI={
  request:async function(url,options){
    options=options||{};var body=options.body?JSON.parse(options.body):null;var method=options.method||'GET';calls.push({url,method,body});
    await new Promise(resolve=>setTimeout(resolve,15));
    if(url.endsWith('/account'))return{available:true,connected,address:'ana@escola.example',display_name:'Ana Professora',needs_password:!connected,limits:{message_bytes:10485760,attachment_bytes:5242880,attachment_count:10,recipients:50}};
    if(url.endsWith('/connection')){connected=method==='POST';return{connected};}
    if(/\/folders\/[^/]+/.test(url)){if(method==='PATCH'){var previous=url.split('/').at(-1);var item=folders.find(x=>x.id===previous);item.name=body.name;item.id='custom-renamed';return{...item};}folders=folders.filter(x=>x.id!==url.split('/').at(-1).split('?')[0]);return{deleted:true};}
    if(url.endsWith('/folders')){if(method==='POST'){var item={id:'custom',name:body.name,role:'custom',total:0,unread:0};folders.push(item);return item;}return{items:folders.map(x=>({...x}))};}
    if(url.includes('/messages?')){var params=new URLSearchParams(url.split('?')[1]);return{items:params.get('folder')?.startsWith('custom')?[]:[fixture,{...fixture,uid:2,from:'Direção <direcao@escola.example>',subject:'Calendário de eventos de outubro',seen:true},{...fixture,uid:1,from:'Biblioteca <biblioteca@escola.example>',subject:'Novidades para os projetos de leitura',seen:true}],folder:params.get('folder'),uidvalidity:7,next_before_uid:null};}
    if(url.includes('/messages/3?'))return method==='DELETE'?{deleted:true}:{...fixture};
    if(url.endsWith('/flags'))return{updated:true};
    if(url.endsWith('/move'))return{moved:true};
    if(url.endsWith('/drafts'))return{folder:'drafts',uid:5,uidvalidity:7,previous_removed:true};
    if(url.endsWith('/send'))return{status:sendStatus,message_id:'<new@escola.example>',sent_saved:sendStatus==='sent',refused:[],message:sendStatus==='sent'?'Mensagem enviada.':'A confirmação está pendente.'};
    if(url.endsWith('/settings'))return{imap_host:'',smtp_host:'',smtp_port:465};
    throw new Error('Unconfigured fixture request');
  },
  post:function(url,body){return this.request(url,{method:'POST',body:JSON.stringify(body)});},
  patch:function(url,body){return this.request(url,{method:'PATCH',body:JSON.stringify(body)});},
  download:async function(url,name){calls.push({url,method:'DOWNLOAD'});var anchor=document.createElement('a');var blob=URL.createObjectURL(new Blob(['synthetic file']));anchor.href=blob;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);},
  objectUrl:async function(url){calls.push({url,method:'ATTACHMENT'});return URL.createObjectURL(new Blob(['synthetic file']));}
};
