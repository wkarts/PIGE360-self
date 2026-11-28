/** Interação da faixa de guias compartilhada pelos portais da escola. */
namespace PigePortalTabs {
  let dismissClose:(()=>void)|undefined;
  export function cancelClose():void { dismissClose?.(); }
  export function confirmClose(home:string,drafts:string[]):Promise<boolean> {
    if(dismissClose)return Promise.resolve(false);
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const host=document.createElement('div');
    document.body.appendChild(host);
    return new Promise(resolve=>{
      function finish(accepted:boolean):void {
        if(dismissClose!==cancel)return;
        dismissClose=undefined;
        dialog.close();
        app.unmount();
        host.remove();
        if(opener?.isConnected)opener.focus({preventScroll:true});
        resolve(accepted);
      }
      const cancel=()=>finish(false);
      const app=Vue.createApp({render:PigeRenders.confirmTabs,setup:()=>({home,drafts,finish})});
      app.mount(host);
      const dialog=host.querySelector<HTMLDialogElement>('dialog')!;
      dialog.addEventListener('keydown',event=>{
        if(event.key!=='Tab')return;
        const buttons=dialog.querySelectorAll<HTMLButtonElement>('button');
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      });
      dismissClose=cancel;
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-work-close-back]')?.focus({preventScroll:true});
    });
  }
  export function reveal():void {
    void Vue.nextTick(()=>{
      const tab=window.document.querySelector<HTMLElement>('.work-tabs-list [role="tab"][aria-selected="true"]');
      const rail=tab?.closest<HTMLElement>('.work-tabs-list');
      if(!tab || !rail)return;
      const selected=tab.getBoundingClientRect(),viewport=rail.getBoundingClientRect();
      if(selected.left<viewport.left)rail.scrollLeft+=selected.left-viewport.left;
      else if(selected.right>viewport.right)rail.scrollLeft+=selected.right-viewport.right;
    });
  }
  export function keyTarget(event:KeyboardEvent,tabs:string[],section:string):string|undefined {
    if((event.target as HTMLElement).getAttribute('role')!=='tab')return;
    const i=tabs.indexOf(section),n=tabs.length;
    const index=({ArrowRight:(i+1)%n,ArrowLeft:(i+n-1)%n,Home:0,End:n-1} as Record<string,number>)[event.key];
    if(index===undefined)return;
    event.preventDefault();
    return tabs[index];
  }
}
