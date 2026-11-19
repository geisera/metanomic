'use client';

import {useEffect,useState} from 'react';
import type {StudioStats} from '@/lib/studio/admin-contract';
import s from './operations.module.css';

type Props={
    request:(body:{action:'stats'})=>Promise<StudioStats>;
    onSessionChange:()=>Promise<void>;
};
const number=(value:number)=>value.toLocaleString();
const dayLabel=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',weekday:'short',timeZone:'UTC'});

export default function Stats({request,onSessionChange}:Props){
    const [stats,setStats]=useState<StudioStats|null>(null);
    const [error,setError]=useState('');
    const [revision,refresh]=useState(0);
    const [loading,setLoading]=useState(true);

    useEffect(()=>{
        let current=true;
        void request({action:'stats'}).then(result=>{
            if(current)setStats(result);
        }).catch(async (cause:Error&{status?:number})=>{
            if(!current)return;
            setError(cause.message);
            if(cause.status===401||cause.status===403){setStats(null);await onSessionChange();}
        }).finally(()=>{
            if(current)setLoading(false);
        });
        return ()=>{current=false;};
    },[request,onSessionChange,revision]);

    function reload(){
        setError('');
        setLoading(true);
        refresh(value=>value+1);
    }

    const maximum=Math.max(1,...(stats?.days.map(day=>day.messages)??[]));
    return <section id="studio-stats-view" className={s.panel} aria-labelledby="stats-heading" aria-busy={loading}>
        <div className={s.statsHeading}>
            <div><h2 id="stats-heading">Stats</h2>{stats&&<p className={s.meta}>Updated {new Date(stats.as_of).toLocaleString()}</p>}</div>
            <button type="button" className="button button-outline" onClick={reload} disabled={loading}>Refresh stats</button>
        </div>
        {loading&&<p role="status">{stats?'Refreshing stats…':'Loading stats…'}</p>}
        {error&&<p role="alert" className={s.message} data-error="true">{error}</p>}
        {stats&&<>
            <dl className={s.statsGrid}>
                <Metric label="Members" value={stats.members} detail={number(stats.new_members)+' joined in the last 30 days'}/>
                <Metric label="Sign-in enabled" value={stats.active_members} detail={number(stats.verified_members)+' verified emails across all members'}/>
                <Metric label="Assistants" value={stats.assistants} detail={number(stats.published_assistants)+' published'}/>
                <Metric label="Live-enabled embeds" value={stats.live_embeds} detail={number(stats.suspended_workspaces)+' suspended workspaces'}/>
                <Metric label="Knowledge documents" value={stats.knowledge_documents}/>
                <Metric label="Messages · 7 days" value={stats.messages} detail={number(stats.failed)+' failed attempts'}/>
            </dl>
            <h3>Membership by tier</h3>
            <div className={s.tableWrap}>
                <table className={s.table} aria-label="Membership and activity by tier">
                    <thead><tr><th scope="col">Tier</th><th scope="col">Members</th><th scope="col">Sign-in enabled</th><th scope="col">Assistants</th><th scope="col">Live embeds</th><th scope="col">Messages · 7 days</th></tr></thead>
                    <tbody>{stats.tiers.map(tier=><tr key={tier.id}>
                        <th scope="row">{tier.name}{!tier.configured&&<div className={s.meta}>Not configured</div>}</th>
                        <td>{number(tier.members)}</td><td>{number(tier.active_members)}</td><td>{number(tier.assistants)}</td>
                        <td>{number(tier.live_embeds)}</td><td>{number(tier.messages)}</td>
                    </tr>)}</tbody>
                </table>
            </div>
            <p className={s.meta}>Tier counts use each member’s current effective plan, including any active override. Live-enabled embeds are published, have an approved website and a configured key, and are outside suspended workspaces and disabled embeds.</p>
            <h3>Message activity</h3>
            <p className={s.meta}>Public message attempts for the last seven UTC days, including today. Totals include failed attempts.</p>
            <div className={s.tableWrap}>
                <table className={s.table} aria-label="Daily public message activity">
                    <thead><tr><th scope="col">Day (UTC)</th><th scope="col">Messages</th><th scope="col">Failed</th></tr></thead>
                    <tbody>{stats.days.map(day=><tr key={day.day}>
                        <th scope="row"><time dateTime={day.day}>{dayLabel.format(new Date(day.day+'T00:00:00Z'))}</time></th>
                        <td><div className={s.statsMessageCount}><span>{number(day.messages)}</span>
                            <span className={s.statsTrack} aria-hidden="true"><span style={{width:day.messages/maximum*100+'%'}}/></span>
                        </div></td>
                        <td>{number(day.failed)}</td>
                    </tr>)}</tbody>
                </table>
            </div>
        </>}
    </section>;
}

function Metric({label,value,detail}:{label:string;value:number;detail?:string}){
    return <div className={s.statMetric}><dt>{label}</dt><dd>{number(value)}{detail&&<small className={s.meta}>{detail}</small>}</dd></div>;
}
