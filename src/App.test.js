import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { getList, getOne, putOne } from './api/todoApi';
import MainPage from './pages/MainPage';
import ListPage from './pages/todo/ListPage';
import ReadPage from './pages/todo/ReadPage';
import ModifyPage from './pages/todo/ModifyPage';
import ResultModal from './components/common/ResultModal';

jest.mock('./api/todoApi', () => ({
  getList: jest.fn(), getOne: jest.fn(), postAdd: jest.fn(),
  putOne: jest.fn(), deleteOne: jest.fn(),
}));

const todo = { tno: 33, title: 'Sample Title', writer: 'user1', dueDate: '2023-10-10', complete: false };
const list = { dtoList: [todo], pageNumList: [1, 2, 3], current: 3, prev: false, next: false };
const Location = () => {
  const { pathname, search } = useLocation();
  return <output>{pathname}{search}</output>;
};

beforeEach(() => {
  jest.clearAllMocks();
  getList.mockResolvedValue(list);
  getOne.mockResolvedValue(todo);
  putOne.mockResolvedValue({ RESULT: 'SUCCESS' });
});

test('renders the common navigation and sidebar', () => {
  render(<MemoryRouter><MainPage /></MemoryRouter>);
  expect(screen.getByText('Sidebar')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Todo' })).toHaveAttribute('href', '/todo/');
});

test('loads and displays API data using URL pagination', async () => {
  render(<MemoryRouter initialEntries={['/todo/list?page=3&size=20']}><ListPage /></MemoryRouter>);
  expect(await screen.findByText('Sample Title')).toBeInTheDocument();
  expect(getList).toHaveBeenCalledWith({ page: 3, size: 20 });
  expect(screen.getByText('2023-10-10')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '3', exact: true }));
  await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
});

test('shows a visible message when the list API fails', async () => {
  getList.mockRejectedValueOnce(new Error('offline'));
  render(<MemoryRouter><ListPage /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('목록을 불러오지 못했습니다.');
});

test('preserves page and size from read to modify', async () => {
  render(
    <MemoryRouter initialEntries={['/todo/read/33?page=3&size=20']}>
      <Routes>
        <Route path="/todo">
          <Route path="read/:tno" element={<ReadPage />} />
          <Route path="modify/:tno" element={<Location />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText('Sample Title');
  fireEvent.click(screen.getByRole('button', { name: 'Modify' }));
  expect(screen.getByText('/todo/modify/33?page=3&size=20')).toBeInTheDocument();
});

test('saves changed completion and title, then displays the result modal', async () => {
  render(
    <MemoryRouter initialEntries={['/todo/modify/33']}>
      <Routes><Route path="/todo/modify/:tno" element={<ModifyPage />} /></Routes>
    </MemoryRouter>
  );
  const title = await screen.findByDisplayValue('Sample Title');
  fireEvent.change(title, { target: { name: 'title', value: 'Updated Title' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Y' } });
  fireEvent.click(screen.getByRole('button', { name: 'Modify', exact: true }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Modified');
  expect(putOne).toHaveBeenCalledWith({ ...todo, title: 'Updated Title', complete: true });
});

test('closes a modal once without propagating the button click', () => {
  const close = jest.fn();
  render(<ResultModal title="Result" content="SUCCESS" callbackFn={close} />);
  fireEvent.click(screen.getByRole('button', { name: 'Close Modal' }));
  expect(close).toHaveBeenCalledTimes(1);
});
