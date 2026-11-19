'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {launcherAnimation,launcherAnimationFrames,launcherAnimationOptions,launcherAnimationRepeatDelay} from '@/lib/studio/launcher-animation';
import type {Agent} from '@/lib/studio/core';
import {call,useDirty,SaveBar,Notice,ErrorNotice,buttonInk} from './ui';
import s from './studio.module.css';
const chatPalettes = {
 light: {send_color:'#091019',send_text_color:'#ecf0ed',user_message_color:'#ecf0ed',button_color:'#ecf0ed',button_text_color:'#091019',button_outline_color:'#52616a'},
 dark: {send_color:'#c9ec8a',send_text_color:'#091019',user_message_color:'#273843',button_color:'#091019',button_text_color:'#ecf0ed',button_outline_color:'#c9ec8a'},
};

function ColorControl({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
 const [text,setText]=useState<string|null>(null);
 return <div className={s.colorControl}>
   <label>{label}<input type='color' value={value} onInput={event=>{setText(null);onChange(event.currentTarget.value);}}/></label>
   <input type='text' aria-label={label+' hex code'} value={text??value} maxLength={7} spellCheck={false} autoComplete='off'
     onChange={event=>{
       const next=event.target.value;
       setText(next);
       if(/^#?[0-9a-f]{6}$/i.test(next))onChange('#'+next.replace(/^#/,'').toLowerCase());
     }}
     onBlur={()=>setText(null)}/>
 </div>;
}

export default function Appearance({agent,onSaved,onChange}:{agent:Agent;onSaved:()=>Promise<void>;onChange?:(value:Partial<Agent>)=>void}){
 const launcherPreview=useRef<HTMLSpanElement>(null),playing=useRef<Animation|null>(null);
 const initial={launcher_animation_repeat:agent.launcher_animation_repeat===true,launcher_animation:launcherAnimation(agent.launcher_animation),send_display:agent.send_display||'icon',pill_side:agent.pill_side||((agent.button_position||'right').endsWith('left')?'left':'right'),pill_alignment:agent.pill_alignment||(agent.button_position?.startsWith('top-')?'top':'bottom'),pill_offset:agent.pill_offset??50,pill_orientation:agent.pill_orientation||'horizontal',tab_offset:agent.tab_offset??50,tab_orientation:agent.tab_orientation||'vertical',launcher_style:agent.launcher_style||'pill',tab_side:agent.tab_side||'right',tab_alignment:agent.tab_alignment||'middle',send_label:agent.send_label||'Send message',send_color:agent.send_color||agent.button_color||'#c9ec8a',send_text_color:agent.send_text_color||agent.button_text_color||buttonInk(agent.button_color||'#c9ec8a'),user_message_color:agent.user_message_color||agent.button_color||'#c9ec8a',launcher_color:agent.launcher_color||agent.button_color||'#c9ec8a',button_label:agent.button_label||'Chat with us',button_color:agent.button_color||'#c9ec8a',button_text_color:agent.button_text_color||buttonInk(agent.button_color||'#c9ec8a'),button_outline_color:agent.button_outline_color||agent.button_color||'#c9ec8a',button_position:agent.button_position||'right'};
 const [past,setPast]=useState<typeof initial[]>([]),[future,setFuture]=useState<typeof initial[]>([]);
 const [draft,updateDraft]=useState(initial),[baseline,setBaseline]=useState(initial),[saved,setSaved]=useState(agent.updated_at),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[notice,setNotice]=useState('');const dirty=JSON.stringify(draft)!==JSON.stringify(baseline);useDirty('appearance',dirty||busy);
 function setDraft(value:typeof initial){if(JSON.stringify(value)===JSON.stringify(draft))return;setPast(values=>[...values,draft].slice(-100));setFuture([]);updateDraft(value);onChange?.(value);}
 function undo(){const value=past.at(-1);if(!value)return;setPast(past.slice(0,-1));setFuture([draft,...future]);updateDraft(value);onChange?.(value);}
 function redo(){const value=future[0];if(!value)return;setPast([...past,draft]);setFuture(future.slice(1));updateDraft(value);onChange?.(value);}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError(null);setNotice('');try{const result=await call('manage',{action:'save-appearance',agent_id:agent.id,...draft});setBaseline(draft);setSaved(result.agent.updated_at);setNotice('Saved');await onSaved();}catch(e){setError(e);}finally{setBusy(false);}}
 const animation=draft.launcher_animation,repeats=draft.launcher_animation_repeat;
 const playLauncherPreview=useCallback(()=>{
   const preview=launcherPreview.current;
   if(animation==='off'||!preview||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   playing.current?.cancel();
   playing.current=preview.animate?.(launcherAnimationFrames[animation],launcherAnimationOptions)??null;
 },[animation]);
 useEffect(()=>{
   const preview=launcherPreview.current;
   if(animation==='off'||!preview)return;
   const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
   let inView=false;
   let timer:number|undefined;
   function stop(){
     window.clearInterval(timer);
     playing.current?.cancel();
     playing.current=null;
   }
   function syncPlayback(){
     stop();
     if(!inView||document.hidden||motion.matches)return;
     playLauncherPreview();
     if(repeats)timer=window.setInterval(playLauncherPreview,launcherAnimationRepeatDelay);
   }
   const observer=new IntersectionObserver(([entry])=>{
     inView=entry.isIntersecting;
     syncPlayback();
   });
   observer.observe(preview);
   motion.addEventListener('change',syncPlayback);
   document.addEventListener('visibilitychange',syncPlayback);
   return ()=>{
     observer.disconnect();
     motion.removeEventListener('change',syncPlayback);
     document.removeEventListener('visibilitychange',syncPlayback);
     stop();
   };
 },[animation,repeats,playLauncherPreview]);
 const placement=draft.launcher_style==='pill'?{side:draft.pill_side,alignment:draft.pill_alignment,offset:draft.pill_offset,orientation:draft.pill_orientation}:{side:draft.tab_side,alignment:draft.tab_alignment,offset:draft.tab_offset,orientation:draft.tab_orientation};
 return <section className={s.appearance} aria-labelledby='appearance-heading'><h3 id='appearance-heading'>Appearance</h3><p className={s.help}>Saved changes appear on your website automatically on the next page load, within one minute. No embed-code changes needed.</p><ErrorNotice error={error}/><Notice>{notice}</Notice><div className={s.actions}><button type='button' className={s.promptChip} disabled={busy||!past.length} onClick={undo}>Undo</button><button type='button' className={s.promptChip} disabled={busy||!future.length} onClick={redo}>Redo</button><button type='button' className={s.textButton} disabled={busy||!dirty} onClick={()=>setDraft(baseline)}>Reset to saved</button></div><form className={s.form} onSubmit={save}><fieldset className={s.appearanceGroup}><legend>Chat window</legend><div className={s.actions} aria-label='Chat window presets'><button type='button' className={s.promptChip} onClick={()=>setDraft({...draft,...chatPalettes.light})}>Light preset</button><button type='button' className={s.promptChip} onClick={()=>setDraft({...draft,...chatPalettes.dark})}>Dark preset</button></div><p className={s.help}>Start with a preset, then customize any color with the picker or a six-digit hex code, with or without #. Select Save appearance to apply your palette.</p><label>Send button display<select value={draft.send_display} onChange={e=>setDraft({...draft,send_display:e.target.value})}><option value='icon'>Paper plane icon</option><option value='text'>Label text</option></select></label><label>Send button label<input value={draft.send_label} maxLength={60} required onChange={e=>setDraft({...draft,send_label:e.target.value})}/></label><div className={s.colorControls}>{([['send_color','Send button color'],['send_text_color','Send text / icon color'],['user_message_color','User message background'],['button_color','Background color'],['button_text_color','Text color'],['button_outline_color','Outline color']] as const).map(([key,label])=><ColorControl key={key} label={label} value={draft[key]} onChange={value=>setDraft({...draft,[key]:value})}/>)}</div></fieldset><fieldset className={s.appearanceGroup}><legend>Launch button</legend><p className={s.help}>The button visitors click to open your assistant. Text contrast adjusts automatically.</p><label>Launch button label<input value={draft.button_label} maxLength={60} required onChange={e=>setDraft({...draft,button_label:e.target.value})}/></label><label>Button style<select value={draft.launcher_style} onChange={e=>setDraft({...draft,launcher_style:e.target.value})}><option value='pill'>Pill</option><option value='side-tab'>Side tab</option></select></label><><label>Orientation<select value={placement.orientation} onChange={e=>setDraft({...draft,[draft.launcher_style==='pill'?'pill_orientation':'tab_orientation']:e.target.value})}><option value='vertical'>Vertical</option><option value='horizontal'>Horizontal</option></select></label><label>Side<select value={placement.side} onChange={e=>setDraft({...draft,[draft.launcher_style==='pill'?'pill_side':'tab_side']:e.target.value})}><option value='left'>Left</option><option value='right'>Right</option></select></label><label>Vertical position<select value={placement.alignment} onChange={e=>setDraft({...draft,[draft.launcher_style==='pill'?'pill_alignment':'tab_alignment']:e.target.value})}><option value='top'>Top</option><option value='middle'>Middle</option><option value='bottom'>Bottom</option><option value='custom'>Custom</option></select></label>{placement.alignment==='custom'&&<><label>Button height<input type='range' min={0} max={100} value={placement.offset} onChange={e=>setDraft({...draft,[draft.launcher_style==='pill'?'pill_offset':'tab_offset']:Number(e.target.value)})}/></label><label>Position from top (%)<input type='number' min={0} max={100} step={1} required value={placement.offset} onChange={e=>setDraft({...draft,[draft.launcher_style==='pill'?'pill_offset':'tab_offset']:Math.max(0,Math.min(100,Number(e.target.value)))})}/></label><p className={s.help}>0% is the top, 50% is centered, and 100% is the bottom.</p></>}</><div className={s.colorControls}><ColorControl label='Launch button color' value={draft.launcher_color} onChange={value=>setDraft({...draft,launcher_color:value})}/></div><label>Launcher animation<select value={draft.launcher_animation} onChange={e=>setDraft({...draft,launcher_animation:launcherAnimation(e.target.value)})}><option value='off'>Off</option><option value='glow'>Ripple rings</option><option value='pulse'>Double bounce</option></select></label><label><input type='checkbox' checked={draft.launcher_animation_repeat} disabled={draft.launcher_animation==='off'} onChange={e=>setDraft({...draft,launcher_animation_repeat:e.target.checked})}/>Repeat animation every 15 seconds</label><p className={s.help}>Starts about three seconds after the button appears and stops when visitors open the chat. Skipped when visitors prefer reduced motion.</p><button type='button' className={s.promptChip} disabled={draft.launcher_animation==='off'} onClick={playLauncherPreview}>Play animation</button><span id='chat-button-preview-label'>Launch button preview</span><div className={s.buttonPreview} aria-labelledby='chat-button-preview-label' data-style={draft.launcher_style} data-side={placement.side} data-orientation={placement.orientation} data-alignment={placement.alignment} style={{alignItems:placement.alignment==='top'?'flex-start':placement.alignment==='bottom'?'flex-end':'center',justifyContent:(placement.side==='left')?'flex-start':'flex-end'}}><span ref={launcherPreview} style={{'--launcher-glow':draft.launcher_color+'80',...(placement.alignment==='custom'?{position:'absolute',top:`${placement.offset}%`,transform:`translateY(-${placement.offset}%)`,[placement.side]:0}:{}),background:draft.launcher_color,color:buttonInk(draft.launcher_color),border:'1px solid '+draft.button_outline_color} as CSSProperties}>{draft.button_label||'Chat with us'}</span></div></fieldset><SaveBar dirty={dirty} busy={busy} lastSaved={saved} label='Save appearance'/></form></section>;
}
