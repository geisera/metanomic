import {copy} from "@/app/assistant-studio/content";
export {base,copy} from '@/app/assistant-studio/content';
export const dashboardImage={src:'/images/studio-dashboard.png',width:960,height:600,alt:'Illustrative Assistant Studio dashboard with setup checklist and chat preview'};
export const wrap='mx-auto max-w-7xl px-6 lg:px-8';
export const section='scroll-mt-24 py-16 sm:py-24';
export const heading='text-balance text-3xl font-semibold tracking-tight sm:text-4xl';
export const primary='inline-flex min-h-11 items-center justify-center rounded-lg bg-lime px-5 py-2.5 font-semibold text-lime-ink hover:brightness-95';
export const features=[
 ['Fewer support tickets','Deflect repeat questions automatically, around the clock.','M4 5h16v11H8l-4 4V5Z'],
 ['Grounded answers','Responses drawn from your own content, with sources.','M6 3h9l4 4v14H6zM9 12h7m-7 4h7'],
 ['Keep answers current','Update the knowledge document in Studio when your policies, pages, or FAQs change.','M20 7v5h-5M4 17v-5h5m11 0a8 8 0 0 0-14-5M4 12a8 8 0 0 0 14 5'],
 ['One line of code','Install on site builders and CMSs that allow custom scripts.','m8 6-6 6 6 6m8-12 6 6-6 6'],
 ['Your key, your costs','No token markup. Usage bills straight to your OpenAI account.','M14 8a5 5 0 1 1-4 5L3 20v-4l6-6a5 5 0 0 1 5-2Z'],
 ['Custom look','Match the widget to your brand.','M4 5h16v14H4zM4 9h16m-12 4h4'],
];
export const questions=['Are you open Sunday?','How do I reset my API token?','When does the next cohort start?','Can I launch one for each client site?','How do I apply for assistance?'];
export const faq=copy.faq.map(entry=>entry.id==='branding'?{...entry,a:'Branding removal is planned for paid tiers. Availability has not been announced.'}:entry.id==='storage'?{...entry,a:entry.a.split(' TODO:')[0]+' Contact Metanomic for data residency requirements.'}:entry);
