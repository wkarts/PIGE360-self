/** Interação da faixa de guias compartilhada pelos portais da escola. */
namespace PigePortalTabs {
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
