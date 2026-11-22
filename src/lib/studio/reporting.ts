const topics: [string, RegExp][] = [
    ['Returns and refunds', /\b(refunds?|returns?|exchange|money back)\b/i],
    ['Orders and delivery', /\b(orders?|shipping|tracking|delivery|shipment)\b/i],
    ['Pricing and billing', /\b(pric(e|es|ing)|costs?|billing|invoice|charges?|discount|payment)\b/i],
    ['Appointments and availability', /\b(book(ing)?|appointments?|hours|available|availability|open today)\b/i],
    ['Support and troubleshooting', /\b(error|broken|fix|issue|help|support|failed|working)\b/i],
    ['Products and services', /\b(products?|services?|features?|offer|sell)\b/i],
];

// Only owner-provided labels and fixed categories may become stored report buckets.
const genericWords = new Set('a an the and or for of to in on with your our what who how is are do does can i my about guide overview faq faqs knowledge base document policy policies information introduction'.split(' '));

function businessTopic(message:string, labels:string[]) {
    const words=(text:string)=>text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
    const asked=new Set(words(message));
    let best:string|undefined, bestScore=0;
    for(const label of labels) {
        const terms=[...new Set(words(label).filter(word=>!genericWords.has(word)))];
        if(!terms.length || !terms.every(term=>asked.has(term)))continue;
        if(terms.length>bestScore){best=label;bestScore=terms.length;}
    }
    return best;
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

export function reportLabels(message:string, labels:string[] = []) {
    const negative=/\b(frustrat(ed|ing)|angry|terrible|awful|disappointed|hate|unhappy|not happy|not helpful)\b/i;
    const positive=/\b(thanks|thank you|great|excellent|love|happy|awesome)\b/i;
    const tone=negative.test(message)?'Negative language':positive.test(message)?'Positive language':'No clear signal';
    const subject=businessTopic(message,labels);
    const category=topics.find(([,pattern])=>pattern.test(message))?.[0];
    const intent=intents.find(([,pattern])=>pattern.test(message))?.[0];
    const pattern=questionPatterns.find(([,regex])=>regex.test(message))?.[0];
    let question:string|null=null;
    if(pattern)question=subject?subject+' · '+pattern:pattern;
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
