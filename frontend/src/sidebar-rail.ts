/** Utiliza a própria lista do menu no painel lateral. Os links conservam ordem, filtros de acesso e ação. */
namespace PigeSidebarRail {
  export function use(collapsed:()=>boolean){
    const media=window.matchMedia?.('(width > 800px)');
    const state=Vue.reactive({desktop:media?.matches??true,active:''});
    const brand=Vue.reactive({failed:'',wide:''});
    let trigger:HTMLElement|null=null,panel:HTMLElement|null=null,pinned=false,suppressFocus=false;
    let leaveTimer:number|undefined;
    const enabled=()=>state.desktop&&collapsed();
    function brandLoad(e:Event){const img=e.currentTarget as HTMLImageElement;brand.failed='';brand.wide=img.naturalWidth>=2*img.naturalHeight?img.getAttribute('src')||'':'';}
    function brandError(e:Event){brand.failed=(e.currentTarget as HTMLImageElement).getAttribute('src')||'';brand.wide='';}
    function cancelLeave(){if(leaveTimer!==undefined){window.clearTimeout(leaveTimer);leaveTimer=undefined;}}
    function inside(node:EventTarget|null){return Boolean(node instanceof Node && (trigger?.contains(node)||panel?.contains(node)));}
    function outside(e:Event){if(!inside(e.target))close();}
    function dismiss(e:Event){if((e as KeyboardEvent).key==='Escape' && trigger){e.preventDefault();e.stopPropagation();close(true);}}
    function scroll(e:Event){if(!panel?.contains(e.target as Node))position();}
    function listen(add:boolean){
      const method=add?'addEventListener':'removeEventListener';
      document[method]('pointerdown',outside,true);document[method]('focusin',outside,true);
      document[method]('keydown',dismiss,true);document[method]('scroll',scroll,true);window[method]('resize',position);
    }
    function close(returnFocus=false){
      cancelLeave();const old=trigger;
      if(trigger)listen(false);
      if(panel?.hidePopover && panel.matches(':popover-open'))panel.hidePopover();
      trigger=null;panel=null;pinned=false;state.active='';
      if(returnFocus && old?.isConnected){
        suppressFocus=true;old.focus({preventScroll:true});suppressFocus=false;
      }
    }
    function position(){
      if(!trigger||!panel)return;
      const nav=trigger.closest('aside'),viewport=trigger.closest('.sidebar-scroll,.family-sidebar-scroll');
      if(!nav||!viewport||!trigger.isConnected||!enabled()){close();return;}
      const button=trigger.getBoundingClientRect(),bounds=viewport.getBoundingClientRect();
      if(button.bottom<=bounds.top||button.top>=bounds.bottom){close();return;}
      const left=Math.ceil(nav.getBoundingClientRect().right)+4;
      const top=Math.max(8,Math.min(button.top,window.innerHeight-8-panel.getBoundingClientRect().height));
      panel.style.setProperty('--rail-flyout-left',left+'px');
      panel.style.setProperty('--rail-flyout-top',Math.round(top)+'px');
    }
    function launcher(target:EventTarget|null){return target instanceof Element?target.closest<HTMLElement>('[data-rail-trigger]'):null;}
    function items(){return Array.from(panel?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')||[]).filter(el=>el.getClientRects().length);}
    function open(button:HTMLElement,focusFirst=false){
      if(!enabled())return;
      cancelLeave();
      if(button!==trigger){
        close();
        const group=button.parentElement?.querySelector<HTMLElement>('.sidebar-flyout');
        if(!group)return;
        trigger=button;panel=group;state.active=group.id;listen(true);
      }
      const current=panel;
      void Vue.nextTick(()=>{
        if(trigger!==button||panel!==current||!current?.isConnected)return;
        // O top layer do navegador deixa o painel escapar do recorte da rolagem da barra.
        if(current.showPopover && !current.matches(':popover-open'))current.showPopover();
        position();
        if(focusFirst && trigger===button)items()[0]?.focus({preventScroll:true});
      });
    }
    function pointerover(e:PointerEvent){
      if(e.pointerType==='touch'||!enabled())return;
      const btn=launcher(e.target);
      if(btn)open(btn);else if(inside(e.target))cancelLeave();
    }
    function pointerout(e:PointerEvent){
      if(!trigger||e.pointerType==='touch'||pinned||inside(e.relatedTarget)||panel?.contains(document.activeElement))return;
      cancelLeave();leaveTimer=window.setTimeout(()=>close(),180);
    }
    function focusin(e:FocusEvent){const btn=launcher(e.target);if(!suppressFocus&&btn)open(btn);else if(inside(e.target))cancelLeave();}
    function click(e:MouseEvent){
      if(!enabled())return;
      const btn=launcher(e.target);
      if(btn){if(btn===trigger && pinned){close();return;}open(btn,e.detail===0);pinned=true;}
      else if(panel?.contains(e.target as Node))close();
    }
    function keydown(e:KeyboardEvent){
      if(!enabled())return;
      const btn=launcher(e.target);
      if(e.key==='Escape' && trigger){e.preventDefault();e.stopPropagation();close(true);return;}
      if(btn&&['ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();open(btn,true);return;}
      if(!panel?.contains(e.target as Node))return;
      if(e.key==='ArrowLeft'){e.preventDefault();close(true);return;}
      const links=items(),n=links.length,index=links.indexOf(e.target as HTMLElement);
      if(!n||index<0)return;
      const to=({ArrowDown:(index+1)%n,ArrowUp:(index+n-1)%n,Home:0,End:n-1} as Record<string,number>)[e.key];
      if(to!==undefined){e.preventDefault();links[to].focus();}
    }
    function changeViewport(){close();state.desktop=media?.matches??true;}
    function mount(){changeViewport();media?.addEventListener('change',changeViewport);}
    function dispose(){close();media?.removeEventListener('change',changeViewport);}
    return {state,brand,enabled,close,mount,dispose,brandLoad,brandError,events:{pointerover,pointerout,focusin,keydown,click}};
  }
}
