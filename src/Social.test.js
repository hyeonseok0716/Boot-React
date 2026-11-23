import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import store from './store';
import { login, logout } from './slices/loginSlice';
import { getCookie } from './util/cookieUtil';
import ModifyComponent from './components/member/ModifyComponent';
import KakaoRedirectPage from './pages/member/KakaoRedirectPage';
import { modifyMember } from './api/memberApi';
import { getAccessToken, getMemberWithAccessToken } from './api/kakaoApi';

jest.mock('./api/memberApi', () => ({ loginPost: jest.fn(), modifyMember: jest.fn() }));
jest.mock('./api/kakaoApi', () => ({ getAccessToken: jest.fn(), getMemberWithAccessToken: jest.fn() }));

const member = { email: 'social@aaa.com', nickname: '소셜회원', social: true,
  accessToken: 'test-access', refreshToken: 'test-refresh', roleNames: ['USER'] };
const wrap = (node) => render(<Provider store={store}><MemoryRouter initialEntries={['/']}>
  <Routes><Route path="/" element={node} /><Route path="/member/modify" element={<div>수정 화면</div>} />
  <Route path="/member/login" element={<div>로그인 화면</div>} /></Routes>
</MemoryRouter></Provider>);

beforeEach(() => {
  jest.clearAllMocks();
  store.dispatch(logout());
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

test('rejects a callback with a different OAuth state without exchanging the code', async () => {
  sessionStorage.setItem('kakaoOAuthState', 'expected');
  window.history.replaceState(null, '', '/?code=test-code&state=wrong');
  wrap(<KakaoRedirectPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('유효하지 않습니다');
  expect(getAccessToken).not.toHaveBeenCalled();
});

test('social callback stores the session and opens member modification', async () => {
  sessionStorage.setItem('kakaoOAuthState', 'expected');
  window.history.replaceState(null, '', '/?code=test-code&state=expected');
  getAccessToken.mockResolvedValue('provider-token');
  getMemberWithAccessToken.mockResolvedValue(member);
  wrap(<KakaoRedirectPage />);
  expect(await screen.findByText('수정 화면')).toBeInTheDocument();
  expect(getAccessToken).toHaveBeenCalledWith('test-code');
  expect(getCookie('member').email).toBe(member.email);
  expect(sessionStorage.getItem('kakaoOAuthState')).toBeNull();
});

test('provider failure ends loading and shows a return to login link', async () => {
  sessionStorage.setItem('kakaoOAuthState', 'expected');
  window.history.replaceState(null, '', '/?code=test-code&state=expected');
  getAccessToken.mockRejectedValue(new Error('provider unavailable'));
  wrap(<KakaoRedirectPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('실패');
  expect(screen.getByRole('link')).toHaveAttribute('href', '/member/login');
});

test('modification sends only form fields and the success modal logs out before returning to login', async () => {
  store.dispatch(login(member));
  modifyMember.mockResolvedValue({ result: 'modified' });
  wrap(<ModifyComponent />);
  expect(screen.getByLabelText('Password')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: '2222' } });
  fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: '새닉네임' } });
  fireEvent.click(screen.getByRole('button', { name: 'Modify' }));
  expect(await screen.findByRole('dialog', { name: '회원정보' })).toHaveTextContent('정보수정완료');
  expect(modifyMember).toHaveBeenCalledWith({ email: member.email, pw: '2222', nickname: '새닉네임' });
  fireEvent.click(screen.getByRole('button', { name: 'Close Modal' }));
  expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  await waitFor(() => expect(getCookie('member')).toBeUndefined());
  expect(store.getState().loginSlice.email).toBe('');
});
