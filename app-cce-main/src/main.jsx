import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import "leaflet/dist/leaflet.css";
import ReferidosCargaPage from './pages/ReferidosCargaPage';
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage';
import FiscalesPage from './pages/FiscalesPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
     <Routes>

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<LoginPage />} />
        <Route path="/fiscales" element={<FiscalesPage />} />
<Route path="/referidos" element={<ReferidosCargaPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
)
