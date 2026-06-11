import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ContactLog from './pages/ContactLog';
import CentralGarage from './pages/CentralGarage';
import Insurance from './pages/Insurance';
import Equipment from './pages/Equipment';

function App() {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="managers" element={<ContactLog />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="garage" element={<CentralGarage />} />
          <Route path="insurance" element={<Insurance />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
