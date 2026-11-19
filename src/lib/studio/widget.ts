import {launcherAnimationFrames,launcherAnimationOptions,launcherAnimationRepeatDelay} from './launcher-animation';
export const widgetClient = String.raw `(()=>{const cfg=JSON.parse(document.getElementById('config').textContent);let messages=[],busy=false,abort;const log=document.getElementById('log'),form=document.getElementById('form'),input=document.getElementById('message'),send=document.getElementById('send'),status=document.getElementById('status');document.getElementById('name').textContent=cfg.name;send.ariaLabel=cfg.sendLabel||'Send message';send.title=send.ariaLabel;if(cfg.sendDisplay==='text'){send.textContent=send.ariaLabel;send.style.width='auto';send.style.height='auto';send.style.maxWidth='50%';send.style.whiteSpace='normal';send.style.overflowWrap='anywhere';}
function bubble(text,role){const div=document.createElement('div');div.className='bubble '+role;div.textContent=text;log.append(div);log.scrollTop=log.scrollHeight;return div;}
function showCitations(citations){
  if(!Array.isArray(citations)||!citations.length)return;
  const list=document.createElement('ul');
  list.className='citations';
  list.setAttribute('aria-label','Sources cited');
  for(const source of citations){
    let url;
    try{const candidate=new URL(source.url);if(candidate.protocol==='https:'&&!candidate.username&&!candidate.password)url=candidate.href;}catch{}
    const item=document.createElement('li'),chip=document.createElement(url?'a':'span');
    chip.textContent=source.title;
    if(url){chip.href=url;chip.target='_blank';chip.rel='noopener noreferrer';}
    item.append(chip);list.append(item);
  }
  log.append(list);
  log.scrollTop=log.scrollHeight;
}
function reset(){if(abort)abort.abort();messages=[];log.replaceChildren();bubble(cfg.greeting,'assistant');status.textContent='';}reset();
document.getElementById('clear').onclick=()=>{if(!busy)reset();};document.getElementById('close').onclick=()=>{if(cfg.parentOrigin)parent.postMessage({type:'theia:close',id:cfg.id},cfg.parentOrigin);};
const fullscreenButton=document.getElementById('fullscreen');
function requestFullscreen(fullscreen){
  if(cfg.parentOrigin)parent.postMessage({type:'theia:fullscreen',id:cfg.id,fullscreen},cfg.parentOrigin);
}
if(fullscreenButton){
  fullscreenButton.onclick=()=>requestFullscreen(fullscreenButton.getAttribute('aria-pressed')!=='true');
  window.addEventListener('message',event=>{
    if(event.origin!==cfg.parentOrigin||event.source!==parent||event.data?.type!=='theia:fullscreen-state'||event.data.id!==cfg.id)return;
    fullscreenButton.setAttribute('aria-pressed',String(event.data.fullscreen===true));
    fullscreenButton.title=event.data.fullscreen?'Exit fullscreen':'Enter fullscreen';
  });
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(fullscreenButton?.getAttribute('aria-pressed')==='true')requestFullscreen(false);
  else document.getElementById('close').click();
});
input.onkeydown = event => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (!event.repeat && !busy && input.value.trim()) form.requestSubmit();
};
form.onsubmit=async e=>{e.preventDefault();if(busy||!input.value.trim())return;const content=input.value.trim();input.value='';bubble(content,'user');messages.push({role:'user',content});while(messages.length>1&&(messages.length>15||messages.reduce((n,m)=>n+m.content.length,0)>16000))messages.splice(0,2);busy=true;send.disabled=true;document.getElementById('clear').disabled=true;status.textContent='Thinking…';const target=bubble('','assistant thinking');target.ariaHidden='true';abort=new AbortController();let reply='';try{const r=await fetch('/api/theia-studio/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:cfg.id,token:cfg.token,messages}),signal:abort.signal});if(!r.ok){const err=await r.json();const reset=err.code==='daily_limit'?' Resets at '+new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),new Date().getUTCDate()+1)).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+' your time.':'';throw new Error((err.error||'Could not send your message.')+reset);}const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',completed=false;while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);if(!line)continue;const data=JSON.parse(line);if(data.error)throw new Error(data.error);if(data.delta){if(!reply){target.className='bubble assistant';target.ariaHidden=null;status.textContent='';}reply+=data.delta;target.textContent=reply;log.scrollTop=log.scrollHeight;}if(data.done){completed=true;if(typeof data.text==='string'){reply=data.text;target.textContent=reply;}if(reply)showCitations(data.citations);}}}if(!completed)throw new Error('Response interrupted. Try again.');if(!reply)throw new Error('No reply received. Try again.');messages.push({role:'assistant',content:reply});status.textContent='';}catch(err){status.textContent=err.message;messages.pop();if(!reply)target.remove();else target.textContent=reply+'\n[Response interrupted]';}finally{busy=false;send.disabled=false;document.getElementById('clear').disabled=false;input.focus();}};})();`;
export const embedClient = String.raw `(()=>{const script=document.currentScript,id=script&&script.dataset.agent;if(!id||!/^[a-f0-9-]{36}$/i.test(id))return;const base=new URL(script.src).origin;const color=/^#[0-9a-fA-F]{6}$/.test(script.dataset.color||'')?script.dataset.color:'#c9ec8a';const rgb=color.slice(1).match(/.{2}/g).map(v=>{const n=parseInt(v,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});const automaticInk=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#000000':'#ffffff';const ink=/^#[0-9a-fA-F]{6}$/.test(script.dataset.textColor||'')?script.dataset.textColor:automaticInk;const outline=/^#[0-9a-fA-F]{6}$/.test(script.dataset.outlineColor||'')?script.dataset.outlineColor:color;const placement=['left','right','top-left','top-right'].includes(script.dataset.position)?script.dataset.position:'right';const pillPlacement=script.dataset.style!=='side-tab'&&!!script.dataset.pillSide;const offset=Number((pillPlacement?script.dataset.pillOffset:script.dataset.offset)??50),tabOffset=Number.isFinite(offset)?Math.max(0,Math.min(100,offset)):50;const horizontalTab=(pillPlacement?script.dataset.pillOrientation!=='vertical':script.dataset.orientation==='horizontal');const sideTab=script.dataset.style==='side-tab',tabSide=(pillPlacement?script.dataset.pillSide:script.dataset.side)==='left'?'left':'right',alignment=['top','middle','bottom','custom'].includes(pillPlacement?script.dataset.pillAlignment:script.dataset.alignment)?(pillPlacement?script.dataset.pillAlignment:script.dataset.alignment):'middle';const position=placement.endsWith('left')?'left':'right',edge=placement.startsWith('top-')?'top':'bottom';const host=document.createElement('div');host.style.cssText='position:fixed;display:flex;flex-direction:column;align-items:'+ (position==='left'?'flex-start':'flex-end')+';'+edge+':max(20px,env(safe-area-inset-'+edge+'));'+position+':max(20px,env(safe-area-inset-'+position+'));z-index:2147483000';if(sideTab||pillPlacement)host.style.cssText='position:fixed;'+tabSide+':max('+(sideTab?'0':'20')+'px,env(safe-area-inset-'+tabSide+'));'+(alignment==='middle'?'top:50%':alignment==='top'?'top:max(var(--studio-launcher-top,20px),env(safe-area-inset-top))':'bottom:max(20px,env(safe-area-inset-bottom))')+';z-index:2147483000';if((sideTab||pillPlacement)&&alignment==='custom')host.style.cssText='position:fixed;top:max(var(--studio-launcher-top,20px),env(safe-area-inset-top));bottom:max(20px,env(safe-area-inset-bottom));'+tabSide+':max('+(sideTab?'0':'20')+'px,env(safe-area-inset-'+tabSide+'));width:0;pointer-events:none;z-index:2147483000';const shadow=host.attachShadow({mode:'closed'});const style=document.createElement('style');style.textContent='button{font:600 14px system-ui;background:#c9ec8a;color:#091019;border:0;border-radius:999px;padding:14px 20px;cursor:pointer}button:focus-visible{outline:3px solid #c9ec8a;outline-offset:4px}iframe{display:none;width:min(var(--panel-width,380px),calc(100vw - 40px));height:min(var(--panel-height,620px),calc(100dvh - 110px));border:1px solid #52616a;border-radius:12px;background:#091019;margin-bottom:12px}iframe.open{display:block}';const button=document.createElement('button');button.textContent=script.dataset.label||'Chat with us';button.style.background=color;button.style.color=ink;button.style.border='1px solid '+outline;button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open AI assistant');const frame=document.createElement('iframe');frame.title='AI assistant';if(script.dataset.panelSize==='roomy'){frame.style.setProperty('--panel-width','460px');frame.style.setProperty('--panel-height','700px');}frame.style.borderColor=outline;frame.style.background=color;frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');frame.referrerPolicy='strict-origin';frame.allow='';if(sideTab||pillPlacement){button.style.writingMode=horizontalTab?'horizontal-tb':'vertical-rl';button.style.maxWidth='calc(100vw - 24px)';button.style.minHeight='44px';button.style.whiteSpace='nowrap';button.style.maxHeight='calc(100dvh - 48px)';button.style.overflow='hidden';button.style.textOverflow='ellipsis';button.style.minWidth='44px';button.style.padding='18px 12px';button.style.borderRadius=sideTab?(tabSide==='left'?'0 10px 10px 0':'10px 0 0 10px'):'999px';if(alignment==='middle')button.style.transform='translateY(-50%)';if(alignment==='custom'){button.style.position='absolute';button.style[tabSide]='0';button.style.top=tabOffset+'%';button.style.transform='translateY(-'+tabOffset+'%)';button.style.pointerEvents='auto';frame.style.pointerEvents='auto';}frame.className='side-panel';style.textContent+='.side-panel{position:fixed;z-index:2;margin:0!important;width:min(var(--panel-width,380px),calc(100vw - 80px));height:min(var(--panel-height,620px),calc(100dvh - 40px));'+tabSide+':max(56px,calc(env(safe-area-inset-'+tabSide+') + 56px));'+((alignment==='middle'||alignment==='custom')?'top:50%;transform:translateY(-50%);':alignment==='top'?'top:max(var(--studio-launcher-top,20px),env(safe-area-inset-top));':'bottom:max(20px,env(safe-area-inset-bottom));')+'}@media(max-width:480px){.side-panel{left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));top:auto;bottom:max(12px,env(safe-area-inset-bottom));transform:none;width:calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right));height:min(var(--panel-height,620px),calc(100dvh - 24px - env(safe-area-inset-bottom)))}}';}style.textContent+='iframe.open.fullscreen{position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0!important;border:0;border-radius:0;transform:none}';
const dockedHostStyle=host.style.cssText;
let open=false,launcherAnimation;
const animation=script.dataset.animation;
let animationTimer;
function playLauncherAnimation(){
  if(!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    button.style.setProperty('--launcher-glow',color+'80');
    launcherAnimation=button.animate?.(${JSON.stringify(launcherAnimationFrames)}[animation],${JSON.stringify(launcherAnimationOptions)});
  }
  if(script.dataset.repeatAnimation==='true')animationTimer=setTimeout(playLauncherAnimation,${launcherAnimationRepeatDelay});
}
if(animation==='glow'||animation==='pulse')animationTimer=setTimeout(playLauncherAnimation,3000);
function setFullscreen(fullscreen){
  host.style.cssText=fullscreen?'position:fixed;inset:0;width:100%;height:100%;height:100dvh;z-index:2147483000':dockedHostStyle;
  frame.classList.toggle('fullscreen',fullscreen);
  frame.contentWindow?.postMessage({type:'theia:fullscreen-state',id,fullscreen},base);
}
function toggle(value){open=value;if(open){if(animationTimer!==undefined)clearTimeout(animationTimer);launcherAnimation?.cancel();}if(!open)setFullscreen(false);button.style.display=open?'none':'';frame.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));button.textContent=open?'Close chat':script.dataset.label||'Chat with us';if(open&&!frame.src)frame.src=base+'/theia-widget/'+encodeURIComponent(id)+(script.dataset.textScale==='comfortable'?'?text=comfortable':'');if(open)frame.focus();else button.focus();}button.onclick=()=>toggle(!open);window.addEventListener('message',event=>{
  if(event.origin!==base||event.source!==frame.contentWindow||event.data?.id!==id)return;
  if(event.data.type==='theia:close'&&open)toggle(false);
  if(event.data.type==='theia:fullscreen'&&open&&typeof event.data.fullscreen==='boolean')setFullscreen(event.data.fullscreen);
});shadow.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false);});if(edge==='top'){frame.style.marginBottom='0';frame.style.marginTop='12px';shadow.append(style,button,frame);}else shadow.append(style,frame,button);document.body.append(host);})();`;
export const widgetCss = `*{box-sizing:border-box}body{margin:0;background:#091019;color:#ecf0ed;font:15px system-ui}#chat{height:100dvh;display:flex;flex-direction:column}header{padding:16px;display:flex;gap:12px;align-items:center;border-bottom:1px solid #52616a}h1{font-size:17px;margin:0;flex:1}button{background:#c9ec8a;color:#091019;border:0;border-radius:6px;padding:10px;cursor:pointer;font:inherit}button:disabled{opacity:.5}button:focus-visible,textarea:focus-visible{outline:2px solid #c9ec8a;outline-offset:3px}#log{overflow:auto;flex:1;min-height:0;padding:16px}.bubble{padding:12px;margin:0 0 14px;border-radius:8px;background:#11212d;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}.user{background:#273843;margin-left:24px}footer{padding:12px;border-top:1px solid #52616a}form{display:flex;gap:8px}textarea{resize:none;width:100%;min-width:0;background:#11212d;color:#ecf0ed;border:1px solid #52616a;border-radius:6px;padding:10px;font:inherit}label{display:block;margin-bottom:6px}small,#status{font-size:12px;color:#b8c7ce;line-height:1.5}#status{margin:8px 0}a{color:#c9ec8a}`;

