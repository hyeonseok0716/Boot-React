import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import cartReducer, { getCartItemsAsync, postChangeCartAsync } from './slices/cartSlice';
import loginReducer, { login, logout } from './slices/loginSlice';
import { getCartItems, postChangeCart } from './api/cartApi';
import { getOne } from './api/productsApi';
import CartComponent from './components/menus/CartComponent';
import ReadComponent from './components/products/ReadComponent';

jest.mock('./api/cartApi', () => ({ getCartItems: jest.fn(), postChangeCart: jest.fn() }));
jest.mock('./api/productsApi', () => ({ getOne: jest.fn() }));
jest.mock('./api/memberApi', () => ({ loginPost: jest.fn() }));

const member = { email: 'user1@aaa.com', nickname: 'USER1', social: false, status: 'idle',
  accessToken: 'test-access', refreshToken: 'test-refresh' };
const item = { cino: 11, pno: 5, qty: 1, pname: '상품4', price: 400, imageFile: 'first.jpg' };
const makeStore = () => configureStore({ reducer: { loginSlice: loginReducer, cartSlice: cartReducer },
  preloadedState: { loginSlice: member } });
const mount = (store, node) => render(<Provider store={store}><MemoryRouter>{node}</MemoryRouter></Provider>);

beforeEach(() => {
  jest.clearAllMocks();
  getCartItems.mockResolvedValue([]);
  postChangeCart.mockResolvedValue([]);
  getOne.mockResolvedValue({ pno: 5, pname: '상품4', pdesc: '상품설명 4', price: 400, uploadFileNames: [] });
});

test('loads cart items, thumbnail, distinct item count and total from API', async () => {
  getCartItems.mockResolvedValue([{ ...item, qty: 2 }]);
  mount(makeStore(), <CartComponent />);
  expect(await screen.findByText('TOTAL: 800')).toBeInTheDocument();
  expect(screen.getByLabelText('장바구니 상품 종류 수')).toHaveTextContent('1');
  expect(screen.getByRole('img', { name: '상품4' })).toHaveAttribute('src', 'http://localhost:8080/api/products/view/s_first.jpg');
});

test('quantity buttons and X send the authenticated email and updated quantity', async () => {
  getCartItems.mockResolvedValue([{ ...item }]);
  postChangeCart.mockResolvedValueOnce([{ ...item, qty: 2 }]).mockResolvedValueOnce([{ ...item, qty: 1 }]).mockResolvedValueOnce([]);
  mount(makeStore(), <CartComponent />);
  await screen.findByText('TOTAL: 400');
  fireEvent.click(screen.getByRole('button', { name: '상품4 수량 증가' }));
  await screen.findByText('TOTAL: 800');
  expect(postChangeCart).toHaveBeenLastCalledWith({ email: member.email, cino: 11, pno: 5, qty: 2 });
  fireEvent.click(screen.getByRole('button', { name: '상품4 수량 감소' }));
  await screen.findByText('TOTAL: 400');
  fireEvent.click(screen.getByRole('button', { name: '상품4 장바구니 삭제' }));
  await screen.findByText('TOTAL: 0');
  expect(postChangeCart).toHaveBeenLastCalledWith({ email: member.email, cino: 11, pno: 5, qty: 0 });
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});

test('Add Cart adds a new product and confirms before increasing an existing quantity', async () => {
  const store = makeStore();
  postChangeCart.mockResolvedValueOnce([{ ...item }]).mockResolvedValueOnce([{ ...item, qty: 2 }]);
  const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  mount(store, <><ReadComponent pno="5" /><CartComponent /></>);
  const button = await screen.findByRole('button', { name: 'Add Cart' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await screen.findByText('TOTAL: 400');
  expect(postChangeCart).toHaveBeenLastCalledWith({ email: member.email, pno: 5, qty: 1 });
  fireEvent.click(button);
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(postChangeCart).toHaveBeenCalledTimes(1);
  fireEvent.click(button);
  await screen.findByText('TOTAL: 800');
  expect(postChangeCart).toHaveBeenLastCalledWith({ email: member.email, pno: 5, qty: 2 });
  confirm.mockRestore();
});

test('a request failure ends loading, preserves the cart and offers retry', async () => {
  getCartItems.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ ...item, imageFile: null }]);
  mount(makeStore(), <CartComponent />);
  expect(await screen.findByRole('alert')).toHaveTextContent('처리하지 못했습니다');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('TOTAL: 400');
  expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:8080/api/products/view/default.jpeg');
});

test('logout clears cart and ignores a response that arrives after logout', async () => {
  const store = makeStore();
  let resolve;
  getCartItems.mockImplementation(() => new Promise(done => { resolve = done; }));
  const pending = store.dispatch(getCartItemsAsync());
  store.dispatch(logout());
  resolve([{ ...item }]);
  await pending;
  expect(store.getState().cartSlice.items).toEqual([]);
  expect(store.getState().cartSlice.status).toBe('idle');
});

test('switching members discards the previous cart and its in-flight response', async () => {
  const store = makeStore();
  await store.dispatch(getCartItemsAsync());
  let resolve;
  postChangeCart.mockImplementation(() => new Promise(done => { resolve = done; }));
  const pending = store.dispatch(postChangeCartAsync({ email: member.email, pno: 5, qty: 1 }));
  store.dispatch(login({ ...member, email: 'other@aaa.com' }));
  resolve([{ ...item }]);
  await pending;
  expect(store.getState().cartSlice.items).toEqual([]);
});

test('prevents overlapping quantity updates while a mutation is pending', async () => {
  const store = makeStore();
  let resolve;
  postChangeCart.mockImplementation(() => new Promise(done => { resolve = done; }));
  const first = store.dispatch(postChangeCartAsync({ email: member.email, cino: 11, qty: 2 }));
  const second = await store.dispatch(postChangeCartAsync({ email: member.email, cino: 11, qty: 3 }));
  expect(second.meta.condition).toBe(true);
  expect(postChangeCart).toHaveBeenCalledTimes(1);
  resolve([{ ...item, qty: 2 }]);
  await first;
  expect(store.getState().cartSlice.items[0].qty).toBe(2);
});

test('a logged-out sidebar stays hidden and does not call the API', async () => {
  const store = makeStore();
  store.dispatch(logout());
  mount(store, <CartComponent />);
  await act(async () => {});
  expect(getCartItems).not.toHaveBeenCalled();
  expect(screen.queryByText(/TOTAL:/)).not.toBeInTheDocument();
});
