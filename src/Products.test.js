import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { getList, getOne, postAdd, putOne } from './api/productsApi';
import ListComponent from './components/products/ListComponent';
import AddComponent from './components/products/AddComponent';
import ModifyComponent from './components/products/ModifyComponent';

jest.mock('./api/productsApi', () => ({
  getList: jest.fn(), getOne: jest.fn(), postAdd: jest.fn(),
  putOne: jest.fn(), deleteOne: jest.fn(),
}));
jest.mock('./api/todoApi', () => ({ API_SERVER_HOST: 'http://localhost:8080' }));


const testStore = configureStore({ reducer: { loginSlice: () => ({ email: 'user1@aaa.com', accessToken: 'access', refreshToken: 'refresh' }) } });
const TestRouter = ({children, ...props}) => <Provider store={testStore}><MemoryRouter {...props}>{children}</MemoryRouter></Provider>;
jest.mock('./api/memberApi', () => ({ loginPost: jest.fn() }));
const product = { pno: 10, pname: '상품9', pdesc: '상품설명 9', price: 900,
  delFlag: false, uploadFileNames: ['first.jpg', 'second.jpg'] };
const list = { dtoList: [product], pageNumList: [1], current: 1, prev: false, next: false };

beforeEach(() => {
  jest.clearAllMocks();
  getList.mockResolvedValue(list);
  getOne.mockResolvedValue({ ...product, uploadFileNames: [...product.uploadFileNames] });
  postAdd.mockResolvedValue({ result: 20 });
  putOne.mockResolvedValue({ RESULT: 'SUCCESS' });
});

test('displays product cards with API thumbnails', async () => {
  render(<TestRouter><ListComponent /></TestRouter>);
  expect(await screen.findByText('이름: 상품9')).toBeInTheDocument();
  expect(screen.getByText('가격: 900')).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:8080/api/products/view/s_first.jpg');
  fireEvent.click(screen.getByRole('button', { name: '1', exact: true }));
  await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
});

test('clears the loading modal after a failed request', async () => {
  getList.mockRejectedValueOnce(new Error('offline'));
  render(<TestRouter><ListComponent /></TestRouter>);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('clears the loading modal after a failed product registration', async () => {
  postAdd.mockRejectedValueOnce(new Error('offline'));
  render(<TestRouter><AddComponent /></TestRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'ADD', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('등록하지 못했습니다.');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('uses a fallback image when there is no upload', async () => {
  getList.mockResolvedValueOnce({ ...list, dtoList: [{ ...product, uploadFileNames: [] }] });
  render(<TestRouter><ListComponent /></TestRouter>);
  expect(await screen.findByRole('img')).toHaveAttribute('src', 'http://localhost:8080/api/products/view/default.jpeg');
});

test('submits product data and selected files together', async () => {
  const { container } = render(<TestRouter><AddComponent /></TestRouter>);
  fireEvent.change(container.querySelector('[name="pname"]'), { target: { name: 'pname', value: 'Sample Product' } });
  fireEvent.change(container.querySelector('[name="pdesc"]'), { target: { name: 'pdesc', value: 'Description' } });
  fireEvent.change(container.querySelector('[name="price"]'), { target: { name: 'price', value: '1000' } });
  const file = new File(['image'], 'sample.jpg', { type: 'image/jpeg' });
  fireEvent.change(container.querySelector('[type="file"]'), { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: 'ADD', exact: true }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('20번 등록 완료');
  const body = postAdd.mock.calls[0][0];
  expect(body.get('pname')).toBe('Sample Product');
  expect(body.get('price')).toBe('1000');
  expect(body.getAll('files')[0]).toBe(file);
});

test('retains selected images and includes newly selected files on modify', async () => {
  const { container } = render(<TestRouter><ModifyComponent pno="10" /></TestRouter>);
  await screen.findByDisplayValue('상품9');
  fireEvent.click(screen.getByRole('button', { name: '이미지 1 삭제' }));
  const file = new File(['new'], 'new.jpg', { type: 'image/jpeg' });
  fireEvent.change(container.querySelector('[type="file"]'), { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: 'Modify', exact: true }));
  expect(await screen.findByRole('dialog', { name: 'Modified' })).toBeInTheDocument();
  const [pno, body] = putOne.mock.calls[0];
  expect(pno).toBe('10');
  expect(body.getAll('uploadFileNames')).toEqual(['second.jpg']);
  expect(body.getAll('files')[0]).toBe(file);
});
