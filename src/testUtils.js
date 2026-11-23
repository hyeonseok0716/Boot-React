import { RecoilRoot } from 'recoil';
import { QueryClientProvider } from '@tanstack/react-query';
import signinState from './atoms/signinState';
import queryClient from './util/queryClient';
import { setCookie } from './util/cookieUtil';

export const testMember = { email: 'user1@aaa.com', nickname: 'USER1', social: false,
  accessToken: 'access', refreshToken: 'refresh', status: 'idle', error: null };

export const TestProviders = ({ children, member = testMember }) => <RecoilRoot initializeState={({set}) => {
  if (member !== null) {
    set(signinState, member);
    if (member.email) setCookie('member', JSON.stringify(member), 1);
  }
}}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></RecoilRoot>;
