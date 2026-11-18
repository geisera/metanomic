'use client';
import {useState} from 'react';
import {copy} from './constants';
export default function EmbedSnippet(){
  const [feedback,setFeedback]=useState('');
  return <div className="min-w-0 rounded-xl bg-night p-4 text-mint ring-1 ring-line">
    <div className="flex items-center justify-between gap-2"><span className="font-semibold">Embed code</span><button className="min-h-10 rounded-md bg-night-2 px-3 font-semibold ring-1 ring-mint/30" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(copy.snippet);setFeedback(copy.copied);}catch{setFeedback(copy.copyError);}}}>Copy</button></div>
    <pre className="mt-3 whitespace-pre-wrap break-all font-mono text-sm leading-6"><code>{copy.snippet}</code></pre>
    <p role="status" className="text-sm text-muted-2">{feedback}</p>
  </div>;
}
