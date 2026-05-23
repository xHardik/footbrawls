// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './lib/user';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Guild from './pages/Guild';

function RequireUser({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            <RequireUser>
              <Home />
            </RequireUser>
          }
        />
        <Route
          path="/guild/:code"
          element={
            <RequireUser>
              <Guild />
            </RequireUser>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}