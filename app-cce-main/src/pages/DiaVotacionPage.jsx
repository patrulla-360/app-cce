import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";
import { Users, CheckCircle2, XCircle, Filter, Search, RefreshCw } from "lucide-react";

// ======================
// Mock distribución
// ======================
const DISTRIBUCION_RESPONSABLE_SECRETARIA = [
  { nombre: "Francisco Nigro", referencia: "Gobierno", cantidad: 8256 },
  { nombre: "Luis Constan", referencia: "Salud", cantidad: 1977 },
  { nombre: "Yesica Grillo", referencia: "Infancia y Familia", cantidad: 1927 },
  { nombre: "Ignacio Zone", referencia: "Seguridad", cantidad: 1832 },
  { nombre: "Federico Randle", referencia: "Obras", cantidad: 1261 },
  { nombre: "Andres Lagalaye", referencia: "Educacion", cantidad: 1082 },
  { nombre: "Franco Ortiz", referencia: "Prensa y Comunicacion", cantidad: 491 },
  { nombre: "Milagros Richards", referencia: "Planeamiento Urbano", cantidad: 486 },
  { nombre: "Marcelo Conzi", referencia: "Hacienda", cantidad: 371 },
  { nombre: "Joaquin Estrada", referencia: "Jefatura de Gabinete", cantidad: 307 },
];

const SECRETARIAS = Array.from(new Set(DISTRIBUCION_RESPONSABLE_SECRETARIA.map((d) => d.referencia)));
const ATTENDANCE_RATE = 0.62;

const MOCK_POR_SECRETARIA = SECRETARIAS.map((ref) => {
  const cant = DISTRIBUCION_RESPONSABLE_SECRETARIA.filter((d) => d.referencia === ref).reduce((acc, r) => acc + r.cantidad, 0);
  const votaron = Math.round(cant * ATTENDANCE_RATE);
  const noVotaron = cant - votaron;
  return { referencia: ref, votaron, noVotaron, cantidad: cant };
});

const TOTAL_PERSONAS = DISTRIBUCION_RESPONSABLE_SECRETARIA.reduce((acc, r) => acc + r.cantidad, 0);
const TOTAL_VOTARON = Math.round(TOTAL_PERSONAS * ATTENDANCE_RATE);
const TOTAL_NO_VOTARON = TOTAL_PERSONAS - TOTAL_VOTARON;

const HORAS = ["08", "09", "10", "11", "12", "13", "14", "15", "16"];
const PERFIL_HORA = [0.05, 0.07, 0.1, 0.12, 0.15, 0.17, 0.16, 0.1, 0.08];
const VOTOS_POR_HORA = PERFIL_HORA.map((w) => Math.round(TOTAL_VOTARON * w));
const ACUM_VOTARON = VOTOS_POR_HORA.map((_, i) => VOTOS_POR_HORA.slice(0, i + 1).reduce((a, b) => a + b, 0));
const ACUM_NO_VOTARON = ACUM_VOTARON.map((v) => TOTAL_PERSONAS - v);
const MOCK_EVOLUCION_HORA = HORAS.map((h, i) => ({ hora: `${h}:00`, votaron: ACUM_VOTARON[i], noVotaron: ACUM_NO_VOTARON[i] }));

// Tabla mock
const POSS_INTERMEDIO = ["Sofía Salinas", "Zona Norte", "Zona Sur", "Zona Oeste"];
const POSS_DIRECTO = ["Gabriel Lopez", "Danilo Garín", "María Ruiz", "Juan Pérez"];

const MOCK_REFERIDOS = Array.from({ length: 400 }).map((_, i) => {
  const fila = DISTRIBUCION_RESPONSABLE_SECRETARIA[i % DISTRIBUCION_RESPONSABLE_SECRETARIA.length];
  return {
    documento: String(13000000 + (i * 137) % 99000000).slice(0, 8),
    apellido_nombre: [
      "SENZACQUA JUAN CARLOS",
      "LOPEZ ZAMPAGLIONE BRUNO JAVIER",
      "GARCIA ALAN EZEQUIEL",
      "AZCUENAGA ANA AUGUSTA CARMEN",
      "AFFRONTI NICOLAS",
      "FARIAS SABRINA AYELEN",
      "BENINCA SILVIA TERESITA",
      "MARTINEZ LUCAS DAMIAN",
    ][i % 8],
    nombre: fila.nombre,
    referencia: fila.referencia,
    resp_intermedio: POSS_INTERMEDIO[i % POSS_INTERMEDIO.length],
    resp_directo: POSS_DIRECTO[i % POSS_DIRECTO.length],
    empleado_municipal: i % 4 === 0,
    asistio: i % 3 !== 0,
    created_at: new Date(2025, 8, 4, 10, (i * 3) % 60, (i * 7) % 60).toISOString(),
  };
});

