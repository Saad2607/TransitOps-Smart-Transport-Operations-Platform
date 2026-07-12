import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { ROLES } from './config/roles';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Compliance from './pages/Compliance';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import FuelLogs from './pages/FuelLogs';
import Maintenance from './pages/Maintenance';
import Unauthorized from './pages/Unauthorized';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/vehicles"
            element={
              <RoleRoute allowedRoles={[ROLES.FLEET_MANAGER]}>
                <Vehicles />
              </RoleRoute>
            }
          />

          <Route
            path="/drivers"
            element={
              <RoleRoute allowedRoles={[ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER]}>
                <Drivers />
              </RoleRoute>
            }
          />

          <Route
            path="/trips"
            element={
              <RoleRoute allowedRoles={[ROLES.FLEET_MANAGER, ROLES.DRIVER]}>
                <Trips />
              </RoleRoute>
            }
          />

          <Route
            path="/compliance"
            element={
              <RoleRoute allowedRoles={[ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER]}>
                <Compliance />
              </RoleRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <RoleRoute allowedRoles={[ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST]}>
                <Reports />
              </RoleRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <RoleRoute allowedRoles={[ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST]}>
                <Expenses />
              </RoleRoute>
            }
          />

          <Route
            path="/fuel-logs"
            element={
              <RoleRoute
                allowedRoles={[ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST, ROLES.DRIVER]}
              >
                <FuelLogs />
              </RoleRoute>
            }
          />

          <Route
            path="/maintenance"
            element={
              <RoleRoute allowedRoles={[ROLES.FLEET_MANAGER]}>
                <Maintenance />
              </RoleRoute>
            }
          />

          <Route path="/unauthorized" element={<Unauthorized />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
