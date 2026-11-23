import { waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import jwtAxios from './util/jwtUtil';
import store from './store';
import loginReducer, { login, logout, loginPostAsync } from './slices/loginSlice';
import { loginPost } from './api/memberApi';
import { getCookie } from './util/cookieUtil';

jest.mock('axios', () => jest.requireActual('axios/dist/node/axios.cjs'));
jest.mock('./api/memberApi', () => ({ loginPost: jest.fn() }));

const member = { email: 'user1@aaa.com', nickname: '한글 이름', social: false,
  roleNames: ['USER'], accessToken: 'old-access', refreshToken: 'old-refresh' };
const response = (config, status, data) => ({ config, status, data, headers: {}, statusText: '' });
const unauthorized = (config) => Promise.reject(new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST',
  config, null, response(config, 401, { error: 'ERROR_ACCESS_TOKEN' })));

beforeEach(() => {
  jest.restoreAllMocks();
  loginPost.mockReset();
  store.dispatch(logout());
  jwtAxios.defaults.adapter = jest.fn(async config => response(config, 200, { ok: true }));
});

afterEach(() => store.dispatch(logout()));

test('login stores the member and survives a store reload without changing Unicode', async () => {
  loginPost.mockResolvedValueOnce(member);
  await store.dispatch(loginPostAsync({ email: member.email, pw: '1111' })).unwrap();
  expect(getCookie('member').nickname).toBe('한글 이름');
  const reloaded = configureStore({ reducer: { loginSlice: loginReducer } });
  expect(reloaded.getState().loginSlice.accessToken).toBe(member.accessToken);
  expect(reloaded.getState().loginSlice.nickname).toBe('한글 이름');
  expect(reloaded.getState().loginSlice).not.toHaveProperty('pw');
});

test('failed login clears member state and cookie', async () => {
  store.dispatch(login(member));
  loginPost.mockRejectedValueOnce({ response: { status: 401, data: { error: 'ERROR_LOGIN' } } });
  await expect(store.dispatch(loginPostAsync({ email: member.email, pw: 'wrong' })).unwrap())
    .rejects.toEqual({ error: 'ERROR_LOGIN' });
  expect(store.getState().loginSlice.email).toBe('');
  expect(getCookie('member')).toBeUndefined();
});

test('blocks requests when logged out', async () => {
  await expect(jwtAxios.get('/api/products/list')).rejects.toMatchObject({ response: { data: { error: 'REQUIRE_LOGIN' } } });
  expect(jwtAxios.defaults.adapter).not.toHaveBeenCalled();
});

test('adds the current access token to API requests', async () => {
  store.dispatch(login(member));
  await jwtAxios.get('/api/products/list');
  expect(jwtAxios.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer old-access');
});

test('shares one refresh between concurrent 401 responses and retries both requests', async () => {
  store.dispatch(login(member));
  const refresh = jest.spyOn(axios, 'post').mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } };
  });
  jwtAxios.defaults.adapter = jest.fn(config => config.headers.Authorization === 'Bearer old-access'
    ? unauthorized(config) : Promise.resolve(response(config, 200, { ok: true })));
  const result = await Promise.all([jwtAxios.get('/api/products/list'), jwtAxios.get('/api/todo/list')]);
  expect(result.every(item => item.status === 200)).toBe(true);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(store.getState().loginSlice.accessToken).toBe('new-access');
  expect(getCookie('member').refreshToken).toBe('new-refresh');
});

test('also refreshes the textbook HTTP 200 error response', async () => {
  store.dispatch(login(member));
  jest.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
  jwtAxios.defaults.adapter = jest.fn(async config => response(config, 200,
    config.headers.Authorization === 'Bearer old-access' ? { error: 'ERROR_ACCESS_TOKEN' } : { ok: true }));
  expect((await jwtAxios.get('/api/products/list')).data).toEqual({ ok: true });
});

test('clears the session when refresh is rejected', async () => {
  store.dispatch(login(member));
  jest.spyOn(axios, 'post').mockRejectedValue({ response: { status: 401, data: { error: 'Expired' } } });
  jwtAxios.defaults.adapter = jest.fn(unauthorized);
  await expect(jwtAxios.get('/api/products/list')).rejects.toMatchObject({ response: { data: { error: 'REQUIRE_LOGIN' } } });
  expect(store.getState().loginSlice.email).toBe('');
  expect(getCookie('member')).toBeUndefined();
});

test('does not loop when the retried request is still unauthorized', async () => {
  store.dispatch(login(member));
  const refresh = jest.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
  jwtAxios.defaults.adapter = jest.fn(unauthorized);
  await expect(jwtAxios.get('/api/products/list')).rejects.toMatchObject({ response: { data: { error: 'REQUIRE_LOGIN' } } });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(jwtAxios.defaults.adapter).toHaveBeenCalledTimes(2);
});

test('an in-flight refresh cannot restore a logged-out session', async () => {
  store.dispatch(login(member));
  let finish;
  const refresh = jest.spyOn(axios, 'post').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  jwtAxios.defaults.adapter = jest.fn(unauthorized);
  const result = jwtAxios.get('/api/products/list').catch(error => error);
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  store.dispatch(logout());
  finish({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
  expect((await result).response.data.error).toBe('REQUIRE_LOGIN');
  expect(getCookie('member')).toBeUndefined();
  expect(store.getState().loginSlice.email).toBe('');
});

test('network errors preserve the session and do not refresh', async () => {
  store.dispatch(login(member));
  const refresh = jest.spyOn(axios, 'post');
  jwtAxios.defaults.adapter = jest.fn(() => Promise.reject(new Error('offline')));
  await expect(jwtAxios.get('/api/products/list')).rejects.toThrow('offline');
  expect(refresh).not.toHaveBeenCalled();
  expect(getCookie('member').email).toBe(member.email);
});
