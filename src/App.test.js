import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the heading from page 21', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Hello world!' })).toBeInTheDocument();
});
