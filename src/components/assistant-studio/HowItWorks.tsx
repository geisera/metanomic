const steps = [
  {
    title: 'Connect',
    description: 'Add your OpenAI API key.',
    href: 'https://platform.openai.com/api-keys',
    linkLabel: 'Learn more about connecting your OpenAI key',
    icon: 'M15.75 5.25a4.5 4.5 0 0 0-4.39 5.49L3 19.1V21h3v-2.25h2.25V16.5h2.25l2.76-2.76a4.5 4.5 0 1 0 2.49-8.49Zm2.25 4.5h.008v.008H18V9.75Z',
  },
  {
    title: 'Train',
    description: 'Upload or paste your pages, docs, and FAQs.',
    href: '/assistant-studio/docs',
    linkLabel: 'Learn more about supported content and uploading documents',
    icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375H14.25a1.125 1.125 0 0 1-1.125-1.125V5.25A3.375 3.375 0 0 0 9.75 1.875H5.625C5.004 1.875 4.5 2.379 4.5 3v18c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-6.75Zm-7.5 4.5v-6m-3 3 3-3 3 3',
  },
  {
    title: 'Embed',
    description: 'Paste one line of code on your site.',
    href: '/assistant-studio/docs',
    linkLabel: 'Learn more about installing the embed script',
    icon: 'm17.25 6.75 5.25 5.25-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="scroll-mt-8 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full bg-lime px-3 py-1 text-sm font-semibold text-lime-ink">Live in 10 minutes</p>
          <h2 id="how-it-works-heading" className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Three steps. No developer required.
          </h2>
        </div>
        <ol role="list" className="mx-auto mt-12 grid max-w-xl grid-cols-1 gap-x-8 gap-y-8 lg:mt-16 lg:max-w-none lg:grid-cols-3">
          {steps.map(({title, description, href, linkLabel, icon}, index) => (
            <li key={title} className="flex flex-col rounded-2xl bg-white p-6 ring-1 ring-line">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-lime text-lime-ink">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d={icon}/></svg>
                </span>
                <h3 className="font-semibold"><span className="mr-2 rounded-full bg-mint-2 px-2 py-1 text-sm">{index + 1}</span>{title}</h3>
              </div>
              <p className="mt-4 leading-7 text-slate">{description}</p>
              <div className="mt-auto pt-3">
                <a href={href} aria-label={linkLabel} className="inline-flex min-h-11 items-center gap-1 font-semibold underline decoration-line underline-offset-4 hover:decoration-current">Learn more <span aria-hidden="true">→</span></a>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
