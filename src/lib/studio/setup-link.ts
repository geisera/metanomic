// Only restore known setup steps on the local dashboard after sign-in.
export function setupDestination() {
 const url=new URL('/assistant-studio/dashboard',window.location.origin);
 try {
  const saved=new URLSearchParams(sessionStorage.getItem('studio-setup-destination')||'');
  sessionStorage.removeItem('studio-setup-destination');
  const step=saved.get('setup');
  if(step && ['create','key','knowledge','preview','embed'].includes(step)){
   url.searchParams.set('setup',step);
   const assistant=saved.get('assistant');
   if(assistant && /^[a-f0-9-]{36}$/i.test(assistant))url.searchParams.set('assistant',assistant);
  }
 }catch{}
 return url.pathname+url.search;
}
