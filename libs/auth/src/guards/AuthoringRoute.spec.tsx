import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import AuthoringRoute from './AuthoringRoute';

jest.mock('../hooks/useAuth');
const mockUseAuth = jest.mocked(useAuth);

/** Minimal auth state factory — override only what each test needs. */
function makeAuth(overrides: Partial<ReturnType<typeof useAuth>>) {
  return {
    isLoading: false,
    isAuthenticated: true,
    user: {
      id: '1',
      email: 'a@b.com',
      role: 'user' as const,
      roles: ['author'],
      tenant_id: 'org1',
      is_active: true,
    },
    clearSession: jest.fn(),
    setSession: jest.fn(),
    ...overrides,
  };
}

function renderGuard(userRoles: string[], path = '/dashboard') {
  mockUseAuth.mockReturnValue(
    makeAuth({
      isAuthenticated: userRoles.length > 0,
      user:
        userRoles.length > 0
          ? { id: '1', email: 'a@b.com', role: 'user', roles: userRoles, tenant_id: '', is_active: true }
          : null,
    }),
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthoringRoute />}>
          <Route path="/dashboard" element={<div>Authoring Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/learn/dashboard" element={<div>Learn Dashboard</div>} />
        <Route path="/platform/dashboard" element={<div>Platform Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthoringRoute', () => {
  it('renders null while loading', () => {
    mockUseAuth.mockReturnValue(makeAuth({ isLoading: true, isAuthenticated: false, user: null }));
    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route element={<AuthoringRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('redirects unauthenticated users to /login', () => {
    renderGuard([], '/dashboard');
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('redirects learner-only users to /learn/dashboard', () => {
    renderGuard(['learner']);
    expect(screen.getByText('Learn Dashboard')).toBeInTheDocument();
  });

  it('redirects platform-only users to /platform/dashboard', () => {
    renderGuard(['super_admin']);
    expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
  });

  it('renders outlet for users with an authoring role', () => {
    renderGuard(['author']);
    expect(screen.getByText('Authoring Content')).toBeInTheDocument();
  });

  it('renders outlet for dual-role users (authoring + learner)', () => {
    renderGuard(['author', 'learner']);
    expect(screen.getByText('Authoring Content')).toBeInTheDocument();
  });

  it('renders outlet for org_admin role', () => {
    renderGuard(['org_admin']);
    expect(screen.getByText('Authoring Content')).toBeInTheDocument();
  });
});
