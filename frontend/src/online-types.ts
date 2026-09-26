namespace PigeOnline {
  export interface Entity { id:string; version:number; created_at:string }
  export interface Account extends Entity {birth_date?:string|null;rg?:string;rg_issuer?:string;birth_certificate?:string;mother_name?:string;father_name?:string;postal_code?:string;street?:string;address_number?:string;address_complement?:string;district?:string;city?:string;state?:string;country?:string;school_id:string; name:string; email:string; cpf:string|null; phone:string; address:string; email_verified:boolean;phone_verified:boolean;whatsapp_opt_in:boolean}
  export interface Person {rg?:string;rg_issuer?:string;birth_certificate?:string;mother_name?:string;father_name?:string;postal_code?:string;street?:string;address_number?:string;address_complement?:string;district?:string;city?:string;state?:string;country?:string;name:string;social_name:string;cpf:string|null;birth_date:string|null;email:string;phone:string;address:string;notes:string;is_guardian:boolean;previous_school?:string}
  export interface Group {id:string;name:string;grade:string;shift:string;year:string;unit:string;vacancies:number}
  export interface Campaign extends Entity {slug:string;title:string;instructions:string;privacy_notice:string;terms_version:string;class_group_ids:string[];opens_on:string;closes_on:string;active:boolean;require_verified_contact:boolean;require_documents:boolean;require_payment_before_enrollment:boolean;school_name:string;school_id:string;groups:Group[];accepting:boolean}
  export interface DocType {id:string;name:string;required:boolean}
  export interface Attachment extends Entity {document_type_id:string;original_name:string;sha256:string;mime_type:string;size:number;review_status:string;review_note:string}
  export interface Message extends Entity {text:string;internal:boolean;kind:string;actor_id:string|null;account_id:string|null}
  export interface Issued extends Entity {kind:string;file_id:string}
  export interface Admission extends Entity {campaign_id:string;account_id:string;number:string;class_group_id:string;student_data:Person;guardian_snapshot:Partial<Account>;relationship:string;notes:string;status:string;status_label:string;campaign_title:string;class_name:string;attachments:Attachment[];messages:Message[];document_types:DocType[];account?:Account;enrollment_id:string|null;student_id:string|null;enrollment?:{id:string;number:string;status:string};issued_documents:Issued[];consent:{terms_version?:string;accepted_at?:string;legal_responsibility?:boolean}}
  export interface Page<T> {items:T[];total:number;page:number;page_size:number}
  export interface ConnectConfig {base_url:string;instance:string;send_text_path:string;connection_state_path:string;api_key_header:string;auth_scheme:string;number_field:string;text_field:string;message_id_path:string;contract_confirmed:boolean}
  export interface Connection extends Entity {provider:string;enabled:boolean;environment:string;config:Partial<ConnectConfig>;api_key_configured:boolean;webhook_token_configured:boolean;webhook_path:string;last_test_ok:boolean|null;last_test_at:string|null}
  export interface Job extends Entity {kind:string;status:string;attempts:number;error_code:string;delivery_status:string;remote_id:string}
  export interface Charge extends Entity {admission_id:string|null;enrollment_id:string|null;description:string;amount:string;due_on:string;billing_type:string;required_for_enrollment:boolean;status:string;remote_payment_id:string|null;invoice_url:string;bank_slip_url:string;pix_copy_paste:string;pix_image:string;pix_expires_at:string;payer_snapshot?:Partial<Account>}
  export interface BankEvent extends Entity {source:string;previous_status:string;status:string}
  export const statuses:Record<string,string>={draft:'Rascunho',submitted:'Enviada',under_review:'Em análise',changes_requested:'Correção solicitada',waitlisted:'Lista de espera',approved:'Aprovada / em preparação',enrolled:'Matriculada',rejected:'Indeferida',withdrawn:'Desistência',queued:'Na fila',pending:'Aguardando',processing:'Processando',completed:'Concluído',confirmed:'Confirmado / aguardando recebimento',received:'Recebido',received_external:'Baixa externa (não bancária)',overdue:'Vencido',cancelled:'Cancelado',refunded:'Estornado',refund_requested:'Estorno em análise',partially_refunded:'Estorno parcial',disputed:'Em disputa',awaiting_review:'Conferência necessária',failed:'Falhou',uncertain:'Resultado incerto',retry:'Nova tentativa programada',validated:'Validado',sent:'Enviada ao provedor',delivered:'Entregue',read:'Lida',active:'Ativa'};
  export function label(value:string):string{return statuses[value]||value;}
  export function date(value:string|undefined):string{return value?new Date(value.length===10?value+'T12:00:00Z':value).toLocaleDateString('pt-BR',{timeZone:'America/Bahia'}):'—';}
  export function money(value:string):string{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));}
  // A chave de idempotência não é credencial. getRandomValues também permite
  // validação local; produção continua exigindo HTTPS para sessão/PWA.
  export function newId():string {
    const bytes=crypto.getRandomValues(new Uint8Array(16));
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  export function person():Person{return {name:'',social_name:'',cpf:null,birth_date:null,email:'',phone:'',address:'',notes:'',is_guardian:false};}
  export function publicURL(slug:string):string{return location.origin+'/online.html?campaign='+encodeURIComponent(slug);}
  export function safeLink(value:string):string{try{const u=new URL(value);return u.protocol==='https:'&&!u.username?u.href:'';}catch{return '';}}
}
