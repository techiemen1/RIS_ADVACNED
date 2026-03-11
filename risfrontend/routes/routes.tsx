import Dashboard from '../pages/Dashboard/Dashboard';
import Login from '../pages/Auth/Login';
import { ProtectedRoute } from './ProtectedRoute';

export const routes = [
  { path: '/login', element: <Login /> },
  { path: '/', element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
];
