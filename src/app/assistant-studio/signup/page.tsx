import type { Metadata } from 'next';
import AuthScreen from '../login/AuthScreen';

export const metadata: Metadata = {
  title: { absolute: 'Create an account | Assistant Studio by Metanomic' },
  description: 'Create a free Assistant Studio account to build an AI chatbot for your website.',
};
export default AuthScreen;
