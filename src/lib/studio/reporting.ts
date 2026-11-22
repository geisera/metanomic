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

export function reportLabels(message:string, labels:string[] = []) {
    const negative=/\b(frustrat(ed|ing)|angry|terrible|awful|disappointed|hate|unhappy|not happy|not helpful)\b/i;
    const positive=/\b(thanks|thank you|great|excellent|love|happy|awesome)\b/i;
    const tone=negative.test(message)?'Negative language':positive.test(message)?'Positive language':'No clear signal';
    return {topic:businessTopic(message,labels)??topics.find(([,pattern])=>pattern.test(message))?.[0]??intents.find(([,pattern])=>pattern.test(message))?.[0]??'Other',tone};
}
export function reportingEnabled(tier?:string) {
    return tier==='pro' || tier==='enterprise';
}
