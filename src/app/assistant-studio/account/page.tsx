import {redirect} from 'next/navigation';
import {session} from '@/lib/studio/server';
import AccountRoute from '../AccountRoute';

export const metadata={title:'Account settings | Assistant Studio'};
export const dynamic='force-dynamic';

export default async function Page(){
 try{await session();}
 catch{redirect('/assistant-studio/login?next=account');}
 return <AccountRoute/>;
}
