namespace PigeContractFields {
  export type Options={required?:boolean;input_type?:string|null};
  export type Meta={label:string;input_type:string;required:boolean;automatic:boolean;source:string;input_value:string;min?:number;max?:number|null};
  export type Preview={header:string;content:string;footer:string;variables:Record<string,string>;missing_fields:string[];omitted_fields?:string[];field_meta?:Record<string,Meta>;template_version:number};
  export const kinds=[{value:'text',label:'Texto'},{value:'date',label:'Data · calendário'},{value:'money',label:'Valor em reais'},{value:'integer',label:'Número inteiro'},{value:'cpf',label:'CPF'},{value:'cep',label:'CEP'},{value:'email',label:'E-mail'},{value:'uf',label:'UF'},{value:'phone',label:'Telefone'}];
  export const groups=['Escola e matrícula','Aluno','Contratante I','Condições financeiras','Local e data','Contratante II','Testemunhas','Outros'];
  export function group(key:string):string{return key.startsWith('aluno.')?'Aluno':key.startsWith('contratante1.')?'Contratante I':key.startsWith('contratante2.')?'Contratante II':key.startsWith('financeiro.')?'Condições financeiras':key.startsWith('assinatura.')?'Local e data':key.startsWith('testemunha')?'Testemunhas':/^(escola|matricula)\./.test(key)?'Escola e matrícula':'Outros';}
  export function infer(key:string):string{const last=key.split('.').pop()||'';return ['nascimento','data'].includes(last)?'date':['cpf','cep','email','uf'].includes(last)?last:['phone','telefone'].includes(last)?'phone':['financeiro.anuidade','financeiro.valor_parcela'].includes(key)?'money':['financeiro.parcelas','financeiro.dia_vencimento'].includes(key)?'integer':'text';}
  export function meta(preview:Preview|null,key:string,label:string):Meta{return preview?.field_meta?.[key]||{label,input_type:infer(key),required:Boolean(preview?.missing_fields.includes(key)),automatic:Boolean(preview?.variables[key]),source:preview?.variables[key]?'cadastro':'não informado',input_value:preview?.variables[key]||''};}
  export function display(value:string,kind:string):string{if(kind==='date'&&/^\d{2}\/\d{2}\/\d{4}$/.test(value))return value.split('/').reverse().join('-');return value;}
  export const component={props:['field','value','locked'],emits:['change'],render:PigeRenders.contractValue,setup(props:{field:Meta;value:string;locked?:boolean},context:{emit:(event:string,value:string)=>void}){
    const states='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
    function change(event:Event):void{const target=event.target as HTMLInputElement;let value=target.value;
      if(props.field.input_type==='cpf'){const d=value.replace(/\D/g,'').slice(0,11);value=d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');}
      if(props.field.input_type==='cep')value=value.replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2');
      target.value=value;context.emit('change',value);
    }
    function moneyBlur(event:Event):void{if(props.field.input_type!=='money'||props.locked)return;const target=event.target as HTMLInputElement;const raw=target.value.trim().replace(/^R\$\s*/, '');const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))return;const parts=normalized.split('.');const formatted=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+(parts[1]||'').padEnd(2,'0');if(formatted!==target.value){target.value=formatted;context.emit('change',formatted);}}
    const nativeType=()=>({date:'date',integer:'number',email:'email',phone:'tel'}[props.field.input_type]||'text');
    const mode=()=>['cpf','cep','integer','phone'].includes(props.field.input_type)?'numeric':props.field.input_type==='money'?'decimal':undefined;
    return{props,states,change,moneyBlur,nativeType,mode,display};
  }};
}
