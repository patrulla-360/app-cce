import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';


import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix íconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png"
});

const COLORS = ["#00B6ED", "#6B7280", "#1E293B", "#38BDF8"];
const iconEscuela = L.divIcon({
  className: "icon-escuela",
  html: '<div class="cuadrado-verde"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function DashboardPage() {
  

  const [escuelas, setEscuelas] = useState([]);

  useEffect(() => {
    fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/escuelas/ubicaciones")
      .then((res) => res.json())
      .then((data) => setEscuelas(data))
      .catch((err) => console.error("Error al cargar escuelas:", err));
  }, []);



const [estadoMesas, setEstadoMesas] = useState([]);
const [loadingEstados, setLoadingEstados] = useState(true);

useEffect(() => {
  fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/mesas/por-estado")
    .then(res => res.json())
    .then(data => {
      const formateado = data.map(e => ({
        name: e.estado,
        value: e.cantidad_mesas
      }));
      setEstadoMesas(formateado);
    })
    .catch(err => console.error("Error al cargar estado de mesas:", err))
    .finally(() => setLoadingEstados(false));
}, []);




const [asistenciaGeneral, setAsistenciaGeneral] = useState(null);
const [loadingAsistencia, setLoadingAsistencia] = useState(true);

useEffect(() => {
  fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/asistencia/general")
    .then((res) => res.json())
    .then((data) => {
      setAsistenciaGeneral(data);
      setLoadingAsistencia(false);
    })
    .catch((err) => {
      console.error("Error al cargar asistencia general:", err);
      setLoadingAsistencia(false);
    });
}, []);

const [asistenciaHora, setAsistenciaHora] = useState([]);
useEffect(() => {
  fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/asistencia/por-hora")
    .then((res) => res.json())
    .then((data) => {
      setAsistenciaHora(data); // ya viene formateado
    })
    .catch((err) => {
      console.error("Error al cargar asistencia por hora:", err);
    });
}, []);

function BarraAvanceItem({ nombre, porcentaje }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 truncate">{nombre}</span>
        <span className="text-gray-600 font-semibold">{porcentaje}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-[#00B6ED] h-4 rounded-full transition-all duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}




const [topEscuelasAvance, setTopEscuelasAvance] = useState([]);
const [topEscuelasRezago, setTopEscuelasRezago] = useState([]);
const [topMesasAvance, setTopMesasAvance] = useState([]);
const [topMesasRezago, setTopMesasRezago] = useState([]);

useEffect(() => {
  fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/top-escuelas-avance")
    .then(res => res.json()).then(setTopEscuelasAvance);
  fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/top-escuelas-rezago")
    .then(res => res.json()).then(setTopEscuelasRezago);
  fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/top-mesas-avance")
    .then(res => res.json()).then(setTopMesasAvance);
  fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/top-mesas-rezago")
    .then(res => res.json()).then(setTopMesasRezago);
}, []);



  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <header className="bg-gradient-to-r from-[#009AC7] via-[#00B6ED] to-[#00D2FF] text-white p-6 rounded-xl shadow mb-6 text-center">
        <h1 className="text-3xl font-bold">COMANDO DE CONTROL ELECTORAL - Ciudad de San Miguel</h1>
        <p className="text-sm mt-1">Elecciones Legislativas  - Septiembre 2025</p>
      </header>


      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* MAPA IZQUIERDA */}
        <div className="lg:w-1/2 bg-white p-4 rounded-xl shadow h-auto flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Mapa Electoral - San Miguel</h2>
          <div className="flex gap-4 mb-4 text-sm">
            <Legend color="	bg-[#00B6ED]" label="Activas" />
            <Legend color="bg-yellow-400" label="Lentas" />
            <Legend color="bg-red-500" label="Problemas" />
          </div>
          <div className="flex-1 rounded-xl overflow-hidden min-h-[600px]">
            <MapContainer
              center={[-34.5600, -58.7115]}
              zoom={12.5}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {escuelas
                .filter((e) => e.latitud !== null && e.longitud !== null)
                .map((e, i) => (
                  <Marker key={i} position={[e.latitud, e.longitud]} icon={iconEscuela}>
                    <Popup>
                      <strong>{e.nombre}</strong><br />
                      {e.direccion}
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </div>

        {/* MÉTRICAS DERECHA */}
        <div className="lg:w-1/2 flex flex-col gap-6">
          {/* TOP 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white  rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold text-[#00B6ED] mb-2">Top 5 Mesas Más Rápidas</h2>
              <ul className="divide-y divide-gray-200 text-sm">
                <li className="py-2 flex justify-between">
                  <span className="font-medium text-gray-700">Mesa 1547 · Escuela Nº 234</span>
                  <span className="text-[#00B6ED] font-semibold">15 min promedio</span>
                </li>
                <li className="py-2 flex justify-between">
                  <span className="font-medium text-gray-700">Mesa 1789 · Escuela Nº 456</span>
                  <span className="text-[#00B6ED] font-semibold">17 min promedio</span>
                </li>
              </ul>
            </div>

            <div className="bg-white  rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold text-[#1E293B] mb-2"> Top 5 Mesas Más Lentas</h2>
              <ul className="divide-y divide-gray-200 text-sm">
                <li className="py-2 flex justify-between">
                  <span className="font-medium text-gray-700">Mesa 0987 · Escuela Nº 12</span>
                  <span className="text-[#1E293B] font-semibold">58 min promedio</span>
                </li>
                <li className="py-2 flex justify-between">
                  <span className="font-medium text-gray-700">Mesa 0456 · Escuela Nº 123</span>
                  <span className="text-[#1E293B] font-semibold">55 min promedio</span>
                </li>
              </ul>
            </div>
          </div>


          <div className="flex flex-col md:flex-row gap-6">
             {/* ESTADO DE MESAS */}
               <div className="bg-white p-4 rounded-xl shadow w-full md:w-1/2">
                    <h2 className="text-lg font-semibold mb-4 text-[#1E293B]">Estado de las Mesas</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      {loadingEstados ? (
                        <div className="col-span-3 text-center text-gray-500">
                          Cargando estado de mesas...
                        </div>
                      ) : (
                        estadoMesas.map((e, i) => (
                          <StatCard
                            key={i}
                            title={e.name}
                            value={e.value}
                            bg={`bg-[${COLORS[i % COLORS.length]}]/10`}
                            text={`text-[${COLORS[i % COLORS.length]}]`}
                          />
                        ))
                      )}
                    </div>

                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={estadoMesas}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {estadoMesas.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>






              {/* ASISTENCIA */}
              <div className="bg-white  p-4 rounded-xl shadow w-full md:w-1/2">
                <h2 className="text-lg font-semibold mb-4 text-[#00B6ED]">Asistencia General</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <StatCard
                      title="Total Empadronados"
                      value={asistenciaGeneral?.cantidad_total ?? "-"}
                      bg="bg-white"
                      text="text-[#1E293B]"
                    />
                    <StatCard
                      title="Asistieron"
                      value={asistenciaGeneral?.cantidad_asistieron ?? "-"}
                      bg="bg-white"
                      text="text-[#00B6ED]"
                    />

                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-700 mb-1 font-medium">Porcentaje de Asistencia</p>
                  <div className="w-full bg-gray-200 rounded-full h-6 relative">
                    <div
                        className="bg-[#00B6ED] h-6 rounded-full text-white text-sm font-semibold flex items-center justify-center transition-all duration-500"
                        style={{ width: `${asistenciaGeneral?.porcentaje_asistencia ?? 0}%` }}
                      >
                        {asistenciaGeneral?.porcentaje_asistencia ?? 0}%
                      </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={asistenciaHora}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora_label" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="asistencia"
                      stroke="#00B6ED"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>


                
              </div>
            </div>



{/* TOP ESCUELAS Y MESAS AVANCE */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
  {/* ESCUELAS */}
  <div className="bg-white p-6 rounded-xl shadow">
    <h3 className="text-lg font-semibold text-[#1E293B] mb-4">🏫 Escuelas con más avance</h3>
    {Array.isArray(topEscuelasAvance) && topEscuelasAvance.map((e, i) => (
      <BarraAvanceItem key={i} nombre={e.nombre} porcentaje={e.porcentaje} />
    ))}

    <h3 className="text-lg font-semibold text-[#9CA3AF] mt-6 mb-4">Escuelas con menor avance</h3>
    {Array.isArray(topEscuelasRezago) && topEscuelasRezago.map((e, i) => (
      <BarraAvanceItem key={i} nombre={e.nombre} porcentaje={e.porcentaje} />
    ))}
  </div>

  {/* MESAS */}
  <div className="bg-white p-6 rounded-xl shadow">
    <h3 className="text-lg font-semibold text-[#1E293B] mb-4">🗳️ Mesas con más avance</h3>
    {Array.isArray(topMesasAvance) && topMesasAvance.map((e, i) => (
      <BarraAvanceItem key={i} nombre={`Mesa ${e.titulo} · ${e.escuela}`} porcentaje={e.porcentaje} />
    ))}

    <h3 className="text-lg font-semibold text-[#9CA3AF] mt-6 mb-4">Mesas con menor avance</h3>
    {Array.isArray(topMesasRezago) && topMesasRezago.map((e, i) => (
      <BarraAvanceItem key={i} nombre={`Mesa ${e.titulo} · ${e.escuela}`} porcentaje={e.porcentaje} />
    ))}
  </div>
</div>











        </div>
      </div>
    </div>
  );
}

// COMPONENTES REUTILIZABLES
function StatCard({ title, value, bg, text }) {
  return (
    <div className={`p-4 rounded-xl shadow text-center ${bg} ${text}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm">{title}</div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-3 h-3 rounded-full ${color}`}></span>
      <span className="text-gray-600">{label}</span>
    </div>
  );
}
