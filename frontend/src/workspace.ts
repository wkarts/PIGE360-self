/** Acessibilidade e rolagem do shell. Não interfere no estado dos cadastros.
 * A interface Vue continua sendo a fonte de verdade da abertura e das rotas.
 */
namespace PigeWorkspace {
  export function install():void {
    const root=document.querySelector<HTMLElement>('#app');
    if(!root)return;
    const compact=window.matchMedia('(max-width: 800px)');
    let opened=false;
    let previousPage='';
    let locked:HTMLElement|null=null;
    let wasInert=false;
    let pendingFocus=0;
    const sidebar=()=>root.querySelector<HTMLElement>('#school-navigation');
    const toggle=()=>root.querySelector<HTMLButtonElement>('.menu-button');
    const hasDialog=()=>Boolean(root.querySelector('[role="dialog"][aria-modal="true"]'));
    function restore():void {
      if(locked){locked.inert=wasInert;locked=null;}
    }
    function focusContent():void {
      if(hasDialog())return;
      const main=root!.querySelector<HTMLElement>('#main-content');
      if(!main||main.inert)return;
      const heading=main.querySelector<HTMLElement>('.page-header h1');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
      else main.focus({preventScroll:true});
    }
    function close():void {
      // Aciona o manipulador Vue existente, sem duplicar estado de navegação.
      if(sidebar()?.classList.contains('visible'))toggle()?.click();
    }
    function controls():HTMLElement[] {
      return Array.from(sidebar()?.querySelectorAll<HTMLElement>('a[href],button,[tabindex="0"]')||[])
        .filter(el=>!el.matches(':disabled')&&!el.closest('[inert]')&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
    }
    function sync():void {
      const nav=sidebar();
      if(!nav){restore();opened=false;previousPage='';return;}
      const page=nav.querySelector<HTMLAnchorElement>('nav a[aria-current="page"]')?.getAttribute('href')||'';
      const changed=Boolean(previousPage&&page&&page!==previousPage);
      if(page)previousPage=page;
      const visible=compact.matches&&nav.classList.contains('visible');
      if(visible&&!opened){
        locked=root!.querySelector<HTMLElement>('.main-column');
        if(locked){wasInert=locked.inert;locked.inert=true;}
        // Botão de fechar sempre visível; o restante continua alcançável por Tab.
        requestAnimationFrame(()=>{
          if(opened&&nav.isConnected&&!hasDialog())nav.querySelector<HTMLElement>('.sidebar-close')?.focus({preventScroll:true});
        });
      }else if(!visible&&opened){
        restore();
        if(!hasDialog()){
          if(compact.matches&&!changed)toggle()?.focus({preventScroll:true});
          else focusContent();
        }
      }
      opened=visible;
      if(changed){
        const main=root!.querySelector<HTMLElement>('#main-content');
        if(main)main.scrollTop=0;
        cancelAnimationFrame(pendingFocus);
        pendingFocus=requestAnimationFrame(()=>{if(!opened)focusContent();});
      }
    }
    root.addEventListener('click',event=>{
      if((event.target as Element).closest('[data-focus-content]')){event.preventDefault();focusContent();}
    });
    document.addEventListener('keydown',event=>{
      if(!opened||hasDialog())return;
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
      if(event.key!=='Tab')return;
      const items=controls(),first=items[0],last=items.at(-1);
      if(!first){event.preventDefault();return;}
      const active=document.activeElement as HTMLElement;
      if(event.shiftKey&&(active===first||!items.includes(active))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(active===last||!items.includes(active))){event.preventDefault();first.focus();}
    },true);
    document.addEventListener('focusin',event=>{
      if(opened&&!hasDialog()&&!sidebar()?.contains(event.target as Node))controls()[0]?.focus({preventScroll:true});
    });
    compact.addEventListener('change',()=>{if(!compact.matches)close();sync();});
    new MutationObserver(sync).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current']});
    sync();
  }
  // Scripts defer encontram #app antes de a aplicação Vue montar o workspace.
  // O observador acompanha login/logout sem reconstruir ou mover o DOM do Vue.
  if(typeof document!=='undefined'&&document.body)install();
}
