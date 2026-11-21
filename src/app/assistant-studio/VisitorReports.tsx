'use client';
import {useEffect,useState} from 'react';
import {call,ErrorNotice} from './ui';
import s from './studio.module.css';

type Count={metric:string;bucket:string;total:number};

function Breakdown({title,rows}:{title:string;rows:Count[]}) {
    return <section><h3>{title}</h3><table><thead><tr><th scope="col">Category</th><th scope="col">Messages</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.bucket}><th scope="row">{r.bucket}</th><td>{r.total.toLocaleString()}</td></tr>)}</tbody></table></section>;
}

function ReportPeriod({agent,days}:{agent:string;days:number}) {
    const [rows,setRows]=useState<Count[]|null>(null);
    const [error,setError]=useState<unknown>(null);
    useEffect(()=>{
        let active=true;
        call('manage',{action:'visitor-report',agent_id:agent,days}).then(data=>{if(active)setRows(data);})
            .catch(e=>{if(active)setError(e);});
        return ()=>{active=false;};
    },[agent,days]);
    if(error)return <ErrorNotice error={error}/>;
    if(!rows)return <p role="status">Loading visitor report…</p>;
    if(!rows.length)return <p>No recorded widget activity in this period. Reporting starts when tracking is enabled.</p>;
    const topics=rows.filter(r=>r.metric==='topic');
    return <><p><strong>{topics.reduce((sum,r)=>sum+r.total,0).toLocaleString()}</strong> visitor messages · <strong>{rows.find(r=>r.metric==='click')?.total??0}</strong> call-to-action clicks</p>
        {!!topics.length&&<><Breakdown title="Question topics" rows={topics}/><Breakdown title="Estimated sentiment" rows={rows.filter(r=>r.metric==='tone')}/>
        <p className={s.help}>Categories use English keyword matching. Messages without a recognizable tone appear under “No clear signal.”</p></>}</>;
}

export default function VisitorReports({agent,enabled}:{agent:string;enabled:boolean}) {
    const [days,setDays]=useState(7);
    return <section className={s.form}><h3>Visitor interaction report</h3>{enabled?<><label>Reporting period<select value={days} onChange={e=>setDays(Number(e.target.value))}>
        <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></label>
        <p className={s.help}>Live widget activity, including today (UTC). Each click on the configured CTA is counted.</p>
        <ReportPeriod key={days} agent={agent} days={days}/></>:<p>Visitor reports are available on Pro and Enterprise.</p>}</section>;
}
