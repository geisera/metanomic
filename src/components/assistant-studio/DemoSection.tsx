import {Demo} from '@/app/assistant-studio/LandingActions';
import {copy,heading,section,wrap} from './constants';

export default function DemoSection(){
  return <section id="demo" className={wrap+' '+section}>
    <div className="rounded-xl bg-white p-6 shadow-2xl ring-1 ring-line sm:p-10">
      <h2 className={heading}>{copy.demo.title}</h2>
      <Demo marketing/>
    </div>
  </section>;
}