const COLORS = ["#00B6ED", "#4ade80", "#fbbf24", "#f87171"];

// util: formato de números (AR)
const formatNumber = (n) => new Intl.NumberFormat("es-AR").format(n);

const calcKPIs = () => {
  const totV = TOTAL_VOTARON;
  const totNV = TOTAL_NO_VOTARON;
  const total = TOTAL_PERSONAS;
  const tasa = total ? (totV / total) * 100 : 0;
  return { total, totV, totNV, tasa };
};

const KPI = ({ icon, label, value, hint }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
    <div className="rounded-xl bg-sky-50 p-3">{icon}</div>
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
    </div>
  </div>
);

const Card = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export default function DashboardVotacionPage() {
  // ======================
  // Filtros locales
  // ======================
  const [filtroReferencia, setFiltroReferencia] = useState("Todas");
  const [filtroAsistencia, setFiltroAsistencia] = useState("Todos"); // Todos | Votaron | No votaron
  const [filtroIntermedio, setFiltroIntermedio] = useState("Todos");
  const [filtroDirecto, setFiltroDirecto] = useState("Todos");
  const [filtroEmpleadoMuni, setFiltroEmpleadoMuni] = useState("Todos"); // Todos | Sí | No
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // ======================
  // Mapa – escuelas (API real) + estados demo
  // ======================
  const [escuelas, setEscuelas] = useState([]);
  useEffect(() => {
    const fetchEscuelas = () => {
      fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/dashboard/escuelas/ubicaciones")
        .then((res) => res.json())
        .then((data) => setEscuelas(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error al cargar escuelas:", err));
    };
    fetchEscuelas();
    const interval = setInterval(fetchEscuelas, 60000);
    return () => clearInterval(interval);
  }, []);

  // Estado demo determinístico
  const estadoEscuela = (e) => {
    const base = (e.id ?? 0) + (e.nombre ? e.nombre.length : 0);
    const mod = base % 10;
    if (mod < 6) return "activa";   // ~60%
    if (mod < 8) return "lenta";    // ~20%
    return "problemas";             // ~20%
  };

  // Ícono de color
  const iconFor = (estado) => {
    const color =
      estado === "activa" ? "#00B6ED" : estado === "lenta" ? "#f59e0b" : "#ef4444";
    return divIcon({
      className: "",
      html: `<span style="display:inline-block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,.3)"></span>`,
      iconSize: [14, 14],
    });
  };

  // ======================
  // Mesas – estado (demo)
  // ======================
  const MESAS_TOTAL = 800;
  const [mesas, setMesas] = useState({ abiertas: 540, cerradas: 120, sinIniciar: 140 });
  const mesasPie = useMemo(
    () => [
      { name: "Abiertas", value: mesas.abiertas },
      { name: "Cerradas", value: mesas.cerradas },
      { name: "Sin iniciar", value: mesas.sinIniciar },
    ],
    [mesas]
  );

  const kpis = useMemo(() => calcKPIs(), []);

  // Opciones para filtros desde dataset de tabla
  const opcionesIntermedio = useMemo(
    () => ["Todos", ...Array.from(new Set(MOCK_REFERIDOS.map((r) => r.resp_intermedio)))],
    []
  );
  const opcionesDirecto = useMemo(
    () => ["Todos", ...Array.from(new Set(MOCK_REFERIDOS.map((r) => r.resp_directo)))],
    []
  );

  // Dataset filtrado para tabla
  const filtrados = useMemo(() => {
    let base = MOCK_REFERIDOS;

    if (filtroReferencia !== "Todas") base = base.filter((r) => r.referencia === filtroReferencia);
    if (filtroAsistencia !== "Todos") base = base.filter((r) => (filtroAsistencia === "Votaron" ? r.asistio : !r.asistio));
    if (filtroIntermedio !== "Todos") base = base.filter((r) => r.resp_intermedio === filtroIntermedio);
    if (filtroDirecto !== "Todos") base = base.filter((r) => r.resp_directo === filtroDirecto);
    if (filtroEmpleadoMuni !== "Todos") base = base.filter((r) => (filtroEmpleadoMuni === "Sí" ? r.empleado_municipal : !r.empleado_municipal));

    if (!busqueda.trim()) return base;
    const q = busqueda.toLowerCase();
    return base.filter((r) =>
      [r.documento, r.apellido_nombre, r.nombre, r.referencia, r.resp_intermedio, r.resp_directo]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [filtroReferencia, filtroAsistencia, filtroIntermedio, filtroDirecto, filtroEmpleadoMuni, busqueda]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / limit));
  const pageData = filtrados.slice((page - 1) * limit, page * limit);

  // Datos para gráficos
  const dataStacked = useMemo(() => {
    if (filtroReferencia === "Todas") return MOCK_POR_SECRETARIA;
    return MOCK_POR_SECRETARIA.filter((r) => r.referencia === filtroReferencia);
  }, [filtroReferencia]);

  const pieData = useMemo(
    () => [
      { name: "Votaron", value: TOTAL_VOTARON },
      { name: "No votaron", value: TOTAL_NO_VOTARON },
    ],
    []
  );

  const TOP5 = useMemo(() => {
    const arr = [...DISTRIBUCION_RESPONSABLE_SECRETARIA].sort((a, b) => b.cantidad - a.cantidad);
    return arr.slice(0, 5).map((r) => ({ ...r, porcentaje: (r.cantidad / TOTAL_PERSONAS) * 100 }));
  }, []);

  // ======================
  // Render
  // ======================
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-5 py-5">
      {/* Header */}
      <div className="mb-5 rounded-xl bg-[#00B6ED] px-5 py-4 text-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">📊 CCE – Dashboard de Votación (Plantilla)</h1>
          <div className="flex items-center gap-2 text-sm opacity-90">
            <RefreshCw size={16} className="animate-spin-slow" />
            <span>Datos de ejemplo</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPI
          icon={<Users className="text-sky-500" size={20} />}
          label="Total de personas"
          value={formatNumber(kpis.total)}
          hint="Suma de registrados (votaron + no)"
        />
        <KPI
          icon={<CheckCircle2 className="text-emerald-500" size={20} />}
          label="Votaron"
          value={formatNumber(kpis.totV)}
          hint={`${kpis.tasa.toFixed(1)}% del total`}
        />
        <KPI
          icon={<XCircle className="text-rose-500" size={20} />}
          label="No votaron"
          value={formatNumber(kpis.totNV)}
          hint={`${(100 - kpis.tasa).toFixed(1)}% del total`}
        />
      </div>

      {/* Gráficos superiores */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Votaron vs No por Secretaría" subtitle="Distribución apilada por referencia">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <Filter size={16} className="text-gray-400" />
            <select
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              value={filtroReferencia}
              onChange={(e) => {
                setFiltroReferencia(e.target.value);
                setPage(1);
              }}
            >
              <option value="Todas">Todas</option>
              {SECRETARIAS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataStacked}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="referencia" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="votaron" stackId="a" name="Votaron" fill={COLORS[0]} />
                <Bar dataKey="noVotaron" stackId="a" name="No votaron" fill={COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Tasa de asistencia" subtitle="Proporción global de votantes">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? COLORS[1] : COLORS[3]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            Tasa de asistencia: <span className="font-semibold">{kpis.tasa.toFixed(1)}%</span>
          </div>
        </Card>

        <Card title="Evolución horaria" subtitle="Acumulado 08:00 → 16:00">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_EVOLUCION_HORA}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="votaron" name="Votaron (acum)" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="noVotaron" name="No votaron (restante)" stroke={COLORS[3]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Extra: estado de mesas + top responsables + mapa */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Estado de mesas" subtitle={`Totales demo (sobre ${MESAS_TOTAL})`}>
          <div className="grid grid-cols-3 gap-4">
            <KPI icon={<span />} label="Abiertas" value={formatNumber(mesas.abiertas)} />
            <KPI icon={<span />} label="Cerradas" value={formatNumber(mesas.cerradas)} />
            <KPI icon={<span />} label="Sin iniciar" value={formatNumber(mesas.sinIniciar)} />
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mesasPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#94a3b8" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top 5 responsables por cantidad" subtitle="Participación sobre el total">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP5} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, n, p) => [formatNumber(v), p.payload.nombre]} />
                <Legend />
                <Bar dataKey="cantidad" name="Personas" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Mapa Electoral - San Miguel" subtitle="Estados demo actualizados cada 60s">
          <LegendRow />
          <div className="rounded-xl overflow-hidden flex-grow min-h-[300px] sm:min-h-[400px]">
            <Map />
          </div>
        </Card>
      </div>

      {/* Tabla */}
      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800">📄 Listado completo de referidos</h3>
            <p className="text-xs text-gray-500">Demo con {formatNumber(filtrados.length)} filas</p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Secretaría */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Secretaría</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroReferencia}
                onChange={(e) => {
                  setFiltroReferencia(e.target.value);
                  setPage(1);
                }}
              >
                <option value="Todas">Todas</option>
                {SECRETARIAS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Asistencia */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Asistencia</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroAsistencia}
                onChange={(e) => {
                  setFiltroAsistencia(e.target.value);
                  setPage(1);
                }}
              >
                <option>Todos</option>
                <option>Votaron</option>
                <option>No votaron</option>
              </select>
            </div>

            {/* Resp. Intermedio */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Resp. Intermedio</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroIntermedio}
                onChange={(e) => {
                  setFiltroIntermedio(e.target.value);
                  setPage(1);
                }}
              >
                {opcionesIntermedio.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Resp. Directo */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Resp. Directo</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroDirecto}
                onChange={(e) => {
                  setFiltroDirecto(e.target.value);
                  setPage(1);
                }}
              >
                {opcionesDirecto.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Empleado municipal */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Empleado muni.</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroEmpleadoMuni}
                onChange={(e) => {
                  setFiltroEmpleadoMuni(e.target.value);
                  setPage(1);
                }}
              >
                <option>Todos</option>
                <option>Sí</option>
                <option>No</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por DNI, nombre, referencia, responsables..."
                className="w-72 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Documento</th>
                <th className="px-4 py-2">Apellido y Nombre</th>
                <th className="px-4 py-2">Responsable Superior</th>
                <th className="px-4 py-2">Referencia</th>
                <th className="px-4 py-2">Resp. Intermedio</th>
                <th className="px-4 py-2">Resp. Directo</th>
                <th className="px-4 py-2">Empleado muni.</th>
                <th className="px-4 py-2">Asistencia</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono">{r.documento}</td>
                  <td className="px-4 py-2">{r.apellido_nombre}</td>
                  <td className="px-4 py-2">{r.nombre}</td>
                  <td className="px-4 py-2">{r.referencia}</td>
                  <td className="px-4 py-2">{r.resp_intermedio}</td>
                  <td className="px-4 py-2">{r.resp_directo}</td>
                  <td className="px-4 py-2">{r.empleado_municipal ? "Sí" : "No"}</td>
                  <td className="px-4 py-2">
                    {r.asistio ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">Votó</span>
                    ) : (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">No votó</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="space-x-2">
            <button
              className="rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200 disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <button
              className="rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200 disabled:opacity-50"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {/* Notas:
        - ATTENDANCE_RATE controla cómo se parte "votaron/no".
        - Evolución horaria es acumulada.
        - Para el mapa, asegurate de tener: npm i react-leaflet leaflet  y  import 'leaflet/dist/leaflet.css'.
      */}
    </div>
  );

  // ===== Subcomponentes mapa =====
  function LegendRow() {
    const Item = ({ color, label }) => (
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
        <span className="text-gray-600">{label}</span>
      </div>
    );
    return (
      <div className="mb-3 flex flex-wrap gap-4">
        <Item color="#00B6ED" label="Activas" />
        <Item color="#f59e0b" label="Lentas" />
        <Item color="#ef4444" label="Problemas" />
      </div>
    );
  }

  function Map() {
    return (
      <MapContainer center={[-34.56, -58.7115]} zoom={12.5} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {escuelas
          .filter((e) => e.latitud != null && e.longitud != null)
          .map((e, i) => {
            const st = estadoEscuela(e);
            return (
              <Marker key={i} position={[e.latitud, e.longitud]} icon={iconFor(st)}>
                <Popup>
                  <div className="text-sm">
                    <strong>{e.nombre}</strong>
                    <div className="text-gray-600">{e.direccion}</div>
                    <div className="mt-1">
                      Estado: {st === "activa" ? "Activa" : st === "lenta" ? "Lenta" : "Problemas"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    );
  }
}

// Pequeña animación suave para el icono de "demo"
// .animate-spin-slow { animation: spin 6s linear infinite; }
// @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