export const widgetAppearanceCss = `
.citations{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:-4px 0 14px}
.citations a,.citations span{display:block;padding:4px 9px;border:1px solid var(--chat-outline);border-radius:999px;font-size:12px;overflow-wrap:anywhere}
.citations a:focus-visible{outline:2px solid var(--chat-text);outline-offset:2px}
.bubble.thinking { width:64px; min-height:36px; display:grid; place-items:center; }
.bubble.thinking::before {
  content:''; width:6px; height:6px; border-radius:50%; background:currentColor;
  box-shadow:-10px 0 currentColor,10px 0 currentColor;
  animation:widget-thinking 1.1s ease-in-out infinite;
}
@keyframes widget-thinking {
  0%,100% { opacity:.45; transform:translateY(0); }
  50% { opacity:1; transform:translateY(-3px); }
}
@media (prefers-reduced-motion:reduce) {
  .bubble.thinking::before { animation:none; }
}
#close,#fullscreen{border:0;display:grid;place-items:center;min-width:40px;min-height:40px;padding:0;flex-shrink:0}
#close{font-size:24px}
#fullscreen .exit-icon,#fullscreen[aria-pressed="true"] .enter-icon{display:none}
#fullscreen[aria-pressed="true"] .exit-icon{display:block}
header h1{min-width:0;overflow-wrap:anywhere}
body,#log,.bubble,.user,textarea,button{background:var(--chat-background);color:var(--chat-text)}header,footer,textarea,button,.bubble{border:1px solid var(--chat-outline)}.bubble.assistant:not(.thinking){border-color:transparent}header{border-width:0 0 1px}footer{border-width:1px 0 0}.user{border-left-width:3px}small,#status,a{color:var(--chat-text)}button:focus-visible,textarea:focus-visible{outline-color:var(--chat-text)}#send{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;align-self:center;background:var(--chat-send-background);color:var(--chat-send-text)}.user,textarea{background:var(--chat-user-background);color:var(--chat-user-text)}`;

