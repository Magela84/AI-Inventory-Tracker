// Root application component — gates the dashboard behind authentication.
import React from 'react';

import Dashboard from './pages/Dashboard.jsx';
import Login from './components/Login.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

function Gate() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
