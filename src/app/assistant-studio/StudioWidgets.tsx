import Script from 'next/script';

export default function StudioWidgets(){
  return <>
    <Script src="/theia-embed.js?panel=roomy&amp;text=comfortable" data-agent="4bd39cd9-c083-42d7-a98c-75b3c97cb7a6" data-panel-size="roomy" data-text-scale="comfortable" strategy="afterInteractive"/>
    <Script src="/theia-embed.js?instance=c1222f60-8fff-4bf1-90c0-8a3af25a4bdf" data-agent="c1222f60-8fff-4bf1-90c0-8a3af25a4bdf" strategy="afterInteractive"/>
  </>;
}
