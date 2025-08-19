import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import DataTable from "react-data-table-component";


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
  const fetchEscuelas = () => {
    fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/escuelas/ubicaciones")
      .then((res) => res.json())
      .then((data) => setEscuelas(data))
      .catch((err) => console.error("Error al cargar escuelas:", err));
  };

  fetchEscuelas();
  const interval = setInterval(fetchEscuelas, 60000);
  return () => clearInterval(interval);
}, []);




const [estadoMesas, setEstadoMesas] = useState([]);
const [loadingEstados, setLoadingEstados] = useState(true);

useEffect(() => {
  const fetchEstadoMesas = () => {
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
  };

  fetchEstadoMesas();
  const interval = setInterval(fetchEstadoMesas, 60000);
  return () => clearInterval(interval);
}, []);




const [asistenciaGeneral, setAsistenciaGeneral] = useState(null);
const [loadingAsistencia, setLoadingAsistencia] = useState(true);
useEffect(() => {
  const fetchAsistenciaGeneral = () => {
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
  };

  fetchAsistenciaGeneral();
  const interval = setInterval(fetchAsistenciaGeneral, 60000);
  return () => clearInterval(interval);
}, []);





const [asistenciaHora, setAsistenciaHora] = useState([]);
useEffect(() => {
  const fetchAsistenciaHora = () => {
    fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/asistencia/por-hora")
      .then((res) => res.json())
      .then((data) => {
        setAsistenciaHora(data); // ya viene formateado
      })
      .catch((err) => {
        console.error("Error al cargar asistencia por hora:", err);
      });
  };

  fetchAsistenciaHora();
  const interval = setInterval(fetchAsistenciaHora, 60000);
  return () => clearInterval(interval);
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




const [busqueda, setBusqueda] = useState("");
const [pagina, setPagina] = useState(1);
const [limite, setLimite] = useState(10);
const [total, setTotal] = useState(0);
const [datos, setDatos] = useState([]);
const [cargandoTabla, setCargandoTabla] = useState(false);


const getFirebaseToken = async () => {
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return "";
};

useEffect(() => {
  const fetchVotantes = async () => {
    try {
      setCargandoTabla(true);

      const queryParams = new URLSearchParams({
        q: busqueda,
        page: pagina,
        limit: limite,
      });

      const token = await getFirebaseToken();

      const res = await fetch(`https://apis-cce-all-main-997103170342.us-east1.run.app/api/votantes/paginado?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Error al obtener votantes");

      const data = await res.json();
      setDatos(data.resultados);
      setTotal(data.total);
    } catch (error) {
      console.error("❌ Error al cargar votantes:", error);
    } finally {
      setCargandoTabla(false);
    }
  };

  fetchVotantes();
}, [busqueda, pagina, limite]);


  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <header className="bg-gradient-to-r from-[#009AC7] via-[#00B6ED] to-[#00D2FF] text-white p-6 rounded-xl shadow mb-6 text-center">
        <h1 className="text-3xl font-bold">COMANDO DE CONTROL ELECTORAL - Ciudad de San Miguel</h1>
        <p className="text-sm mt-1">Elecciones Legislativas  - Septiembre 2025</p>
      </header>


      <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[calc(100vh-200px)]">

        {/* MAPA IZQUIERDA */}
        <div className="lg:w-1/2 bg-white p-4 rounded-xl shadow flex flex-col flex-grow">

          <h2 className="text-lg font-semibold mb-3">Mapa Electoral - San Miguel</h2>
          <div className="flex gap-4 mb-4 text-sm">
            <Legend color="	bg-[#00B6ED]" label="Activas" />
            <Legend color="bg-yellow-400" label="Lentas" />
            <Legend color="bg-red-500" label="Problemas" />
          </div>
          <div className="rounded-xl overflow-hidden flex-grow min-h-[300px] sm:min-h-[400px]">

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


{/* 🔍 Búsqueda y tabla de personas */}
<div className="mt-10 space-y-6">

  <input
    type="text"
    placeholder="Buscar por DNI o nombre"
    value={busqueda}
    onChange={(e) => {
      setBusqueda(e.target.value);
      setPagina(1); // Reinicia la página
    }}
    className="border p-2 rounded w-full"
  />

  <div className="bg-white rounded-xl shadow p-4">
    <h2 className="text-lg font-semibold mb-4 text-[#1E293B]">Listado de Personas</h2>
    <DataTable
      data={datos}
      pagination
      paginationServer
      paginationTotalRows={total}
      onChangePage={(nuevaPagina) => setPagina(nuevaPagina)}
      onChangeRowsPerPage={(nuevoLimite) => setLimite(nuevoLimite)}
      highlightOnHover
      progressPending={cargandoTabla}
      columns={[
        { name: "DNI", selector: row => row.dni, sortable: true },
        { name: "Nombre", selector: row => row.nombre, sortable: true },
        { name: "Apellido", selector: row => row.apellido, sortable: true },


        { name: "Escuela", selector: row => row.escuela_nombre },
        { name: "Mesa", selector: row => row.nro_mesa },
        { name: "Asistió", selector: row => row.asistio ? "Sí" : "No" },
        { 
  name: "Hora", 
  selector: row => row.fecha_asistio 
    ? new Date(row.fecha_asistio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : "-" 
},

      ]}
    />
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
