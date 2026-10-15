import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../lib/auth';

/** Renders `children` only while a session exists; otherwise → /login. */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return children;
}
