'use client';

import {useEffect,useState} from 'react';
import {call,ErrorNotice} from './ui';
import s from './report.module.css';

type Row={day:string;metric:string;bucket:string;total:number};
type Report={start:string;today:string;rows:Row[]};
type Props={agent:string;enabled:boolean;published:boolean;hasCta:boolean;navigate:(tab:'knowledge'|'cta'|'embed')=>void};
const fmt=(day:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));

function ranking(rows:Row[],metric:string) {
    const totals=new Map<string,number>();
    for(const row of rows)if(row.metric===metric)totals.set(row.bucket,(totals.get(row.bucket)??0)+row.total);
    return [...totals.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}

function Activity({report,days}:{report:Report;days:number}) {
    const daily=Array.from({length:days},(_,i)=>{
        const day=new Date(Date.parse(report.start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
        const rows=report.rows.filter(r=>r.day===day);
        const sum=(metric:string)=>rows.reduce((n,r)=>n+(r.metric===metric?r.total:0),0);
        return {day,messages:sum('topic'),clicks:sum('click')};
    });
    const peak=Math.max(1,...daily.flatMap(d=>[d.messages,d.clicks]));
    return <section className={s.panel}><h4>Daily activity</h4>
        <div className={s.legend}><span>Messages</span><span>CTA clicks</span></div>
        <div className={s.plot} aria-hidden="true">{daily.map(d=><div key={d.day} title={fmt(d.day)+' · '+d.messages+' messages, '+d.clicks+' clicks'}>
            <i style={{height:100*d.messages/peak+'%'}}/><i style={{height:100*d.clicks/peak+'%'}}/></div>)}</div>
        <div className={s.axis}><span>{fmt(report.start)}</span><span>{fmt(report.today)} · UTC</span></div>
        <details><summary>Daily counts</summary><table><thead><tr><th>Date (UTC)</th><th>Messages</th><th>CTA clicks</th></tr></thead>
        <tbody>{daily.slice().reverse().map(d=><tr key={d.day}><th>{fmt(d.day)}</th><td>{d.messages}</td><td>{d.clicks}</td></tr>)}</tbody></table></details>
    </section>;
}

function Results({report,days,navigate,published,hasCta}:Pick<Props,'navigate'|'published'|'hasCta'>&{report:Report;days:number}) {
    const topics=ranking(report.rows,'topic'),tones=ranking(report.rows,'tone');
    const messages=topics.reduce((n,[,v])=>n+v,0);
    const clicks=report.rows.reduce((n,r)=>n+(r.metric==='click'?r.total:0),0);
    if(!messages&&!clicks)return <section className={s.panel}><h4>No live activity recorded</h4><p>{published?'Messages and CTA clicks appear here after visitors use the embedded assistant. Preview conversations are excluded.':'Publish and embed this assistant to start collecting visitor activity.'}</p><button className="button button-outline" onClick={()=>navigate('embed')}>Review Publish &amp; Embed</button></section>;
    const top=topics.find(([name])=>name!=='Other');
    return <><div className={s.cards}>{[['Visitor messages',messages],['Call-to-action clicks',clicks],['Days with activity',new Set(report.rows.map(r=>r.day)).size]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong></div>)}</div>
        <Activity report={report} days={days}/>
        <section className={s.panel}><h4>What visitors ask about</h4>
            {messages>0?<><p>{top?top[0]+' appeared in '+top[1]+' of '+messages+' messages. Review your published answers for this topic.':'These messages fell outside the recognized topic categories.'}</p>
            {topics.map(([name,count])=><div className={s.rank} key={name}><span>{name}</span><b>{count} · {Math.round(100*count/messages)}%</b><progress aria-label={name} value={count} max={messages}/></div>)}
            <button className="button button-outline" onClick={()=>navigate('knowledge')}>Review knowledge</button></>:<p>No visitor messages in this period.</p>}</section>
        <section className={s.panel}><h4>Language in visitor messages</h4><p>Estimated from English keywords. “No clear signal” includes messages without a recognized sentiment.</p>
        {tones.map(([name,count])=><div className={s.line} key={name}><span>{name}</span><strong>{count} · {Math.round(100*count/messages)}%</strong></div>)}</section>
        <section className={s.panel}><h4>Call-to-action engagement</h4><p>{hasCta?'The report counts each click on your configured destination, including repeat clicks.':'This assistant currently has no configured call to action.'}</p>
        <button className="button button-outline" onClick={()=>navigate('cta')}>{hasCta?'Review call to action':'Configure call to action'}</button></section></>;
}

function Period({days,...props}:Props&{days:number}) {
    const [report,setReport]=useState<Report|null>(null),[error,setError]=useState<unknown>(null);
    useEffect(()=>{let active=true;
        call('manage',{action:'visitor-report-daily',agent_id:props.agent,days}).then(data=>{if(active)setReport(data);}).catch(e=>{if(active)setError(e);});
        return ()=>{active=false;};
    },[props.agent,days]);
    if(error)return <ErrorNotice error={error}/>;
    return report?<Results {...props} report={report} days={days}/>:<p role="status">Loading visitor report…</p>;
}
export default function VisitorReports(props:Props) {
    const [days,setDays]=useState(7);
    return <section className={s.report}><header><h3>Visitor interaction report</h3>{props.enabled&&<div aria-label="Reporting period" role="group">{[7,30].map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)}>{n} days</button>)}</div>}</header>
        {props.enabled?<Period key={props.agent+days} days={days} {...props}/>:<p>Visitor reports are available on Pro and Enterprise.</p>}</section>;
}
