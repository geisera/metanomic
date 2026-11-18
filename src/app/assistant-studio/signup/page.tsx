import {signupTerms} from '@/lib/studio/terms';
import AuthForm from '../AuthForm';
import {copy} from '../content';
export const metadata={title:copy.auth.signup};
export const dynamic='force-dynamic';
export default async function Page(){const terms=await signupTerms();return <AuthForm signup termsVersion={terms?.version}/>;}
