/** Segredos transitórios ficam apenas na memória da tela, nunca no armazenamento do navegador. */
namespace PigeMFA {
  type Result = Record<string, unknown>;
  type Requester = <T>(path:string, options?:RequestInit)=>Promise<T>;
  export const state = Vue.reactive({challenge:'',enrolling:false,secret:'',qr:'',code:'',password:'',busy:false,error:'',codes:[] as string[],status:{enabled:false,required:false,recovery_remaining:0},managed:false});
  let requester:Requester;
  let onAuthenticated:(result:Result)=>Promise<void>;
  let onLogout:()=>Promise<void>;
  let prefix='/auth';
  let pending:Result|null=null;
  export function init(request:Requester,authenticated:(result:Result)=>Promise<void>,logout:()=>Promise<void>,portal=false):void{requester=request;onAuthenticated=authenticated;onLogout=logout;prefix=portal?'/portal':'/auth';}
  function post<T>(path:string,data:unknown):Promise<T>{return requester<T>(path,{method:'POST',body:JSON.stringify(data)});}
  export function clear():void{state.challenge='';state.secret='';state.qr='';state.code='';state.password='';state.codes=[];state.error='';pending=null;}
  async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await action();}catch(e){state.error=e instanceof Error?e.message:String(e);}finally{state.busy=false;}}
  export async function accept(result:Result):Promise<boolean>{
    if(!result.mfa_required)return false;
    clear();state.challenge=String(result.mfa_token);state.enrolling=Boolean(result.enrollment_required);
    if(state.enrolling){try{const data=await post<Result>('/auth/mfa/challenge',{token:state.challenge});state.secret=String(data.secret||'');state.qr=String(data.qr||'');}catch(error){state.error=error instanceof Error?error.message:String(error);}}
    return true;
  }
  export async function finish():Promise<void>{await run(async()=>{
    const result=await post<Result>('/auth/mfa/verify',{token:state.challenge,code:state.code});state.code='';state.secret='';state.qr='';state.enrolling=false;
    if(Array.isArray(result.recovery_codes)){state.codes=result.recovery_codes.map(String);pending=result;return;}
    clear();await onAuthenticated(result);
  });}
  export async function acknowledge():Promise<void>{await run(async()=>{const result=pending;clear();if(result)await onAuthenticated(result);else await refresh();});}
  export async function cancel():Promise<void>{if(state.busy)return;if(state.codes.length&&pending){await acknowledge();return;}await run(async()=>{if(state.challenge)await post('/auth/mfa/cancel',{token:state.challenge});clear();});}
  export async function refresh():Promise<void>{state.status=await requester<typeof state.status>(prefix+'/mfa');}
  export async function manage():Promise<void>{clear();state.managed=true;await run(refresh);}
  export async function enroll():Promise<void>{await run(async()=>{const result=await post<Result>(prefix+'/mfa/enroll',{current_password:state.password});await accept(result);});}
  export async function disable():Promise<void>{await run(async()=>{await post(prefix+'/mfa/disable',{current_password:state.password,code:state.code});clear();await onLogout();});}
  export async function recovery():Promise<void>{await run(async()=>{const result=await post<Result>(prefix+'/mfa/recovery',{current_password:state.password,code:state.code});state.codes=(result.recovery_codes as string[]);state.password='';state.code='';});}
  export function downloadCodes():void{const content='Códigos de recuperação — '+PigeInstitution.state.display_name+'\nCada código pode ser utilizado uma única vez. Guarde em local seguro.\n\n'+state.codes.join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='codigos-de-recuperacao.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
