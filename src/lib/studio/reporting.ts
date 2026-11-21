const topics: [string, RegExp][] = [
    ['Returns and refunds', /\b(refunds?|returns?|exchange|money back)\b/i],
    ['Orders and delivery', /\b(orders?|shipping|tracking|delivery|shipment)\b/i],
    ['Pricing and billing', /\b(pric(e|es|ing)|costs?|billing|invoice|charges?|discount|payment)\b/i],
    ['Appointments and availability', /\b(book(ing)?|appointments?|hours|available|availability|open today)\b/i],
    ['Support and troubleshooting', /\b(error|broken|fix|issue|help|support|failed|working)\b/i],
    ['Products and services', /\b(products?|services?|features?|offer|sell)\b/i],
];

export function reportLabels(message:string) {
    const negative=/\b(frustrat(ed|ing)|angry|terrible|awful|disappointed|hate|unhappy|not happy|not helpful)\b/i;
    const positive=/\b(thanks|thank you|great|excellent|love|happy|awesome)\b/i;
    const tone=negative.test(message)?'Negative language':positive.test(message)?'Positive language':'No clear signal';
    return {topic:topics.find(([,pattern])=>pattern.test(message))?.[0]??'Other',tone};
}
export function reportingEnabled(tier?:string) {
    return tier==='pro' || tier==='enterprise';
}
