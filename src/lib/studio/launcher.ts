import {launcherAnimation} from './launcher-animation';
import type {Agent} from './core';
// Public appearance only: never serialize the assistant record itself.
export function launcherConfig(a:Agent){return {
 animation:launcherAnimation(a.launcher_animation),label:a.button_label||'Chat with us',color:a.launcher_color||a.button_color||'#c9ec8a',
 textColor:a.launcher_color?'':a.button_text_color||'',outlineColor:a.button_outline_color||a.button_color||'#c9ec8a',
 style:a.launcher_style||'pill',side:a.tab_side||'right',alignment:a.tab_alignment||'middle',orientation:a.tab_orientation||'vertical',offset:String(a.tab_offset??50),position:a.button_position||'right',
 pillSide:a.pill_side||((a.button_position||'right').endsWith('left')?'left':'right'),pillAlignment:a.pill_alignment||(a.button_position?.startsWith('top-')?'top':'bottom'),pillOffset:String(a.pill_offset??50),pillOrientation:a.pill_orientation||'horizontal'
};}
