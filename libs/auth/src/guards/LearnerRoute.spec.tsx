import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import LearnerRoute from './LearnerRoute';

jest.mock('../hooks/useAuth');
const mockUseAuth = jest.mocked(useAuth);

function renderGuard(roles: string[]) {
  mockUseAuth.mockReturnValue({
    isLoading: false,
    isAuthenticated: roles.length > 0,
    user:
      roles.length > 0
        ? { id: '1', email: 'a@b.com', role: 'user' as const, roles, tenant_id: '', is_active: true }
        : null,
    clearSession: jest.fn(),
    setSession: jest.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/learn/dashboard']}>
      <Routes>
        <Route element={<LearnerRoute />}>
          <Route path="/learn/dashboard" element={<div>Learn Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/dashboard" element={<div>Authoring Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LearnerRoute', () => {
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
          <Route element={<LearnerRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('redirects unauthenticated users to /login', () => {
    renderGuard([]);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('redirects users without the learner role to /dashboard', () => {
    renderGuard(['author']);
    expect(screen.getByText('Authoring Dashboard')).toBeInTheDocument();
  });

  it('renders outlet for learner role', () => {
    renderGuard(['learner']);
    expect(screen.getByText('Learn Content')).toBeInTheDocument();
  });

  it('renders outlet for dual-role user (learner + author)', () => {
    renderGuard(['learner', 'author']);
    expect(screen.getByText('Learn Content')).toBeInTheDocument();
  });
});
