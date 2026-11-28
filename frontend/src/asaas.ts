namespace PigeAsaas {
  type Mode = 'reports'|'monitor'|'cards'|'pix'|'charge'|'settings';
  type Props = {schoolId:string;mode:Mode;permissions:string[];charge?:PigeOnline.Charge & {collection_mode:string;manual_paid_amount?:string|null}};
  type Row = Record<string,unknown>;
  type Column = {key:string;label:string;type:string;visible?:boolean};
  type Filter = {key:string;label:string;type:string;required?:boolean;options?:Record<string,string>};
  type Report = {id:string;title:string;description:string;group:string;kind:string;columns:Column[];filters:Filter[];dates:Record<string,string>;defaults:Record<string,string>};
  type Output = {id:string;columns:Column[];items:Row[];total:number|null;offset:number;per_page:number;has_more:boolean;next_offset:number;environment:string;generated_at:string;filter_description:string};
  type Monitored = {id:string;charge_id?:string;label:string;status:string;amount?:string;date:string;reference:string};
  type Checkout = {id:string;charge_id:string;status:string;mode:string;quote?:{charged_cents:number};checkout_url?:string;cycle?:string;ends_on?:string;can_cancel?:boolean;payments?:Transaction[];max_installments?:number};
  type Mandate = {id:string;charge_id:string;status:string;amount:string;start_date:string;frequency:string;version:number;description?:string;payer_name?:string;cycles:{id:string;charge_id:string;due_on:string;status:string;instruction_status:string;amount:string}[]};
  type Comparison = {local_status:string;remote_status:string;local_amount:string;remote_amount:string;match:boolean;reason:string;remote_id:string};
  type Transaction = {id:string;status:string;dueDate:string;value:string};
  type Operation = {id:string;kind:string;charge_id:string;status:string;remote_id:string;error_code:string;updated_at:string};
  type Policy = {version:number|null;connection_id:string|null;settings:Record<string,string|number|boolean>};
  type Settings = {version:number;enabled:boolean;additional_holidays:string[]};
  const frequencies:Record<string,string>={WEEKLY:'Semanal',BIWEEKLY:'Quinzenal',MONTHLY:'Mensal',BIMONTHLY:'Bimestral',QUARTERLY:'Trimestral',SEMIANNUALLY:'Semestral',YEARLY:'Anual',ANNUALLY:'Anual'};
  const cardModes:Record<string,string>={detached:'À vista',installment:'Parcelado',recurrent:'Recorrente'};
  const statuses:Record<string,string>={
    creating:'Em criação',processing:'Em processamento',completed:'Concluída',failed:'Falhou',uncertain:'Confirmação pendente',
    subscription_cancelled:'Assinatura cancelada',cancellation_requested:'Cancelamento solicitado',invoice:'Débito autorizado',
    pix_auto_authorize:'Autorização de Pix Automático',pix_auto_cancel:'Cancelamento do Pix Automático',pix_auto_cycle:'Ciclo de Pix Automático',
    card_checkout:'Emissão de checkout',card_cancel:'Cancelamento de cartão',card_refund:'Estorno de cartão',card_invoice:'Débito em cartão autorizado',refund:'Estorno',
    adjust:'Ajuste de cobrança',reactivate:'Reativação de cobrança',cash_receipt:'Recebimento externo',queued:'Na fila',retry:'Nova tentativa agendada',
    open:'Aberto',paid:'Pago',expired:'Expirado',created:'Criado',sent:'Enviado',authorized:'Autorizado',awaiting_authorization:'Aguardando autorização',scheduled:'Agendado',done:'Concluído',denied:'Negado',blocked:'Bloqueado',error:'Erro',success:'Concluído',succeeded:'Concluído',bank_slip:'Boleto',boleto:'Boleto',credit_card:'Cartão de crédito',pix:'Pix',payment_received:'Pagamento recebido',payment_confirmed:'Pagamento confirmado',payment_overdue:'Pagamento vencido',payment_deleted:'Pagamento excluído',payment_created:'Pagamento criado',refund_requested:'Estorno solicitado'};
  function label(value:unknown):string {
    if(value==null||value==='')return '—';
    const key=String(value);
    return frequencies[key]||cardModes[key]||statuses[key.toLowerCase()]||PigeOnline.statuses[key.toLowerCase()]||key;
  }
  function display(value:unknown,type='text'):string {
    if(value==null||value==='')return '—';
    if(type==='money' && Number.isFinite(Number(value)))return PigeOnline.money(String(value));
    if(typeof value==='boolean')return value?'Sim':'Não';
    if(type==='status')return label(value);
    if(type==='date'&&/^\d{4}-\d{2}-\d{2}/.test(String(value)))return PigeOnline.date(String(value).slice(0,10));
    if(type==='datetime'&&/^\d{4}-\d{2}-\d{2}/.test(String(value)))return PigeOnline.dateTime(String(value));
    return typeof value==='object'?'—':String(value);
  }
  function checkoutLink(raw?:string):string {
    try{
      const url=new URL(raw||'');
      const id=url.searchParams.get('id')||'';
      if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash&&
         ['asaas.com','www.asaas.com','sandbox.asaas.com'].includes(url.hostname)&&url.pathname==='/checkoutSession/show'&&
         /^[A-Za-z0-9_-]{1,160}$/.test(id)&&url.search==='?id='+id)return url.href;
    }catch{/* Link ausente ou inválido. */}
    return '';
  }
  const enc=encodeURIComponent;
  export const component={props:['schoolId','mode','permissions','charge'],emits:['changed'],render:PigeRenders.asaas,
    setup(props:Props,ctx:{emit:(name:string)=>void}){
      const root='/schools/'+enc(props.schoolId),base=root+'/banking/asaas',cardBase=base+'/cards/checkouts';
      const can=(permission:string)=>props.permissions.includes(permission);
      const write=()=>can('banking.write');
      const manage=()=>props.permissions.includes('integrations.manage');
      const unpaid=()=>Math.max(0,Math.round(Number(props.charge?.amount||0)*100)-Math.round(Number(props.charge?.manual_paid_amount||0)*100))/100;
      const s=Vue.reactive({
        busy:false,error:'',warning:'',notice:'',loaded:false,reportId:'',catalog:[] as Report[],canExport:false,filters:{} as Record<string,string>,perPage:25,result:null as Output|null,extraColumns:false,
        section:'charges',q:'',status:'',start:'',end:'',dateBasis:'paymentDate',page:1,hasMore:false,total:null as number|null,monitorRows:[] as Monitored[],marked:[] as string[],comparison:null as Comparison|null,comparedCharge:'',op:null as Operation|null,operations:[] as Operation[],operationOffset:0,operationTotal:0,
        diag:null as {enabled:boolean;environment:string;webhook_registered:boolean;counts:Record<string,number>;checked_at:string}|null,
        cardRefund:null as null|{checkoutId:string;paymentId:string;amount:string;limit:string;reason:string;full:boolean},cardPage:1,cardTotal:0,cards:[] as Checkout[],cardMode:'detached',maxInstallments:2,cycle:'MONTHLY',endsOn:'',
        mandates:[] as Mandate[],pixPage:1,pixMore:false,refundAmount:'',refundReason:'',
        settings:null as Settings|null,holidays:'',chargeTab:'cards',policy:null as Policy|null,
        adjustAmount:props.charge?.amount||'',adjustDate:props.charge?.due_on||'',adjustDescription:props.charge?.description||'',adjustReason:'',cashAmount:props.charge?unpaid().toFixed(2):'',cashDate:'',cashReference:'',cashReason:'',reactivateReason:'',
        brand:'',quoteRecurring:false,quoteCount:1,quote:null as null|{principal_cents:number;charged_cents:number;surcharge_cents:number;estimated_fee_cents:number;installment_count:number},
      });
      let live=true,appliedFilters='';
      const intentKeys=new Map<string,string>();
      Vue.onUnmounted(()=>{live=false;});
      async function confirmBankAction(message:string,title:string,confirmLabel:string,allowed:()=>boolean,destructive=false){
        const school=props.schoolId,mode=props.mode,charge=props.charge;
        const chargeId=charge?.id,version=charge?.version;
        if(!allowed())return false;
        const approved=await PigeDialogs.confirm(message,{title,confirmLabel,destructive});
        return approved && live && root==='/schools/'+enc(props.schoolId) && props.schoolId===school &&
          props.mode===mode && props.charge?.id===chargeId && props.charge?.version===version && allowed();
      }
      const report=()=>s.catalog.find(item=>item.id===s.reportId);
      function resetReport(){
        const def=report();
        s.filters={...(def?.defaults||{})}; s.result=null;s.extraColumns=false;appliedFilters='';
        const dateKey=Object.keys(def?.dates||{})[0];
        if(dateKey&&!s.filters.date_field)s.filters.date_field=dateKey;
      }
      const groups=()=>[...new Set(s.catalog.map(item=>item.group))];
      function reportQuery(){
        const qs=new URLSearchParams();
        for(const [key,val] of Object.entries(s.filters))if(val!=='')qs.set(key,String(val));
        qs.set('per_page',String(s.perPage));
        return qs.toString();
      }
      async function run(action:()=>Promise<void>){
        if(!live||s.busy)return;
        s.busy=true;s.error='';s.warning='';s.notice='';
        try{await action();}catch(error){if(live&&(error as Error)?.name!=='AbortError')s.error=error instanceof Error?error.message:'Não foi possível concluir a operação.';}
        finally{if(live)s.busy=false;}
      }
      function consult(offset=0,newFilters=true){return run(async()=>{
        const def=report();if(!def||!can('asaas.reports.read'))return;
        if(newFilters){appliedFilters=reportQuery();s.result=null;}
        const result=await PigeAPI.request<Output>(base+'/reports/'+enc(def.id)+'?'+appliedFilters+'&offset='+offset);
        if(live)s.result=result;
      });}
      function exportReport(ext:'csv'|'pdf'){return run(async()=>{
        if(!s.result||!s.canExport||!can('asaas.reports.read')||!can('asaas.reports.export'))return;
        const offset=ext==='pdf'?s.result.offset:0;
        await PigeAPI.download(base+'/reports/'+enc(s.result.id)+'.'+ext+'?'+appliedFilters+'&offset='+offset,'asaas-'+s.result.id+'.'+ext);
      });}
      let monitorQuery='';
      async function loadMonitor(page=1,newFilters=false){
        if(!can('asaas.monitor.read'))return;
        if(newFilters){
          const query=new URLSearchParams({section:s.section,q:s.q,status:s.status});
          if(s.start)query.set('start',s.start);
          if(s.end)query.set('end',s.end);
          if(s.section==='remote')query.set('date_basis',s.dateBasis);
          monitorQuery=query.toString();s.monitorRows=[];s.marked=[];s.comparison=null;s.op=null;
        }
        const result=await PigeAPI.request<{items:Monitored[];has_more:boolean;page:number;total:number|null}>(base+'/monitor?'+monitorQuery+'&page='+page+'&page_size=30');
        if(!live)return;s.monitorRows=result.items;s.page=result.page;s.hasMore=result.has_more;s.total=result.total;s.marked=[];
      }
      async function loadOperations(offset=0){
        if(!can('asaas.monitor.read')||!props.charge)return;
        const query=new URLSearchParams({charge_id:props.charge.id,offset:String(offset),limit:'20'});
        const data=await PigeAPI.request<{items:Operation[];offset:number;total:number}>(base+'/operations?'+query);
        if(live){s.operations=data.items;s.operationOffset=data.offset;s.operationTotal=data.total;s.op=null;}
      }
      function inspectOp(id:string){return run(async()=>{
        if(can('asaas.monitor.read'))s.op=await PigeAPI.request<Operation>(base+'/operations/'+enc(id));
      });}
      function verifyOp(){return run(async()=>{
        if(!s.op||s.op.status!=='uncertain'||!can('asaas.monitor.read')||!can('asaas.reconcile'))return;
        const op=await PigeAPI.post<Operation>(base+'/operations/'+enc(s.op.id)+'/reconcile',{});
        if(props.mode==='charge')await loadOperations(s.operationOffset);else await loadMonitor(s.page);
        s.op=op;feedback(op.status,'Conferência no Asaas');
      });}
      function feedback(status:string|undefined,text:string){
        const code=(status||'').toLowerCase();
        if(['uncertain','creating','processing','cancellation_requested'].includes(code)){
          s.warning=text+' · '+label(code)+'. Consulte a situação antes de iniciar outra operação.';
        }else if(code==='failed')s.error=text+' · '+label(code)+'. Consulte os detalhes da operação.';
        else s.notice=text+(code?' · '+label(code):'')+'.';
      }
      function compare(id:string){return run(async()=>{if(!can('asaas.monitor.read'))return;s.comparison=null;s.comparedCharge=id;s.comparison=await PigeAPI.request<Comparison>(base+'/monitor/charges/'+enc(id)+'/compare');});}
      function reconcile(){return run(async()=>{
        if(!can('asaas.monitor.read')||!can('asaas.reconcile')||!s.marked.length)return;
        const out=await PigeAPI.post<{queued:number}>(base+'/monitor/reconcile',{charge_ids:[...s.marked]});
        await loadMonitor(s.page);s.notice=out.queued+' cobrança(s) enviada(s) para conciliação.';
      });}
      function diagnostics(){return run(async()=>{if(can('asaas.monitor.read'))s.diag=await PigeAPI.request<NonNullable<typeof s.diag>>(base+'/monitor/diagnostics');});}
      function intent(key:string):string{
        if(!intentKeys.has(key))intentKeys.set(key,PigeOnline.newId());
        return intentKeys.get(key)!;
      }
      function refund(){return run(async()=>{
        if(!can('asaas.monitor.read')||!can('asaas.refund')||!refundable()||!props.charge)return;
        const charge=props.charge,amount=s.refundAmount,description=s.refundReason.trim();
        if(!await confirmBankAction('Solicitar estorno de '+display(amount,'money')+' para esta cobrança?',
          'Estornar cobrança','Solicitar estorno',()=>can('asaas.monitor.read')&&can('asaas.refund')&&refundable(),true))return;
        const key='refund:'+charge.id+':'+amount+':'+description;
        const result=await PigeAPI.post<{status?:string}>(base+'/monitor/charges/'+enc(charge.id)+'/refund',{client_key:intent(key),amount,description});
        feedback(result.status,'Solicitação de estorno');
        if(live)ctx.emit('changed');
      });}
      async function loadCards(page=1){
        const query=new URLSearchParams({page:String(page),page_size:'25'});
        if(props.charge)query.set('charge_id',props.charge.id);
        const data=await PigeAPI.request<{items:Checkout[];total:number;page:number}>(cardBase+'?'+query);
        if(live){s.cards=data.items;s.cardPage=data.page;s.cardTotal=data.total;}
      }
      function createCard(){return run(async()=>{
        if(!write()||!props.charge||props.charge.collection_mode!=='manual'||!['pending','overdue'].includes(props.charge.status))return;
        const body:Row={charge_id:props.charge.id,mode:s.cardMode};
        if(s.cardMode==='installment')body.max_installments=s.maxInstallments;
        if(s.cardMode==='recurrent'){body.cycle=s.cycle;body.ends_on=s.endsOn;}
        body.client_key=intent(JSON.stringify(body));
        const result=await PigeAPI.post<Checkout>(cardBase,body);
        await loadCards();feedback(result.status,'Checkout');
        if(live)ctx.emit('changed');
      });}
      function updateCard(item:Checkout,action:'sync'|'cancel'){return run(async()=>{
        if(action==='sync'&&!can('asaas.reconcile'))return;
        if(action==='cancel' && !await confirmBankAction('Cancelar este checkout ou a recorrência vinculada?',
          'Cancelar checkout','Cancelar checkout',()=>write()&&Boolean(item.can_cancel),true))return;
        const body=action==='cancel'?{client_key:intent('card-cancel:'+item.id)}:{};
        const out=await PigeAPI.post<Checkout>(cardBase+'/'+enc(item.id)+'/'+action,body);
        await loadCards(s.cardPage);feedback(out.status,'Checkout');if(live)ctx.emit('changed');
      });}
      function cardReceipt(item:Checkout,payment:Transaction){return run(async()=>{
        if(!can('banking.read')||payment.status!=='RECEIVED')return;
        await PigeAPI.download(cardBase+'/'+enc(item.id)+'/payments/'+enc(payment.id)+'/receipt.pdf','comprovante-cartao.pdf');
      });}
      function cardRefundLimit(item:Checkout,payment:Transaction):number{
        if(!can('asaas.refund')||!can('asaas.monitor.read')||!['RECEIVED','CONFIRMED','PARTIALLY_REFUNDED'].includes(payment.status))return 0;
        if(item.mode!=='installment')return Math.round(Number(payment.value)*100);
        const payments=item.payments||[],total=payments.reduce((sum,p)=>sum+Math.round(Number(p.value)*100),0);
        if(payments[0]?.id!==payment.id||!payments.every(p=>['RECEIVED','CONFIRMED'].includes(p.status))||total!==item.quote?.charged_cents)return 0;
        return total;
      }
      function openCardRefund(item:Checkout,payment:Transaction){
        const cents=cardRefundLimit(item,payment);
        if(cents<=0)return;
        const amount=(cents/100).toFixed(2);
        s.cardRefund={checkoutId:item.id,paymentId:payment.id,amount,limit:amount,reason:'',full:item.mode==='installment'};
      }
      function refundCard(){return run(async()=>{
        const form=s.cardRefund;
        if(!form||!can('asaas.refund')||!can('asaas.monitor.read'))return;
        const payload={payment_id:form.paymentId,amount:form.amount,description:form.reason.trim()};
        if(!await confirmBankAction('Solicitar estorno de '+display(payload.amount,'money')+' na transação de cartão selecionada?',
          'Estornar transação do cartão','Solicitar estorno',()=>can('asaas.refund')&&can('asaas.monitor.read')&&s.cardRefund===form,true))return;
        const result=await PigeAPI.post<{status:string}>(cardBase+'/'+enc(form.checkoutId)+'/refund',{...payload,client_key:intent('card-refund:'+form.checkoutId+':'+JSON.stringify(payload))});
        s.cardRefund=null;await loadCards(s.cardPage);feedback(result.status,'Estorno no cartão');if(live)ctx.emit('changed');
      });}
      async function loadMandates(page=1){
        const query='?page='+page+(props.charge?'&charge_id='+enc(props.charge.id):'');
        const data=await PigeAPI.request<{items:Mandate[];has_more:boolean}>(base+'/pix-automatic/authorizations'+query);
        if(live){s.mandates=data.items;s.pixPage=page;s.pixMore=data.has_more;}
      }
      function pixAction(item:Mandate,action:'refresh'|'cancel'|'cycles'){return run(async()=>{
        if(!write())return;
        const version=item.version,allowed=()=>write()&&item.version===version;
        const body:Row=action==='refresh'?{}:{version};
        if(action==='cancel' && !await confirmBankAction('Solicitar o cancelamento desta autorização de Pix Automático?',
          'Cancelar autorização de Pix Automático','Cancelar autorização',allowed,true))return;
        if(action==='cycles'){
          const charge=props.charge;
          if(!charge || !await confirmBankAction('Agendar '+display(charge.amount,'money')+' para '+display(charge.due_on,'date')+' neste mandato?',
            'Agendar Pix Automático','Agendar pagamento',allowed))return;
          body.charge_id=charge.id;
        }
        const out=await PigeAPI.post<{status?:string}>(base+'/pix-automatic/authorizations/'+enc(item.id)+'/'+action,body);
        await loadMandates(s.pixPage);feedback(out.status,'Pix Automático');if(live)ctx.emit('changed');
      });}
      async function loadSettings(){const data=await PigeAPI.request<Settings>(base+'/pix-automatic/settings');if(live){s.settings=data;s.holidays=data.additional_holidays.join('\n');}}
      function saveSettings(){return run(async()=>{
        if(!manage()||!s.settings)return;
        const holidays=s.holidays.split(/[\s,;]+/).filter(Boolean);
        if(holidays.some(date=>!/^\d{4}-\d{2}-\d{2}$/.test(date)))throw new Error('Informe cada feriado como AAAA-MM-DD.');
        const saved=await PigeAPI.request<Settings>(base+'/pix-automatic/settings',{method:'PUT',body:JSON.stringify({enabled:s.settings.enabled,version:s.settings.version,additional_holidays:[...new Set(holidays)]})});
        s.settings=saved;s.holidays=saved.additional_holidays.join('\n');if(s.policy)s.policy.version=saved.version;s.notice='Configuração do Pix Automático salva.';
      });}
      const policyGroups=[
        {title:'Meios de pagamento',fields:[['pix_enabled','Pix','checkbox'],['boleto_enabled','Boleto','checkbox'],['card_enabled','Cartão','checkbox'],['card_recurring_enabled','Autorizações de cartão recorrente','checkbox'],['interest_percent','Juros (%)','percent'],['fine_percent','Multa (%)','percent'],['discount_type','Tipo de desconto','discount'],['discount_value','Desconto','decimal'],['single_minimum_after_discount','Mínimo líquido da escola para Pix ou boleto avulso em reais (0 desativa)','decimal'],['discount_days','Dias de antecedência do desconto','integer']]},
        {title:'Cartão e parcelamento',fields:[['max_installments','Máximo de parcelas','integer'],['card_fee_mode','Custo das taxas','payer'],['card_free_installments','Parcelas sem repasse','integer'],['card_min_installment','Parcela mínima (R$)','decimal'],['card_fee_fixed','Tarifa fixa (R$)','decimal'],['card_fee_fixed_mode','Aplicar tarifa fixa por','fixed'],['card_fee_percent_1','Taxa à vista (%)','percent'],['card_fee_percent_2_6','Taxa em 2–6 parcelas (%)','percent'],['card_fee_percent_7_12','Taxa em 7–12 parcelas (%)','percent'],['card_fee_percent_13_21','Taxa em 13–21 parcelas (%)','percent']]},
        {title:'Ciclo da cobrança',fields:[['sync_lifecycle','Sincronizar ciclo da cobrança','checkbox'],['sync_manual_settlement','Sincronizar recebimento externo','checkbox'],['cash_settlement_method','Quitação integral em dinheiro','cash']]},
        {title:'Conciliação periódica',fields:[
          ['periodic_reconciliation_enabled','Consultar cobranças automaticamente nesta conta','checkbox'],
          ['settled_review_days','Revisar recebimentos dos últimos dias (0 desativa)','integer','0','365'],
          ['reconciliation_batch_size','Máximo de cobranças por execução nesta escola','integer','1','100']
        ]},
        {title:'Antecipação',fields:[['card_anticipation_mode','Modalidade','anticipation'],['card_anticipation_manual_rate_1','Manual à vista (%)','percent'],['card_anticipation_manual_rate_installments','Manual parcelada (%)','percent'],['card_anticipation_automatic_rate_1','Automática à vista (%)','percent'],['card_anticipation_automatic_rate_installments','Automática parcelada (%)','percent'],['card_anticipation_first_days','Prazo inicial (dias)','integer']]},
      ];
      const choices:Record<string,Record<string,string>>={cash:{receive_in_cash:'Confirmar recebimento em dinheiro no Asaas',cancel:'Cancelar via em aberto no Asaas'},discount:{FIXED:'Valor fixo (R$)',PERCENTAGE:'Percentual (%)'},payer:{absorb:'Absorvidas pela instituição',customer:'Repassadas ao pagador'},fixed:{charge:'Cobrança',installment:'Parcela'},anticipation:{none:'Sem antecipação',manual:'Manual',automatic:'Automática'}};
      async function loadPolicy(){s.policy=await PigeAPI.request<Policy>(base+'/settings');}
      function savePolicy(){return run(async()=>{
        if(!manage()||!s.policy?.version)return;
        const saved=await PigeAPI.request<Policy>(base+'/settings',{method:'PUT',body:JSON.stringify({version:s.policy.version,settings:s.policy.settings})});
        s.policy=saved;if(s.settings&&saved.version)s.settings.version=saved.version;s.notice='Política bancária salva.';
      });}
      function adjust(){return run(async()=>{
        if(!props.charge||!write())return;
        const body={version:props.charge.version,amount:s.adjustAmount,due_on:s.adjustDate,description:s.adjustDescription,reason:s.adjustReason.trim()};
        if(!await confirmBankAction('Enviar os novos dados desta cobrança ao Asaas?',
          'Alterar cobrança no Asaas','Enviar alteração',write))return;
        const result=await PigeAPI.post<{status:string}>(base+'/charges/'+enc(props.charge.id)+'/adjust',{...body,client_key:intent('adjust:'+JSON.stringify(body))});
        feedback(result.status,'Ajuste da cobrança');if(live)ctx.emit('changed');
      });}
      function settlement(action:'cash-receipt'|'reactivate'){return run(async()=>{
        if(!write()||!props.charge)return;
        const cash=action==='cash-receipt';
        const body:Row={version:props.charge.version,reason:cash?s.cashReason:s.reactivateReason};
        if(cash){body.amount=s.cashAmount;body.paid_on=s.cashDate;body.reference=s.cashReference;}
        const confirmation=cash?'Registrar recebimento externo de '+display(s.cashAmount,'money')+' nesta cobrança?':'Solicitar a reativação desta cobrança no Asaas?';
        if(!await confirmBankAction(confirmation,cash?'Registrar recebimento externo':'Reativar cobrança',
          cash?'Registrar recebimento':'Solicitar reativação',write))return;
        body.client_key=intent(action+':'+JSON.stringify(body));
        const result=await PigeAPI.post<{status:string}>(base+'/charges/'+enc(props.charge.id)+'/'+action,body);
        feedback(result.status,cash?'Recebimento externo':'Reativação');if(live)ctx.emit('changed');
      });}
      function simulate(){return run(async()=>{
        if(!props.charge)return;
        s.quote=null;s.quote=await PigeAPI.post<NonNullable<typeof s.quote>>(base+'/quote',{amount:props.charge.amount,installments:s.quoteCount,recurring:s.quoteRecurring,...(s.brand?{brand:s.brand}:{})});
      });}
      async function initialize(){
        s.loaded=false;
        if(props.mode==='reports'&&can('asaas.reports.read')){
          const data=await PigeAPI.request<{items:Report[];can_export:boolean}>(base+'/reports/catalog');
          if(!live)return;s.catalog=data.items;s.canExport=data.can_export;
          s.reportId=s.catalog.find(x=>x.id==='statement')?.id||s.catalog[0]?.id||'';resetReport();
        }else if(props.mode==='monitor')await loadMonitor(1,true);
        else if(props.mode==='settings'&&manage())await Promise.all([loadSettings(),loadPolicy()]);
        else if(props.mode==='charge'&&s.chargeTab==='history')await loadOperations();
        else if(props.mode==='pix'||(props.mode==='charge'&&s.chargeTab==='pix'))await loadMandates();
        else if(props.mode==='cards'||(props.mode==='charge'&&s.chargeTab==='cards'))await loadCards();
        if(live)s.loaded=true;
      }
      function chargeTab(tab:string){return run(async()=>{s.chargeTab=tab;s.comparison=null;s.op=null;await initialize();});}
      const refundable=()=>Boolean(props.charge?.remote_payment_id && props.charge.collection_mode==='provider' && ['PIX','CREDIT_CARD'].includes(props.charge.billing_type) && ['received','confirmed','partially_refunded'].includes(props.charge.status));
      if(props.mode==='charge'){
        s.refundAmount=props.charge?.amount||'';s.chargeTab=props.charge?.collection_mode==='manual'?'cards':'review';
      }
      Vue.onMounted(()=>{void run(initialize);});
      return {props,s,can,unpaid,loadOperations,verifyOp,cardReceipt,cardRefundLimit,openCardRefund,refundCard,policyGroups,choices,savePolicy,adjust,settlement,simulate,write,manage,report,groups,initialize,resetReport,consult,exportReport,display,label,checkoutLink,run,loadMonitor,inspectOp,compare,reconcile,diagnostics,cardModes,frequencies,loadCards,createCard,updateCard,loadMandates,pixAction,saveSettings,chargeTab,refundable,refund};
    }
  };
}
