import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import "leaflet/dist/leaflet.css";
import ReferidosCargaPage from './pages/ReferidosCargaPage';
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage';
import FiscalesPage from './pages/FiscalesPage';
import ProtectedRoute from './pages/ProtectedRoute';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
    <Routes>
  <Route path="/" element={<LoginPage />} />

  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    }
  />

  <Route
    path="/fiscales"
    element={
      <ProtectedRoute>
        <FiscalesPage />
      </ProtectedRoute>
    }
  />

  <Route
    path="/referidos"
    element={
      <ProtectedRoute>
        <ReferidosCargaPage />
      </ProtectedRoute>
    }
  />
</Routes>
    </Router>
  </React.StrictMode>
)
