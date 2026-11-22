const topics: [string, RegExp][] = [
    ['Returns and refunds', /\b(refunds?|returns?|exchange|money back)\b/i],
    ['Orders and delivery', /\b(orders?|shipping|tracking|delivery|shipment)\b/i],
    ['Pricing and billing', /\b(pric(e|es|ing)|costs?|billing|invoice|charges?|discount|payment)\b/i],
    ['Appointments and availability', /\b(book(ing)?|appointments?|hours|available|availability|open today)\b/i],
    ['Support and troubleshooting', /\b(error|broken|fix|issue|help|support|failed|working)\b/i],
    ['Products and services', /\b(products?|services?|features?|offer|sell)\b/i],
];

// Only owner-provided labels and fixed categories may become stored report buckets.
type TopicDocument = {title:string;content:string;published:boolean};
const genericWords=new Set('a an the and or for of to in on with your our what who how is are do does can i my about guide overview faq faqs knowledge base document policy policies information introduction tell me more please it its you they them their there this that those these will would could should which where when why if have has had be some from like get does need want use using used at as by much many long take takes did'.split(' '));

function topicTerms(text:string) {
    const words=text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
    return new Set(words.filter(word=>word.length>=2&&!genericWords.has(word))
        .map(word=>word.length>4?word.replace(/ies$/,'y').replace(/(?<![su])s$/,''):word));
}

function questionKey(text:string) {
    return text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(' ')??'';
}

