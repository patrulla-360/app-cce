import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import "leaflet/dist/leaflet.css";
import ReferidosCargaPage from './pages/ReferidosCargaPage';
import DashboardReferidosPage from './pages/DashboardReferidosPage';
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage';
import FiscalesPage from './pages/FiscalesPage';


import ProtectedRoute from './pages/ProtectedRoute';

import VerificacionIdentidadResponsables  from './pages/VerificacionIdentidadResponsables';
import ResponsablesEnConstruccionPage  from './pages/ResponsablesEnConstruccionPage';
import  DiaVotacionPage from './pages/DiaVotacionPage';

import  PanelInicioResponsablesCarga from './pages/PanelInicioResponsablesCarga';
import  ResponsablesCargaPage from './pages/ResponsablesCargaPage';


import  DashboardPrincipalPage from './pages/DashboardPrincipalPage.jsx';

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

  <Route
    path="/referidos/dashboard"
    element={
      <ProtectedRoute>
        <DashboardReferidosPage />
      </ProtectedRoute>
    }
  />

  <Route
    path="/responsables"
    element={
      <ProtectedRoute>
        <ResponsablesEnConstruccionPage />
      </ProtectedRoute>
    }
  />


<Route
    path="/responsables/registro"
    element={
      
        <ResponsablesEnConstruccionPage  />
      
    }
  />


<Route
    path="/diavotacion"
    element={
      
        <DiaVotacionPage />
      
    }
  />



<Route
    path="/responsables/verificacion_identidad"
    element={
      
        <VerificacionIdentidadResponsables />
      
    }
  />


   <Route
    path="/responsables/inicio"
    element={
      <ProtectedRoute>
        <PanelInicioResponsablesCarga/>
      </ProtectedRoute>
    }
  />


  <Route
    path="responsables/votantes"
    element={
      <ProtectedRoute>
        <ResponsablesCargaPage/>
      </ProtectedRoute>
    }
  />



 <Route
    path="/dashboard/principal"
    element={
      <ProtectedRoute>
        <DashboardPrincipalPage/>
      </ProtectedRoute>
    }
  />




</Routes>
    </Router>
  </React.StrictMode>
)
