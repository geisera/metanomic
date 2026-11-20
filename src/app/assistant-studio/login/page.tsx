import type { Metadata } from 'next';
import AuthScreen from './AuthScreen';

const description = 'Sign in to Assistant Studio by Metanomic to manage the AI assistants on your websites.';
export const metadata: Metadata = {
  title: { absolute: 'Sign in | Assistant Studio by Metanomic' },
  description,
  robots: 'noindex, nofollow',
  openGraph: { title: 'Sign in | Assistant Studio by Metanomic', description },
};

export default AuthScreen;
