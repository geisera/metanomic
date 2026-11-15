import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCalendlyAvailability } from '../src/lib/calendly.ts';

test('availability pages preserve range, timezone and event, without repeating times', async () => {
  const originalFetch=globalThis.fetch;
  const originalToken=process.env.CALENDLY_PERSONAL_ACCESS_TOKEN;
  process.env.CALENDLY_PERSONAL_ACCESS_TOKEN='test-only';
  const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const uri='https://api.calendly.com/event_types/test-event';
  const collection=Array.from({length:15},(_,i)=>({status:'available',start_time:new Date(Date.parse(day+'T08:00:00Z')+i*1800000).toISOString(),scheduling_url:'https://calendly.com/metanomic/test'}));
  let calls=0;
  globalThis.fetch=async (url)=>{
    calls++;
    const path=new URL(url).pathname;
    const data=path==='/users/me'?{resource:{uri:'https://api.calendly.com/users/test'}}:path==='/event_types'?{collection:[{uri,name:'Consultation',kind:'solo'}]}:{collection:[...collection,collection[0]]};
    return new Response(JSON.stringify(data),{status:200});
  };
  try {
    const query={startDate:day,endDate:day,timeZone:'UTC',eventTypeUri:uri};
    const first=await checkCalendlyAvailability(query);
    assert.equal(first.slots.length,6);assert.equal(first.hasMore,true);assert.deepEqual(first.query,{...query,timeOfDay:'any'});
    const second=await checkCalendlyAvailability({...first.query,after:first.slots.at(-1).startTime});
    const third=await checkCalendlyAvailability({...second.query,after:second.slots.at(-1).startTime});
    assert.equal(second.slots.length,6);assert.equal(second.hasMore,true);
    assert.equal(third.slots.length,3);assert.equal(third.hasMore,false);
    assert.equal(new Set([...first.slots,...second.slots,...third.slots].map(s=>s.startTime)).size,15);
    const empty=await checkCalendlyAvailability({...third.query,after:third.slots.at(-1).startTime});
    assert.equal(empty.status,'no_slots');assert.equal(empty.hasMore,false);
    const morning=await checkCalendlyAvailability({...query,timeOfDay:'morning'});
    assert(morning.slots.every(s=>new Date(s.startTime).getUTCHours()<12));
    const before=calls;
    assert.equal((await checkCalendlyAvailability({...query,after:'invalid'})).status,'invalid_request');
    assert.equal((await checkCalendlyAvailability({...query,endDate:'2099-01-01'})).status,'invalid_request');
    assert.equal(calls,before);
  } finally { globalThis.fetch=originalFetch; if(originalToken===undefined)delete process.env.CALENDLY_PERSONAL_ACCESS_TOKEN;else process.env.CALENDLY_PERSONAL_ACCESS_TOKEN=originalToken; }
});
