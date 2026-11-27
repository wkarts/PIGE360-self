namespace PigeFamilyCard {
  type Checkout = {id:string;status:string;mode:string;checkout_url:string;cycle:string;ends_on:string|null;first_due:string;payments:{id:string;status:string;value:string|number}[];quote:{charged_cents:number}};
  type Authorization = {status:string;active:boolean;ends_on:string;limit_cents:number};
  type View = {checkout:Checkout|null;can_authorize:boolean;terms_version:string;terms:string;authorization:Authorization|null};
  export function use(request:<T>(path:string,options?:RequestInit)=>Promise<T>,student:()=>string){
    const state=Vue.reactive({charge:'',view:null as View|null,loading:false,error:'',agreed:false,until:'',limit:'',revoke:false});
    let epoch=0;
    function clear(){epoch++;state.view=null;state.charge='';state.loading=false;state.error='';state.agreed=false;state.revoke=false;state.until='';state.limit='';}
    async function load(id:string){
      clear();const current=epoch,sid=student();state.charge=id;state.loading=true;
      try{
        const view=await request<View>('/family/students/'+sid+'/charges/'+id+'/cards');
        if(current===epoch&&student()===sid){state.view=view;state.limit=String((view.checkout?.quote.charged_cents||0)/100);}
      }catch(e){if(current===epoch)state.error=e instanceof Error?e.message:String(e);}
      finally{if(current===epoch)state.loading=false;}
    }
    async function submit(revoke=false){
      if(state.loading||!state.view||(!revoke&&!state.agreed)||(revoke&&!state.revoke))return;
      const current=epoch,sid=student(),id=state.charge;state.loading=true;state.error='';
      const body=revoke?{}:{terms_version:state.view.terms_version,accepted:state.agreed,ends_on:state.until,limit_cents:Math.round(Number(state.limit.replace(',','.'))*100)};
      try{await request('/family/students/'+sid+'/charges/'+id+'/cards/'+(revoke?'revoke':'authorize'),{method:'POST',body:JSON.stringify(body)});if(current===epoch&&student()===sid)await load(id);}
      catch(e){if(current===epoch)state.error=e instanceof Error?e.message:String(e);}
      finally{if(current===epoch)state.loading=false;}
    }
    function link(value:string):string{
      try{const url=new URL(value);return url.protocol==='https:'&&['asaas.com','sandbox.asaas.com'].includes(url.hostname)&&url.pathname==='/checkoutSession/show'&&!url.username&&!url.password&&!url.port&&/^[A-Za-z0-9_-]+$/.test(url.searchParams.get('id')||'')?url.href:'';}catch{return '';}
    }
    return {state,clear,load,submit,link};
  }
}
