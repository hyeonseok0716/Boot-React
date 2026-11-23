import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { TestProviders, testMember } from './testUtils';
import queryClient from './util/queryClient';
import { cartState } from './atoms/cartState';
import { clearMemberSession, saveMemberSession } from './util/memberSession';
import { getCartItems, postChangeCart } from './api/cartApi';
import { getOne } from './api/productsApi';
import CartComponent from './components/menus/CartComponent';
import ReadComponent from './components/products/ReadComponent';

jest.mock('./api/cartApi', () => ({ getCartItems: jest.fn(), postChangeCart: jest.fn() }));
jest.mock('./api/productsApi', () => ({ getOne: jest.fn() }));
jest.mock('./api/memberApi', () => ({ loginPost: jest.fn() }));

const member = testMember;
const item = { cino: 11, pno: 5, qty: 1, pname: '상품4', price: 400, imageFile: 'first.jpg' };
const Probe = () => <div data-testid="cart-state">{JSON.stringify(useRecoilValue(cartState))}</div>;
const mount = (node, initial = member) => render(<TestProviders member={initial}><MemoryRouter>{node}<Probe /></MemoryRouter></TestProviders>);

beforeEach(() => {
  queryClient.clear();
  clearMemberSession();
  jest.clearAllMocks();
  getCartItems.mockResolvedValue([]);
  postChangeCart.mockResolvedValue([]);
  getOne.mockResolvedValue({ pno: 5, pname: '상품4', pdesc: '상품설명 4', price: 400, uploadFileNames: [] });
});

test('loads cart items, thumbnail, distinct item count and total from API', async () => {
  getCartItems.mockResolvedValue([{ ...item, qty: 2 }]);
  mount( <CartComponent />);
  expect(await screen.findByText('TOTAL: 800')).toBeInTheDocument();
  expect(screen.getByLabelText('장바구니 상품 종류 수')).toHaveTextContent('1');
  expect(screen.getByRole('img', { name: '상품4' })).toHaveAttribute('src', 'http://localhost:8080/api/products/view/s_first.jpg');
});

test('quantity buttons and X send the authenticated email and updated quantity', async () => {
  getCartItems.mockResolvedValue([{ ...item }]);
  postChangeCart.mockResolvedValueOnce([{ ...item, qty: 2 }]).mockResolvedValueOnce([{ ...item, qty: 1 }]).mockResolvedValueOnce([]);
  mount( <CartComponent />);
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
  postChangeCart.mockResolvedValueOnce([{ ...item }]).mockResolvedValueOnce([{ ...item, qty: 2 }]);
  const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  mount( <><ReadComponent pno="5" /><CartComponent /></>);
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
  mount( <CartComponent />);
  expect(await screen.findByRole('alert')).toHaveTextContent('처리하지 못했습니다');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('TOTAL: 400');
  expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:8080/api/products/view/default.jpeg');
});

test('logout clears Recoil cart and query cache and ignores a late response', async () => {
  let resolve;
  getCartItems.mockImplementation(() => new Promise(done => { resolve = done; }));
  mount(<CartComponent />);
  await waitFor(() => expect(getCartItems).toHaveBeenCalledTimes(1));
  act(() => clearMemberSession());
  await act(async () => { resolve([{ ...item }]); });
  expect(screen.getByTestId('cart-state')).toHaveTextContent('[]');
  expect(screen.queryByText(/TOTAL:/)).not.toBeInTheDocument();
  expect(queryClient.getQueryCache().getAll().filter(query => query.queryKey[0] === 'cart' && query.queryKey[1] === member.email)).toHaveLength(0);
});

test('switching members discards the previous cart and its in-flight mutation', async () => {
  getCartItems.mockResolvedValue([{...item}]);
  let resolve;
  postChangeCart.mockImplementation(() => new Promise(done => { resolve = done; }));
  mount(<CartComponent />);
  await screen.findByText('TOTAL: 400');
  fireEvent.click(screen.getByRole('button', {name: '상품4 수량 증가'}));
  await waitFor(() => expect(postChangeCart).toHaveBeenCalledTimes(1));
  getCartItems.mockResolvedValue([]);
  act(() => saveMemberSession({...member, email: 'other@aaa.com', nickname: 'OTHER'}, true));
  await screen.findByText("OTHER's Cart");
  await act(async () => { resolve([{...item, qty: 2}]); });
  await waitFor(() => expect(screen.getByTestId('cart-state')).toHaveTextContent('[]'));
});

test('disables quantity controls during an in-flight mutation', async () => {
  getCartItems.mockResolvedValue([{...item}]);
  let resolve;
  postChangeCart.mockImplementation(() => new Promise(done => { resolve = done; }));
  mount(<CartComponent />);
  await screen.findByText('TOTAL: 400');
  const button = screen.getByRole('button', {name: '상품4 수량 증가'});
  fireEvent.click(button);
  await waitFor(() => expect(button).toBeDisabled());
  fireEvent.click(button);
  expect(postChangeCart).toHaveBeenCalledTimes(1);
  await act(async () => { resolve([{...item, qty: 2}]); });
  await screen.findByText('TOTAL: 800');
});

test('a logged-out sidebar stays hidden and does not call the API', async () => {
  mount(<CartComponent />, { email: '', nickname: '', status: 'idle' });
  await act(async () => {});
  expect(getCartItems).not.toHaveBeenCalled();
  expect(screen.queryByText(/TOTAL:/)).not.toBeInTheDocument();
});
