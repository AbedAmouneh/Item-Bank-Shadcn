import { Navigate, Outlet } from 'react-router-dom';
import { NavBar } from '@item-bank/ui';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate replace to="/login" />;
  return (
    <div className="w-full min-w-0 overflow-hidden">
      <NavBar
        notifications={[]}
        onMarkNotificationAsRead={(_id) => {}}
        onMarkAllNotificationsAsRead={() => {}}
      />
      <Outlet />
    </div>
  );
};

export default ProtectedRoute;
