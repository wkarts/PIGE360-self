namespace PigeDialogs {
  interface Options {
    title?:string;
    confirmLabel?:string;
    cancelLabel?:string;
    destructive?:boolean;
  }
  interface PromptOptions extends Options {
    initialValue?:string;
    minLength?:number;
    maxLength?:number;
    inputLabel?:string;
  }
  type Kind='confirm'|'prompt'|'alert';
  let contextVersion=0;
  let pending:{cancel:()=>void;closed:Promise<void>;kind:Kind;message:string}|undefined;
  export function cancelPending():void { contextVersion++;pending?.cancel(); }
  function ask(kind:Kind,message:string,options:PromptOptions):Promise<string|null> {
    // Um segundo acionamento não pode aproveitar a decisão do primeiro.
    if(pending){
      if(kind!=='alert')return Promise.resolve(null);
      if(pending.kind==='alert' && pending.message===message)return pending.closed.then(()=>null);
      const version=contextVersion;
      return pending.closed.then(()=>version===contextVersion?ask(kind,message,options):null);
    }
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const host=document.createElement('div');
    document.body.appendChild(host);
    const minimum=Math.max(0,options.minLength || 0);
    const maximum=options.maxLength;
    const state=Vue.reactive({value:options.initialValue || '',error:''});
    let signalClosed!:()=>void;
    const closed=new Promise<void>(resolve=>{signalClosed=resolve;});
    return new Promise(resolve=>{
      function finish(accepted:boolean):void {
        if(pending?.cancel!==cancel)return;
        if(accepted && kind!=='alert' && opener && !opener.isConnected)accepted=false;
        if(accepted && kind==='prompt' && state.value.trim().length<minimum){
          state.error='Informe pelo menos '+minimum+(minimum===1?' caractere.':' caracteres.');
          dialog.querySelector('textarea')?.focus();
          return;
        }
        if(accepted && kind==='prompt' && maximum!==undefined && state.value.length>maximum){
          state.error='Use no máximo '+maximum+(maximum===1?' caractere.':' caracteres.');
          dialog.querySelector('textarea')?.focus();
          return;
        }
        pending=undefined;
        window.removeEventListener('pagehide',cancelPending);
        window.removeEventListener('popstate',cancelPending);
        window.removeEventListener('hashchange',cancelPending);
        dialog.close();
        app.unmount();
        host.remove();
        if(opener?.isConnected)opener.focus({preventScroll:true});
        resolve(accepted?(kind==='prompt'?state.value:'ok'):null);
        signalClosed();
      }
      const cancel=()=>finish(false);
      const app=Vue.createApp({render:PigeRenders.actionDialog,setup:()=>({
        kind,message,minimum,maximum,state,finish,
        title:options.title || ({confirm:'Confirmar ação',alert:'Aviso',prompt:'Informe um valor'})[kind],
        inputLabel:options.inputLabel || 'Resposta',
        confirmLabel:options.confirmLabel || (kind==='alert'?'Entendi':'Confirmar'),
        cancelLabel:options.cancelLabel || 'Voltar',destructive:Boolean(options.destructive),
      })});
      app.mount(host);
      const dialog=host.querySelector<HTMLDialogElement>('dialog')!;
      dialog.addEventListener('keydown',event=>{
        if(event.key!=='Tab')return;
        const controls=dialog.querySelectorAll<HTMLElement>('button,textarea');
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
        if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
      });
      pending={cancel,closed,kind,message};
      window.addEventListener('pagehide',cancelPending);
      window.addEventListener('popstate',cancelPending);
      window.addEventListener('hashchange',cancelPending);
      dialog.showModal();
      const selector=kind==='prompt'?'textarea':kind==='alert'?'[type="submit"]':'[data-dialog-back]';
      dialog.querySelector<HTMLElement>(selector)?.focus({preventScroll:true});
    });
  }
  export async function confirm(message:string,options:Options={}):Promise<boolean> {
    return await ask('confirm',message,options)!==null;
  }
  export async function alert(message:string,options:Options={}):Promise<void> {
    await ask('alert',message,options);
  }
  export function prompt(message:string,options:PromptOptions={}):Promise<string|null> {
    return ask('prompt',message,options);
  }
  let installed=false;
  export function install():void {
    if(installed)return;installed=true;
    let current:HTMLElement|null=null,opener:HTMLElement|null=null;
    let saved:{element:HTMLElement;inert:boolean}[]=[],previousOverflow='';
    function restore():void {for(const item of saved)item.element.inert=item.inert;saved=[];document.body.style.overflow=previousOverflow;}
    function update():void {
      if(pending)return;
      const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
      const next=dialogs.filter(element=>element.getClientRects().length>0).at(-1)||null;
      if(next===current)return;
      if(current){restore();current=null;if(!next&&opener?.isConnected)opener.focus({preventScroll:true});}
      if(!next){opener=null;return;}
      if(next.closest('.school-task')&&!next.querySelector('[data-task-minimize]')&&!next.querySelector('video')&&!next.closest('.camera-dialog')){
        const header=next.querySelector('.modal-header');
        if(header){
          const minimize=document.createElement('button');
          minimize.type='button';minimize.className='btn task-minimize';minimize.dataset.taskMinimize='';
          minimize.textContent='Minimizar';minimize.title='Manter o formulário aberto e voltar às guias';
          minimize.onclick=()=>{
            const backdrop=next.closest<HTMLElement>('.modal-backdrop');
            if(!backdrop)return;
            backdrop.dataset.taskPaused='';document.dispatchEvent(new Event('pige-pause-form'));
          };
          header.appendChild(minimize);
        }
      }
      opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
      current=next;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      let branch:HTMLElement=next;
      while(branch.parentElement){
        for(const sibling of Array.from(branch.parentElement.children)){
          if(sibling!==branch&&sibling instanceof HTMLElement){saved.push({element:sibling,inert:sibling.inert});sibling.inert=true;}
        }
        if(branch.parentElement===document.body)break;
        branch=branch.parentElement;
      }
      const heading=next.querySelector<HTMLElement>('[data-dialog-title]');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
      else next.querySelector<HTMLElement>('button,input,select,textarea')?.focus({preventScroll:true});
    }
    new MutationObserver(update).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-task-paused']});
    document.addEventListener('keydown',event=>{
      if(!current || pending)return;
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();current.querySelector<HTMLButtonElement>('[data-dialog-close]')?.click();return;}
      if(event.key!=='Tab')return;
      const controls=Array.from(current.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex="0"]'))
        .filter(el=>!el.matches(':disabled')&&el.getClientRects().length>0&&!el.closest('[inert]'));
      const first=controls[0],last=controls.at(-1);
      if(!first){event.preventDefault();return;}
      if(event.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement as HTMLElement))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement as HTMLElement))){event.preventDefault();first.focus();}
    },true);
    document.addEventListener('focusin',event=>{if(!pending&&current&&!current.contains(event.target as Node))current.querySelector<HTMLElement>('[data-dialog-title],button')?.focus();});
    update();
  }
}
