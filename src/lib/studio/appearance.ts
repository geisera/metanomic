import type {Agent} from './core';
export function appearanceColors(agent:Pick<Agent,'button_color'|'button_text_color'|'button_outline_color'>){
 const hex=(value:string|null|undefined,fallback:string)=>value&&/^#[0-9a-fA-F]{6}$/.test(value)?value:fallback;
 const background=hex(agent.button_color,'#c9ec8a');
 const rgb=background.slice(1).match(/.{2}/g)!.map(v=>{const n=parseInt(v,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});
 const ink=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#000000':'#ffffff';
 return {'--chat-background':background,'--chat-text':hex(agent.button_text_color,ink),'--chat-outline':hex(agent.button_outline_color,background)};
}
export function appearanceCss(agent:Pick<Agent,'button_color'|'button_text_color'|'button_outline_color'>){return ':root{'+Object.entries(appearanceColors(agent)).map(([name,value])=>name+':'+value).join(';')+'}';}
