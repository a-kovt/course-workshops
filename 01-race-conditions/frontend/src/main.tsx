import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import '@/index.css';
import { Board } from '@/pages/Board';

const router = createBrowserRouter([
  { path: '/', element: <Board /> },
  {
    path: '/host',
    lazy: async () => ({ Component: (await import('@/pages/HostConsole')).HostConsole }),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
