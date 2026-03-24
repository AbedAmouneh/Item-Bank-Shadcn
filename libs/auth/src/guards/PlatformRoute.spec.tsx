import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import PlatformRoute from './PlatformRoute';

jest.mock('../hooks/useAuth');
const mockUseAuth = jest.mocked(useAuth);

function renderGuard(roles: string[]) {
  mockUseAuth.mockReturnValue({
    isLoading: false,
    isAuthenticated: roles.length > 0,
    user:
      roles.length > 0
        ? { id: '1', email: 'a@b.com', role: 'admin' as const, roles, tenant_id: '', is_active: true }
        : null,
    clearSession: jest.fn(),
    setSession: jest.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/platform/dashboard']}>
      <Routes>
        <Route element={<PlatformRoute />}>
          <Route path="/platform/dashboard" element={<div>Platform Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/dashboard" element={<div>Authoring Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlatformRoute', () => {
  it('renders null while loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      clearSession: jest.fn(),
      setSession: jest.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route element={<PlatformRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('redirects unauthenticated users to /login', () => {
    renderGuard([]);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('redirects users without a platform role to /dashboard', () => {
    renderGuard(['author']);
    expect(screen.getByText('Authoring Dashboard')).toBeInTheDocument();
  });

  it('renders outlet for super_admin', () => {
    renderGuard(['super_admin']);
    expect(screen.getByText('Platform Content')).toBeInTheDocument();
  });

  it('renders outlet for sales', () => {
    renderGuard(['sales']);
    expect(screen.getByText('Platform Content')).toBeInTheDocument();
  });
});
