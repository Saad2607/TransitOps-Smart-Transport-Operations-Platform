import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!allowedRoles.includes(user?.roleName)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