// Capture currentScript before awaiting the public configuration request.
export const embedLoader = `(async()=>{const original=document.currentScript,id=original&&original.dataset.agent;if(!id||!/^[a-f0-9-]{36}$/i.test(id))return;const loadConfig=()=>fetch(new URL('/theia-config/'+encodeURIComponent(id),original.src),{credentials:'omit',cache:'no-store',referrerPolicy:'strict-origin'});try{const response=await loadConfig();if(!response.ok)return;const config=await response.json();const configuredScript={src:original.src,dataset:{...config,agent:id,panelSize:original.dataset.panelSize,textScale:original.dataset.textScale}};${embedClient.replace('document.currentScript','configuredScript').replace('button.onclick=()=>toggle(!open);', `let checking=false;
button.onclick=async()=>{
  if(open){toggle(false);return;}
  if(checking)return;
  checking=true;
  try{
    if((await loadConfig()).ok)toggle(true);
    else host.remove();
  }catch{host.remove();}
  finally{checking=false;}
};`)}}catch{}})();`;

export const widgetComfortableTextCss = `
body{font-size:16px}
#chat{overflow:auto}
#chat>header,#chat>footer{flex-shrink:0}
#log{min-height:6rem}
header h1{font-size:20px;line-height:1.2}
#clear{font-size:14px}
.bubble{line-height:1.5}
small,#status,.citations a,.citations span{font-size:12px}
textarea{line-height:1.3}
`;
