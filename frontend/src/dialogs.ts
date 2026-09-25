namespace PigeDialogs {
  let installed=false;
  export function install():void {
    if(installed)return;installed=true;
    let current:HTMLElement|null=null,opener:HTMLElement|null=null;
    let saved:{element:HTMLElement;inert:boolean}[]=[],previousOverflow='';
    function restore():void {for(const item of saved)item.element.inert=item.inert;saved=[];document.body.style.overflow=previousOverflow;}
    function update():void {
      const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
      const next=dialogs.filter(element=>element.getClientRects().length>0).at(-1)||null;
      if(next===current)return;
      if(current){restore();current=null;if(!next&&opener?.isConnected)opener.focus({preventScroll:true});}
      if(!next){opener=null;return;}
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
    new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('keydown',event=>{
      if(!current)return;
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();current.querySelector<HTMLButtonElement>('[data-dialog-close]')?.click();return;}
      if(event.key!=='Tab')return;
      const controls=Array.from(current.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex="0"]'))
        .filter(el=>!el.matches(':disabled')&&el.getClientRects().length>0&&!el.closest('[inert]'));
      const first=controls[0],last=controls.at(-1);
      if(!first){event.preventDefault();return;}
      if(event.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement as HTMLElement))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement as HTMLElement))){event.preventDefault();first.focus();}
    },true);
    document.addEventListener('focusin',event=>{if(current&&!current.contains(event.target as Node))current.querySelector<HTMLElement>('[data-dialog-title],button')?.focus();});
    update();
  }
}