function businessTopic(message:string, labels:string[], documents:TopicDocument[]) {
    const asked=topicTerms(message);
    const query=questionKey(message);
    if(!query)return;
    const direct=new Map<string,{name:string;question:string|null;priority:number}>();
    const scores=new Map<string,number>();
    function score(label:string,body:string) {
        const name=label.trim().slice(0,120);
        if(!name)return;
        // Compare complete questions before dropping common words. A single heading can contain several FAQs.
        const clause=label.match(/[^?？]+[?？]/gu)?.map(part=>part.trim()).find(part=>questionKey(part)===query);
        const whole=questionKey(label)===query;
        if(whole||clause){
            const priority=whole?2:1;
            if(priority>=(direct.get(name)?.priority??0))
                direct.set(name,{name,question:clause??null,priority});
        }
        if(!asked.size)return;
        const title=topicTerms(name);
        const titleHits=[...title].filter(term=>asked.has(term)).length;
        const content=topicTerms(body);
        const bodyHits=[...asked].filter(term=>content.has(term)).length;
        const exact=titleHits>0&&titleHits===title.size;
        // Two supporting terms can identify a section even when the heading is phrased differently.
        const matched=[...asked].filter(term=>title.has(term)||content.has(term));
        const specific=matched.length===1&&asked.size===1&&matched[0].length>=5;
        if(!exact&&!specific&&matched.length<2)return;
        const value=(exact?3:0)+titleHits*3+bodyHits;
        scores.set(name,Math.max(scores.get(name)??0,value));
    }
    for(const label of labels)score(label,'');
    for(const doc of documents){
        if(!doc.published)continue;
        let heading=doc.title;
        let body:string[]=[];
        for(const line of doc.content.split(/\r?\n/)){
            const clean=line.trim().replace(/^[-*]\s+/,'');
            const match=clean.match(/^#{1,6}\s+(.+?)(?:\s+#+)?$/)
                ??clean.match(/^\*\*(.{1,120}?)\*\*:?$/)
                ??clean.match(/^(?:Q:\s*)?([^?]{2,119}\?)$/i);
            if(match){score(heading,body.join(' '));heading=match[1].replace(/\*\*/g,'');body=[];}
            else body.push(line);
        }
        score(heading,body.join(' '));
    }
    const matches=[...direct.values()].sort((a,b)=>b.priority-a.priority);
    if(matches.length&&matches[0].priority!==matches[1]?.priority)return matches[0];
    const ranked=[...scores].sort((a,b)=>b[1]-a[1]);
    if(ranked.length&&ranked[0][1]!==ranked[1]?.[1])return {name:ranked[0][0],question:null};
}

const intents: [string, RegExp][] = [
    ['Getting started', /\b(get started|getting started|where (do|should) i (start|begin)|how (do|can) i (start|begin))\b/i],
    ['Comparing options', /\b(compare|comparison|versus|vs|difference between)\b/i],
    ['Contact information', /\b(contact|phone number|email address|reach (you|someone))\b/i],
    ['Requests for instructions', /^\s*(how (do|can|should|would) (i|we)|show me how|walk me through)\b/i],
    ['Requests for explanations', /^\s*(what (is|are)|who (is|are)|explain|tell me about)\b/i],
];

// Fixed paraphrases keep visitor wording, contact details and order numbers out of analytics.
const questionPatterns: [string, RegExp][] = [
    ['When will I receive my refund?', /(?=.*\brefund\b)(?=.*\b(when|take|receive|arrive|pending|status)\b)/i],
    ['How long do I have to request a return?', /(?=.*\b(return|returns|refund)\b)(?=.*\b(how long|days|window|deadline)\b)/i],
    ['When will my order arrive?', /(?=.*\b(order|delivery|shipping|package|shipment)\b)(?=.*\b(when|how long|arrive|eta)\b)/i],
    ['How do I track my order?', /\b(track(ing)? (my |an? |the )?(order|package|shipment)|tracking (number|link))\b/i],
    ['How do I cancel?', /\b(how (do|can) i cancel|how to cancel|want to cancel)\b/i],
    ['How much does it cost?', /\b(how much (is|are|does|do|would|will)|what.{0,18} (cost|price|fee)|pricing for|price of)\b/i],
    ['How do the options compare?', /\b(compare|comparison|versus|vs|difference between)\b/i],
    ['How do I book an appointment?', /\b(book|schedule|arrange) (an? |my |the )?(appointment|meeting|consultation|demo|call)\b/i],
    ['How do I install it?', /\b(how (do|can) i install|how to install|installation steps)\b/i],
    ['How do I change my plan?', /\b(upgrade|downgrade|change (my|our|the) plan)\b/i],
    ['Is a free trial available?', /\b(free trial|try (it |this )?for free)\b/i],
    ['How do I get started?', /\b(get started|getting started|where (do|should) i (start|begin))\b/i],
    ['How can I reach someone?', /\b(contact (you|support)|phone number|email address|talk to (someone|a person))\b/i],
    ['Is it compatible?', /\b(compatible with|integrate with|work with|works with)\b/i],
    ['How do I fix a problem?', /\b(how (do|can) i (fix|resolve)|not working|stopped working|won.t work)\b/i],
];

export function reportLabels(message:string, labels:string[] = [], documents:TopicDocument[] = []) {
    const negative=/\b(frustrat(ed|ing)|angry|terrible|awful|disappointed|hate|unhappy|not happy|not helpful)\b/i;
    const positive=/\b(thanks|thank you|great|excellent|love|happy|awesome)\b/i;
    const tone=negative.test(message)?'Negative language':positive.test(message)?'Positive language':'No clear signal';
    const match=businessTopic(message,labels,documents);
    const subject=match?.name;
    const category=topics.find(([,pattern])=>pattern.test(message))?.[0];
    const intent=intents.find(([,pattern])=>pattern.test(message))?.[0];
    const pattern=questionPatterns.find(([,regex])=>regex.test(message))?.[0];
    let question:string|null=null;
    if(match?.question)question=match.question.slice(0,120);
    else if(pattern)question=subject?subject+' · '+pattern:pattern;
    else if(subject||category){
        const context=subject??category;
        if(intent==='Requests for instructions')question=context+' · How do I do this?';
        if(intent==='Requests for explanations')question=context+' · What is it?';
    }
    return {topic:subject??category??intent??'Other',tone,question};
}
export function reportingEnabled(tier?:string) {
    return tier==='pro' || tier==='enterprise';
}
