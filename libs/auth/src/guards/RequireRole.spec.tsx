import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import RequireRole from './RequireRole';

jest.mock('../hooks/useAuth');
const mockUseAuth = jest.mocked(useAuth);

function renderWithRole(userRoles: string[], requiredRoles: string[]) {
  mockUseAuth.mockReturnValue({
    isLoading: false,
    isAuthenticated: true,
    user: { id: '1', email: 'a@b.com', role: 'user' as const, roles: userRoles, tenant_id: '', is_active: true },
    clearSession: jest.fn(),
    setSession: jest.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route
          path="/admin/users"
          element={
            <RequireRole roles={requiredRoles}>
              <div>Admin Content</div>
            </RequireRole>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  it('redirects to /dashboard when user has none of the required roles', () => {
    renderWithRole(['author'], ['org_admin', 'admin']);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders children when user has one of the required roles', () => {
    renderWithRole(['org_admin'], ['org_admin', 'admin']);
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('renders children when user has multiple matching roles', () => {
    renderWithRole(['org_admin', 'reviewer'], ['org_admin']);
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects when user.roles is empty', () => {
    renderWithRole([], ['org_admin']);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
