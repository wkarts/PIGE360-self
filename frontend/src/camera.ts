/** Câmera compartilhada: quadro inteiro, resolução do sensor e confirmação local. */
namespace PigeCamera {
  interface Props {mode:'document'|'portrait';contextKey:string;title:string;maxBytes:number;filename:string}
  interface Device {id:string;label:string}
  interface ExtraCapabilities {zoom?:{min:number;max:number;step:number};torch?:boolean}
  interface ExtraConstraints extends MediaTrackConstraintSet {zoom?:number;torch?:boolean}
  interface PhotoCapture {takePhoto:()=>Promise<Blob>}
  interface PhotoWindow extends Window {ImageCapture?:new(track:MediaStreamTrack)=>PhotoCapture}
  let counter=0;
  export const component={
    props:{mode:{type:String,default:'document'},contextKey:{type:String,default:''},title:{type:String,default:''},maxBytes:{type:Number,default:10485760},filename:{type:String,default:''}},
    emits:['captured','close'],render:PigeRenders.camera,
    setup(props:Props,{emit}:{emit:(event:string,data?:unknown)=>void}){
      const id='capture-'+(++counter);
      const s=Vue.reactive({busy:false,ready:false,error:'',notice:'',preview:'',facing:props.mode==='portrait'?'user':'environment',deviceId:'',devices:[] as Device[],width:0,height:0,zoom:1,zoomMin:1,zoomMax:1,zoomStep:.1,torch:false,hasTorch:false,guideWidth:0,guideHeight:0});
      let stream:MediaStream|null=null,photo:File|null=null,epoch=0,disposed=false;
      let opener:HTMLElement|null=null,previousOverflow='',observer:ResizeObserver|null=null;
      const title=()=>props.title||(props.mode==='portrait'?'Fotografar pessoa':'Fotografar documento');
      function video():HTMLVideoElement|null{return document.getElementById(id+'-video') as HTMLVideoElement|null;}
      function updateFrame():void{const v=video();if(!v?.videoWidth||!v.videoHeight)return;s.width=v.videoWidth;s.height=v.videoHeight;const scale=Math.min(v.clientWidth/v.videoWidth,v.clientHeight/v.videoHeight),width=v.videoWidth*scale,height=v.videoHeight*scale;s.guideHeight=height*.84;s.guideWidth=props.mode==='portrait'?Math.min(width*.62,s.guideHeight*.72):width*.88;}
      function stopStream():void{stream?.getTracks().forEach(t=>t.stop());stream=null;const v=video();if(v)v.srcObject=null;s.ready=false;s.torch=false;s.hasTorch=false;}
      function clearPhoto():void{if(s.preview)URL.revokeObjectURL(s.preview);s.preview='';photo=null;}
      function message(error:unknown):string{
        const name=error instanceof DOMException?error.name:(error as {name?:string})?.name||'';
        if(name==='NotAllowedError'||name==='PermissionDeniedError')return 'A câmera não foi autorizada. Libere a permissão do navegador e tente novamente, ou escolha um arquivo.';
        if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'Nenhuma câmera foi encontrada neste dispositivo. Conecte uma câmera ou escolha um arquivo.';
        if(name==='NotReadableError'||name==='TrackStartError')return 'A câmera está ocupada ou indisponível. Feche outros aplicativos que usam a câmera e tente novamente.';
        if(name==='OverconstrainedError')return 'Esta câmera não aceitou a configuração. Tente outra câmera ou escolha um arquivo.';
        return error instanceof Error?error.message:'Não foi possível abrir a câmera. Tente novamente ou escolha um arquivo.';
      }
      async function start():Promise<void>{
        const stamp=++epoch;observer?.disconnect();stopStream();clearPhoto();s.busy=true;s.error='';s.notice='';s.width=0;s.height=0;
        try{
          if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Para usar a câmera, abra a aplicação por HTTPS. Você também pode escolher um arquivo do dispositivo.');
          const constraints:MediaTrackConstraints={width:{ideal:3840},height:{ideal:2160},...(s.deviceId?{deviceId:{exact:s.deviceId}}:{facingMode:{ideal:s.facing}})};
          const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:constraints});
          if(disposed||stamp!==epoch){acquired.getTracks().forEach(t=>t.stop());return;}
          stream=acquired;const track=acquired.getVideoTracks()[0];
          if(!track)throw new Error('Não foi possível receber a imagem desta câmera.');
          track.addEventListener('ended',()=>{if(stream===acquired){s.ready=false;s.error='A câmera foi desconectada. Tente novamente ou escolha um arquivo.';}});
          const capabilities=track.getCapabilities?.() as (MediaTrackCapabilities&ExtraCapabilities)|undefined;
          s.zoomMin=capabilities?.zoom?.min??1;s.zoomMax=capabilities?.zoom?.max??1;s.zoomStep=capabilities?.zoom?.step||.1;s.zoom=s.zoomMin;s.hasTorch=Boolean(capabilities?.torch);
          await Vue.nextTick();const element=video();if(!element)throw new Error('A câmera não está disponível nesta tela.');
          element.srcObject=acquired;await element.play();
          if(disposed||stamp!==epoch){acquired.getTracks().forEach(t=>t.stop());return;}
          s.width=element.videoWidth;s.height=element.videoHeight;s.ready=Boolean(s.width&&s.height);updateFrame();observer?.disconnect();observer=new ResizeObserver(updateFrame);observer.observe(element);
          const devices=await navigator.mediaDevices.enumerateDevices();
          if(disposed||stamp!==epoch)return;
          s.devices=devices.filter(d=>d.kind==='videoinput').map((d,index)=>({id:d.deviceId,label:d.label||'Câmera '+(index+1)}));
          const settings=track.getSettings();s.deviceId=settings.deviceId||s.deviceId;
          if(settings.facingMode)s.facing=settings.facingMode;
        }catch(error){if(stamp===epoch&&!disposed){stopStream();s.error=message(error);}}
        finally{if(stamp===epoch&&!disposed)s.busy=false;}
      }
      async function changeCamera():Promise<void>{if(s.busy)return;await start();}
      async function flip():Promise<void>{if(s.busy)return;
        if(s.devices.length>1){const index=s.devices.findIndex(d=>d.id===s.deviceId);s.deviceId=s.devices[(index+1)%s.devices.length].id;}
        else{s.deviceId='';s.facing=s.facing==='user'?'environment':'user';}
        await start();
      }
      async function zoom():Promise<void>{const track=stream?.getVideoTracks()[0];if(!track)return;try{await track.applyConstraints({advanced:[{zoom:Number(s.zoom)} as ExtraConstraints]});}catch{s.notice='Esta câmera não permite ajustar a aproximação.';}}
      async function torch():Promise<void>{const track=stream?.getVideoTracks()[0];if(!track||s.busy)return;try{await track.applyConstraints({advanced:[{torch:!s.torch} as ExtraConstraints]});s.torch=!s.torch;}catch{s.notice='A iluminação não está disponível nesta câmera.';}}
      async function encode(source:CanvasImageSource,width:number,height:number,turn=false):Promise<File>{
        const canvas=document.createElement('canvas');const scale=Math.min(1,Math.sqrt((props.mode==='portrait'?16000000:30000000)/(width*height)));
        canvas.width=Math.max(1,Math.floor((turn?height:width)*scale));canvas.height=Math.max(1,Math.floor((turn?width:height)*scale));
        const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar a fotografia.');
        if(turn){context.translate(canvas.width,0);context.rotate(Math.PI/2);context.drawImage(source,0,0,canvas.height,canvas.width);}else context.drawImage(source,0,0,canvas.width,canvas.height);
        const limit=Math.max(131072,props.maxBytes);let quality=.94;
        for(let attempt=0;attempt<12;attempt++){
          const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
          if(!blob)throw new Error('Não foi possível preparar a fotografia. Tente novamente.');
          if(blob.size<=limit){s.width=canvas.width;s.height=canvas.height;const prefix=(props.filename||(props.mode==='portrait'?'foto':'documento')).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60)||'captura';const stamp=new Date().toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15);return new File([blob],prefix+'-'+stamp+'.jpg',{type:'image/jpeg'});}
          if(quality>.78){quality-=.08;continue;}
          const copy=document.createElement('canvas');copy.width=Math.max(1,Math.floor(canvas.width*.82));copy.height=Math.max(1,Math.floor(canvas.height*.82));copy.getContext('2d')!.drawImage(canvas,0,0,copy.width,copy.height);canvas.width=copy.width;canvas.height=copy.height;context.drawImage(copy,0,0);quality=.9;
        }
        throw new Error('A fotografia ficou muito grande. Escolha uma imagem menor.');
      }
      async function fromBlob(blob:Blob,turn=false):Promise<File>{const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();return await encode(image,image.naturalWidth,image.naturalHeight,turn);}finally{URL.revokeObjectURL(url);}}
      async function capture():Promise<void>{if(s.busy||!s.ready)return;const element=video(),track=stream?.getVideoTracks()[0];if(!element?.videoWidth||!track)return;
        s.busy=true;s.error='';const stamp=epoch;
        try{let result:File|null=null;const Photo=(window as PhotoWindow).ImageCapture;
          if(Photo){try{result=await fromBlob(await new Photo(track).takePhoto());}catch{/* Alguns navegadores só oferecem captura do fluxo. */}}
          if(!result)result=await encode(element,element.videoWidth,element.videoHeight);
          if(disposed||stamp!==epoch)return;
          stopStream();clearPhoto();photo=result;s.preview=URL.createObjectURL(result);await Vue.nextTick();document.getElementById(id+'-confirm')?.focus();
        }catch(error){if(!disposed&&stamp===epoch)s.error=message(error);}finally{if(!disposed&&stamp===epoch)s.busy=false;}
      }
      async function rotate():Promise<void>{if(!photo||s.busy)return;s.busy=true;s.error='';const stamp=epoch;try{const rotated=await fromBlob(photo,true);if(disposed||stamp!==epoch)return;clearPhoto();photo=rotated;s.preview=URL.createObjectURL(rotated);}catch(error){if(!disposed&&stamp===epoch)s.error=message(error);}finally{if(!disposed&&stamp===epoch)s.busy=false;}}
      async function choose(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const selected=input.files?.[0];input.value='';if(!selected||s.busy)return;const stamp=++epoch;stopStream();s.busy=true;s.error='';try{if(selected.size>30*1024*1024)throw new Error('Escolha uma fotografia de até 30 MB.');if(!['image/jpeg','image/png','image/webp'].includes(selected.type))throw new Error('Escolha uma fotografia em JPG, PNG ou WebP.');const normalized=await fromBlob(selected);if(disposed||stamp!==epoch)return;clearPhoto();photo=normalized;s.preview=URL.createObjectURL(normalized);}catch(error){if(stamp===epoch&&!disposed)s.error=message(error);}finally{if(stamp===epoch&&!disposed)s.busy=false;}}
      function close():void{++epoch;stopStream();clearPhoto();emit('close');}
      function confirm():void{if(!photo||s.busy)return;const accepted=photo;++epoch;stopStream();clearPhoto();emit('captured',accepted);emit('close');}
      function key(event:KeyboardEvent):void{const dialog=document.getElementById(id);if(!dialog)return;
        if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key!=='Tab')return;
        const buttons=Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select,[tabindex="0"]')).filter(x=>!x.matches(':disabled')&&x.getClientRects().length);
        const first=buttons[0],last=buttons.at(-1);if(!first){event.preventDefault();return;}
        if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
      function hidden():void{if(document.hidden&&stream){++epoch;stopStream();s.busy=false;s.error='A câmera foi pausada ao sair da aplicação. Toque em Tentar novamente para continuar.';}}
      Vue.onMounted(()=>{opener=document.activeElement instanceof HTMLElement?document.activeElement:null;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.addEventListener('keydown',key);document.addEventListener('visibilitychange',hidden);void start();void Vue.nextTick(()=>document.getElementById(id+'-title')?.focus());});
      Vue.onUnmounted(()=>{disposed=true;++epoch;observer?.disconnect();stopStream();clearPhoto();document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hidden);document.body.style.overflow=previousOverflow;if(opener?.isConnected)opener.focus({preventScroll:true});});
      Vue.watch(()=>props.contextKey,()=>close());
      return {s,id,props,title,start,flip,changeCamera,zoom,torch,capture,rotate,choose,confirm,close};
    }
  };
}
