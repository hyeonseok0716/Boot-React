import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MainPage from './pages/MainPage';
import IndexPage from './pages/todo/IndexPage';
import ListPage from './pages/todo/ListPage';
import ReadPage from './pages/todo/ReadPage';
import ModifyPage from './pages/todo/ModifyPage';

const Location = () => {
  const { pathname, search } = useLocation();
  return <output>{pathname}{search}</output>;
};

test('renders the shared layout and navigation', () => {
  render(<MemoryRouter><MainPage /></MemoryRouter>);
  expect(screen.getByText('Main Page')).toBeInTheDocument();
  expect(screen.getByText('Sidebar')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Todo' })).toHaveAttribute('href', '/todo/');
});

test('reads list pagination from the URL', () => {
  render(
    <MemoryRouter initialEntries={['/todo/list?page=3&size=20']}>
      <ListPage />
    </MemoryRouter>
  );
  expect(screen.getByText('Todo List Page Component 3 --- 20')).toBeInTheDocument();
});

test('navigates between nested Todo pages', () => {
  render(
    <MemoryRouter initialEntries={['/todo/list']}>
      <Routes>
        <Route path="/todo" element={<IndexPage />}>
          <Route path="list" element={<ListPage />} />
          <Route path="add" element={<div>Todo Add Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'ADD' }));
  expect(screen.getByText('Todo Add Page')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'LIST' }));
  expect(screen.getByText('Todo List Page Component 1 --- 10')).toBeInTheDocument();
});

test.each([
  ['Test Modify', '/todo/modify/33?page=3&size=20'],
  ['Test List', '/todo/list?page=3&size=20'],
])('preserves the query string for %s', (button, destination) => {
  render(
    <MemoryRouter initialEntries={['/todo/read/33?page=3&size=20']}>
      <Routes>
        <Route path="/todo/read/:tno" element={<ReadPage />} />
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText('Todo Read Page Component 33')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: button }));
  expect(screen.getByText(destination)).toBeInTheDocument();
});

test('returns from modify to the same Todo number', () => {
  render(
    <MemoryRouter initialEntries={['/todo/modify/33']}>
      <Routes>
        <Route path="/todo/modify/:tno" element={<ModifyPage />} />
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Test Read' }));
  expect(screen.getByText('/todo/read/33')).toBeInTheDocument();
});
