"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import type { AvailabilityResult, AvailableSlot } from "@/lib/calendly";
import BookingForm from "./BookingForm";

const control = "min-h-11 rounded-lg border border-[#77946f] px-3 py-2 text-sm text-[#e6f7d4] hover:bg-[#29473b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a] disabled:opacity-50";
const dateStyle = "min-h-11 min-w-0 w-full rounded-lg border border-[#5c7971] bg-[#0a1c24] px-3 py-2 text-base text-[#f2f8f1]";
export default function BookingOptions({initial}:{initial:AvailabilityResult}) {
  const id=useId();
  const [result,setResult]=useState(initial);
  const [start,setStart]=useState(initial.query?.startDate || "");
  const [end,setEnd]=useState(initial.query?.endDate || "");
  const [selected,setSelected]=useState<AvailableSlot | null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const inFlight=useRef(false);
  const added=useRef<HTMLButtonElement>(null);
  const [firstAdded,setFirstAdded]=useState<string>();
  async function load(more:boolean,eventTypeName?:string) {
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setError("");setNotice("");
    const query=more ? result.query : {startDate:start||undefined,endDate:end||start||undefined,timeZone:result.timeZone||"America/New_York",timeOfDay:result.query?.timeOfDay||"any",eventTypeUri:result.eventTypeUri};
    try {
      const response=await fetch("/api/theia-availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...query,...(eventTypeName?{eventTypeName,eventTypeUri:undefined}:{}),after:more?result.slots?.at(-1)?.startTime:undefined}),signal:AbortSignal.timeout(35000)});
      const data=await response.json() as AvailabilityResult & {error?:string};
      if(!response.ok || !["available","no_slots","choose_event"].includes(data.status))throw new Error(data.error||data.message||"Could not check availability.");
      const fresh=more ? (data.slots||[]).filter(slot=>!result.slots?.some(old=>old.startTime===slot.startTime)) : data.slots||[];
      setResult({...data,slots:more?[...(result.slots||[]),...fresh]:fresh,status:more && result.slots?.length ? "available":data.status});
      setSelected(null);
      setStart(data.query?.startDate||start);setEnd(data.query?.endDate||end);
      setNotice(more ? (fresh.length ? `${fresh.length} more times loaded.` : "No more times in this date range. Choose another date range.") : `${fresh.length} times shown. Dates and times are ${data.timeZone||"America/New_York"}.`);
      setFirstAdded(more ? fresh[0]?.startTime : undefined);
      if(more && fresh.length)requestAnimationFrame(()=>added.current?.focus());
    } catch(err){setError(err instanceof Error ? err.message : "Could not check availability. Try again.");}
    finally{inFlight.current=false;setBusy(false);}
  }
  function search(event:FormEvent){event.preventDefault();void load(false);}
  const browsable=["available","no_slots"].includes(result.status);
  return <div className="mt-5 rounded-xl border border-[#506c53] bg-[#132a27] p-4" aria-label="Appointment availability" aria-busy={busy}>
    {browsable ? <>
      <p className="font-semibold text-[#e6f7d4]">Available {result.eventType || ""} appointments</p>
      <p className="mt-1 text-xs text-[#c6dacb]">{result.timeZone||"America/New_York"} · Times may change before booking.</p>
      <form onSubmit={search} className="mt-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-start`} className="text-xs">From<input id={`${id}-start`} type="date" required value={start} onChange={e=>setStart(e.target.value)} className={dateStyle}/></label>
          <label htmlFor={`${id}-end`} className="text-xs">Through<input id={`${id}-end`} type="date" required min={start} value={end} onChange={e=>setEnd(e.target.value)} className={dateStyle}/></label>
        </div>
        <button type="submit" disabled={busy} className={`${control} mt-3`}>Find times</button>
        <p className="mt-1 text-xs text-[#c6dacb]">Choose up to 28 days within the next six months.</p>
      </form>
      {result.query && <p className="mt-3 text-xs">Showing {result.query.startDate} through {result.query.endDate}{result.query.timeOfDay !== "any" ? ` · ${result.query.timeOfDay}` : ""}</p>}
      {result.status === "no_slots" && <p className="mt-3">No available times in this range. Try another date.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{result.slots?.map(slot=><div key={slot.startTime} className="rounded-lg border border-[#77946f] bg-[#1e3a33] p-3">
        <p className="font-semibold text-[#e7f8dc]">{slot.label}</p>
        {result.eventTypeUri && result.directBookingSupported !== false ? <button ref={slot.startTime===firstAdded?added:undefined} type="button" disabled={busy} onClick={()=>setSelected(slot)} aria-expanded={selected?.startTime===slot.startTime} aria-label={`Book ${slot.label} directly in Theia`} className={`${control} mt-2`}>Book here</button> : <a href={slot.bookingUrl} target="_blank" rel="noopener noreferrer" className={`${control} mt-2 inline-flex`}>Calendly ↗</a>}
      </div>)}</div>
      {result.hasMore && <button type="button" disabled={busy} onClick={()=>void load(true)} className={`${control} mt-3`}>{busy ? "Loading times…" : "Show more times"}</button>}
      {!result.hasMore && Boolean(result.slots?.length) && <p className="mt-3 text-xs">All available times in this range are shown. Choose another date range for more options.</p>}
      {selected && result.eventTypeUri && <BookingForm key={selected.startTime} slot={selected} eventType={result.eventType||"Consultation"} eventTypeUri={result.eventTypeUri} timeZone={result.timeZone||"America/New_York"} onCancel={()=>setSelected(null)}/>}
      {result.directBookingSupported===false && <p className="mt-3 text-xs">{result.directBookingReason||"This meeting requires Calendly's booking page."}</p>}
    </> : result.status === "choose_event" ? <><p>Choose a meeting type</p><div className="mt-3 flex flex-wrap gap-2">{result.eventTypes?.map(event=><button key={event.name} type="button" disabled={busy} className={control} onClick={()=>void load(false,event.name)}>{event.name}</button>)}</div></> : <><p>{result.message}</p><a href={result.bookingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-[#c9ec8a] underline">Open Calendly ↗</a></>}
    <p role="status" className="mt-2 text-xs">{busy?"Checking availability…":notice}</p>
    {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </div>;
}
