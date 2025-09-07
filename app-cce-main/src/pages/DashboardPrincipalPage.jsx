import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";

// ======================
// Configuración API
// ======================
const API_BASE = import.meta.env.VITE_API_BASE || "https://apis-cce-all-main-997103170342.us-east1.run.app";

// ✅ Íconos simples sin dependencias externas
const Users = () => <span role="img" aria-label="users">👥</span>;
const CheckCircle2 = () => <span role="img" aria-label="ok">✅</span>;
const XCircle = () => <span role="img" aria-label="no">⛔</span>;
const Filter = (props) => <span role="img" aria-label="filter" {...props}>🧰</span>;
const Search = (props) => <span role="img" aria-label="search" {...props}>🔎</span>;
const RefreshCw = (props) => <span role="img" aria-label="refresh" {...props}>🔄</span>;

const COLORS = ["#00B6ED", "#4ade80", "#f59e0b", "#f87171", "#94a3b8"]; // celeste, verde, ámbar, rojo, gris

// util: formato de números (AR)
const formatNumber = (n) => new Intl.NumberFormat("es-AR").format(Number(n || 0));

// ======================
// Zona horaria y reloj
// ======================
const TZ = "America/Argentina/Buenos_Aires";
const TZ_LABEL = "UTC−3";
const fmtTime = (d) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);

// Reloj aislado: no re-renderiza todo el dashboard
const LiveClock = React.memo(function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span title={now.toISOString()}>🕒 {fmtTime(now)} ({TZ_LABEL})</span>;
});

// Componentes UI básicos
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

const Card = ({ title, subtitle, children, right }) => (
  <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
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
      <Item color="#22c55e" label="Rápidas" />
      <Item color="#00B6ED" label="Normales" />
      <Item color="#f59e0b" label="Lentas" />
      <Item color="#94a3b8" label="Sin datos" />
    </div>
  );
}

function iconFor(estado) {
  const palette = {
    rapida: "#22c55e",
    normal: "#00B6ED",
    lenta: "#f59e0b",
    sin_datos: "#94a3b8",
  };
  const color = palette[estado] || "#94a3b8";
  return divIcon({
    className: "",
    html: `<span style="display:inline-block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,.3)"></span>`,
    iconSize: [14, 14],
  });
}

function prettyEstado(s) {
  const map = { rapida: "Rápida", normal: "Normal", lenta: "Lenta", sin_datos: "Sin datos" };
  return map[s] ?? s ?? "Sin datos";
}

// ======================
// Helpers de red
// ======================
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Rango horario fijo 07..20 (inclusive)
const HOURS_RANGE = Array.from({ length: 14 }, (_, i) => 7 + i); // 7..20

// Arma el querystring con TODOS los filtros server-side
function buildReferidosQuery({
  page, pageSize, q,
  filtroReferencia, filtroAsistencia,
  filtroIntermedio, filtroDirecto, filtroEmpleadoMuni,
}) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (q && q.trim()) p.set("q", q.trim());
  if (filtroReferencia && filtroReferencia !== "Todas") p.set("referencia", filtroReferencia);
  if (filtroIntermedio && filtroIntermedio !== "Todos") p.set("resp_intermedio", filtroIntermedio);
  if (filtroDirecto && filtroDirecto !== "Todos") p.set("resp_directo", filtroDirecto);
  if (filtroEmpleadoMuni && filtroEmpleadoMuni !== "Todos") {
    const v = filtroEmpleadoMuni === "Sí" ? "1" : "0";
    p.set("empleado_muni", v);
  }
  if (filtroAsistencia && filtroAsistencia !== "Todos")
    p.set("asistencia", (filtroAsistencia === "Votaron").toString());  // true=votaron
  return p.toString();
}

export default function DashboardVotacionPage() {
  // ======================
  // Estados de datos (APIs reales)
  // ======================
  const [general, setGeneral] = useState({ cantidad_total: 0, cantidad_asistieron: 0, porcentaje_asistencia: 0 });
  const [porReferencia, setPorReferencia] = useState({ count: 0, items: [] });
  const [porHora, setPorHora] = useState([]);
  const [mesasEstado, setMesasEstado] = useState([]);
  const [escuelas, setEscuelas] = useState([]);
  const [topResponsables, setTopResponsables] = useState([]);

  // Tabla server-side
  const [tabla, setTabla] = useState({ page: 1, page_size: 25, total: 0, total_pages: 1, items: [] });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filtros (se envían a la API)
  const [filtroReferencia, setFiltroReferencia] = useState("Todas");
  const [filtroAsistencia, setFiltroAsistencia] = useState("Todos"); // Todos | Votaron | No votaron
  const [filtroIntermedio, setFiltroIntermedio] = useState("Todos");
  const [filtroDirecto, setFiltroDirecto] = useState("Todos");
  const [filtroEmpleadoMuni, setFiltroEmpleadoMuni] = useState("Todos"); // Todos | Sí | No

  // Estados de actualización
  const [lastFetch, setLastFetch] = useState(null);
  const [loading, setLoading] = useState(false);

  // ============ Cargas ==========
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [g, pr, ph, me, es, top] = await Promise.all([
        fetchJSON(`${API_BASE}/api/dashboard/asistencia/general`),
        fetchJSON(`${API_BASE}/api/dashboard/asistencia/por-referencia`),
        fetchJSON(`${API_BASE}/api/dashboard/asistencia/por-hora`),
        fetchJSON(`${API_BASE}/api/dashboard/mesas/por-estado`),
        fetchJSON(`${API_BASE}/api/dashboard/escuelas/ubicaciones`),
        fetchJSON(`${API_BASE}/api/metricas/referidos/distribucion`),
      ]);
      setGeneral(g || { cantidad_total: 0, cantidad_asistieron: 0, porcentaje_asistencia: 0 });
      setPorReferencia(Array.isArray(pr?.items) ? pr : { count: 0, items: [] });
      setPorHora(Array.isArray(ph) ? ph : []);
      setMesasEstado(Array.isArray(me) ? me : []);
      setEscuelas(Array.isArray(es) ? es : []);
      setTopResponsables(Array.isArray(top) ? top : []);
      setLastFetch(new Date());
    } catch (err) {
      console.error("Error al cargar datos del dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 60_000);
    return () => clearInterval(id);
  }, [loadAll]);

  // Tabla: carga con filtros -> SERVER-SIDE
  useEffect(() => {
    const loadTabla = async () => {
      try {
        const qs = buildReferidosQuery({
          page,
          pageSize,
          q,
          filtroReferencia,
          filtroAsistencia,
          filtroIntermedio,
          filtroDirecto,
          filtroEmpleadoMuni,
        });
        const data = await fetchJSON(`${API_BASE}/api/referidos/paginado?${qs}`);
        setTabla(data);
      } catch (err) {
        console.error("Error al cargar tabla de referidos:", err);
      }
    };
    loadTabla();
  }, [page, pageSize, q, filtroReferencia, filtroAsistencia, filtroIntermedio, filtroDirecto, filtroEmpleadoMuni]);

  const totalPersonas = Number(general?.cantidad_total || 0);
  const totalVotaron = Number(general?.cantidad_asistieron || 0);
  const totalNoVotaron = Math.max(0, totalPersonas - totalVotaron);
  const tasaAsistencia = totalPersonas ? (totalVotaron / totalPersonas) * 100 : 0;

  // Por referencia (para stacked bar)
  const referencias = useMemo(
    () => (Array.isArray(porReferencia?.items) ? porReferencia.items.map((i) => i.referencia) : []),
    [porReferencia]
  );
  const stackedData = useMemo(() => {
    const items = Array.isArray(porReferencia?.items) ? porReferencia.items : [];
    const base = (filtroReferencia === "Todas") ? items : items.filter((i) => i.referencia === filtroReferencia);
    return base.map((i) => ({
      referencia: i.referencia,
      cantidad: i.cantidad_total,
      votaron: i.cantidad_votaron,
      noVotaron: i.cantidad_no_votaron,
    }));
  }, [porReferencia, filtroReferencia]);

  // ===== Evolución horaria: 2 líneas (votaron acumulado vs no-votaron restante) =====
  const evolucionHora = useMemo(() => {
    const list = Array.isArray(porHora) ? porHora : [];
    const map = new Map(list.map((r) => [Number(r.hora), Number(r.asistencia || 0)]));

    const serie = HOURS_RANGE.map((h) => ({
      hora: `${String(h).padStart(2, "0")}:00`,
      asistencia: map.get(h) ?? 0,
    }));

    let acum = 0;
    const out = serie.map((p) => {
      acum += Number(p.asistencia || 0);
      const votaronAcum = acum;
      const restantes = Math.max(0, totalPersonas - votaronAcum);
      return { hora: p.hora, votaronAcum, restantes };
    });

    return out;
  }, [porHora, totalPersonas]);

  // Mesas por estado
  const mesasCount = useMemo(() => {
    const dict = { Abierta: 0, Cerrada: 0, "Sin iniciar": 0 };
    const arr = Array.isArray(mesasEstado) ? mesasEstado : [];
    for (const r of arr) {
      if (r?.estado in dict) dict[r.estado] = Number(r.cantidad_mesas || 0);
    }
    return dict;
  }, [mesasEstado]);

  const mesasPie = useMemo(() => ([
    { name: "Abiertas", value: mesasCount["Abierta"] },
    { name: "Cerradas", value: mesasCount["Cerrada"] },
    { name: "Sin iniciar", value: mesasCount["Sin iniciar"] },
  ]), [mesasCount]);

  // Top 5 responsables
  const TOP5 = useMemo(() => {
    const arr = [...topResponsables].sort((a, b) => Number(b.cantidad) - Number(a.cantidad)).slice(0, 5);
    return arr.map((r) => ({ ...r, porcentaje: totalPersonas ? (Number(r.cantidad) / totalPersonas) * 100 : 0 }));
  }, [topResponsables, totalPersonas]);

  // ====== Opciones selects (derivadas de la página actual) ======
  const opcionesIntermedio = useMemo(
    () => ["Todos", ...Array.from(new Set((Array.isArray(tabla.items) ? tabla.items : []).map((r) => r.resp_intermedio).filter(Boolean)))],
    [tabla]
  );
  const opcionesDirecto = useMemo(
    () => ["Todos", ...Array.from(new Set((Array.isArray(tabla.items) ? tabla.items : []).map((r) => r.resp_directo).filter(Boolean)))],
    [tabla]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-5 py-5">
      {/* Header con reloj, última actualización y botón actualizar */}
      <div className="mb-5 rounded-xl bg-[#00B6ED] px-5 py-4 text-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">📊 CCE – Dashboard de Votación</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm opacity-90">
            <span className="flex items-center gap-1"><RefreshCw /> Datos en vivo</span>
            <span className="hidden sm:inline">•</span>
            <LiveClock />
            <span className="hidden sm:inline">•</span>
            <span title={lastFetch ? new Date(lastFetch).toISOString() : ""}>
              ⏱️ Última actualización: {lastFetch ? fmtTime(lastFetch) : "—"}
            </span>
            <button
              onClick={loadAll}
              disabled={loading}
              className="rounded-md bg-white/10 px-3 py-1 font-medium hover:bg-white/20 disabled:opacity-50"
              title="Actualizar ahora"
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPI icon={<Users />} label="Total de personas" value={formatNumber(totalPersonas)} hint="Suma de registrados (votaron + no)" />
        <KPI icon={<CheckCircle2 />} label="Votaron" value={formatNumber(totalVotaron)} hint={`${tasaAsistencia.toFixed(1)}% del total`} />
        <KPI icon={<XCircle />} label="No votaron" value={formatNumber(totalNoVotaron)} hint={`${(100 - tasaAsistencia).toFixed(1)}% del total`} />
      </div>

      {/* Gráficos superiores */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          title="Votaron vs No por Secretaría"
          subtitle="Distribución apilada por referencia"
          right={
            <div className="flex items-center gap-2 text-sm">
              <Filter />
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroReferencia}
                onChange={(e) => { setFiltroReferencia(e.target.value); setPage(1); }}
              >
                <option value="Todas">Todas</option>
                {referencias.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          }
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="referencia" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="votaron" stackId="a" name="Votaron" fill={COLORS[1]} />
                <Bar dataKey="noVotaron" stackId="a" name="No votaron" fill={COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Tasa de asistencia" subtitle="Proporción global de votantes">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: "Votaron", value: totalVotaron }, { name: "No votaron", value: totalNoVotaron }]}
                     dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                  <Cell fill={COLORS[1]} />
                  <Cell fill={COLORS[3]} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            Tasa de asistencia: <span className="font-semibold">{tasaAsistencia.toFixed(1)}%</span>
          </div>
        </Card>

        <Card title="Evolución horaria" subtitle="Votaron (acum) vs No votaron (restante) – 07:00 → 20:00">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucionHora}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="restantes" name="No votaron (restante)" stroke={COLORS[3]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="votaronAcum" name="Votaron (acum)" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Extra: estado de mesas + top responsables + mapa */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Estado de mesas" subtitle="Totales por estado">
          <div className="grid grid-cols-3 gap-4">
            <KPI icon={<span />} label="Abiertas" value={formatNumber(mesasCount["Abierta"])} />
            <KPI icon={<span />} label="Cerradas" value={formatNumber(mesasCount["Cerrada"])} />
            <KPI icon={<span />} label="Sin iniciar" value={formatNumber(mesasCount["Sin iniciar"])} />
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
                <Tooltip formatter={(v, n, p) => [formatNumber(v), p?.payload?.nombre]} />
                <Legend />
                <Bar dataKey="cantidad" name="Personas" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Mapa Electoral - San Miguel" subtitle="Estado por avance vs promedio">
          <LegendRow />
          <div className="rounded-xl overflow-hidden min-h-[400px]">
            <CCEMap escuelas={escuelas} />
          </div>
        </Card>
      </div>

      {/* Tabla */}
      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800">📄 Listado completo de referidos</h3>
            <p className="text-xs text-gray-500">
              {`Mostrando ${formatNumber(Array.isArray(tabla.items) ? tabla.items.length : 0)} de ${formatNumber(tabla.total)} (página ${tabla.page}/${tabla.total_pages})`}
            </p>
          </div>

          {/* Filtros (van al servidor) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Secretaría */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Secretaría</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroReferencia}
                onChange={(e) => { setFiltroReferencia(e.target.value); setPage(1); }}
              >
                <option value="Todas">Todas</option>
                {Array.from(new Set((Array.isArray(tabla.items) ? tabla.items : []).map((r) => r.referencia))).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Asistencia */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Asistencia</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroAsistencia}
                onChange={(e) => { setFiltroAsistencia(e.target.value); setPage(1); }}
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
                onChange={(e) => { setFiltroIntermedio(e.target.value); setPage(1); }}
              >
                {opcionesIntermedio.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Resp. Directo */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Resp. Directo</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroDirecto}
                onChange={(e) => { setFiltroDirecto(e.target.value); setPage(1); }}
              >
                {opcionesDirecto.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Empleado municipal */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Empleado muni.</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={filtroEmpleadoMuni}
                onChange={(e) => { setFiltroEmpleadoMuni(e.target.value); setPage(1); }}
              >
                <option>Todos</option>
                <option>Sí</option>
                <option>No</option>
              </select>
            </div>

            {/* Buscador (server-side -> q) */}
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-2.5 h-4 w-4"><Search /></span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Buscar por DNI o Apellido y Nombre"
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
              {(Array.isArray(tabla.items) ? tabla.items : []).map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono">{r.documento}</td>
                  <td className="px-4 py-2">{r.apellido_nombre}</td>
                  <td className="px-4 py-2">{r.responsable_superior ?? ""}</td>
                  <td className="px-4 py-2">{r.referencia}</td>
                  <td className="px-4 py-2">{r.resp_intermedio ?? ""}</td>
                  <td className="px-4 py-2">{r.resp_directo ?? ""}</td>
                  <td className="px-4 py-2">{r.empleado_muni ? "Sí" : "No"}</td>
                  <td className="px-4 py-2">
                    {r.asistencia ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">Votó</span>
                    ) : (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">No votó</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{r.fecha ? new Date(r.fecha).toLocaleString("es-AR", { timeZone: TZ }) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {tabla.page} de {tabla.total_pages}
          </span>
          <div className="space-x-2">
            <button
              className="rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200 disabled:opacity-50"
              disabled={tabla.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <button
              className="rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200 disabled:opacity-50"
              disabled={tabla.page >= tabla.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === MAPA (renombrado para evitar confusión con Map nativo) ===
function CCEMap({ escuelas = [] }) {
  const safeEscuelas = Array.isArray(escuelas) ? escuelas : [];
  return (
    <MapContainer className="h-[400px] w-full" center={[-34.56, -58.7115]} zoom={12.5} style={{ height: "400px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {safeEscuelas
        .filter((e) => e && e.latitud != null && e.longitud != null)
        .map((e, i) => {
          const faltan = (e?.cantidad_faltan ?? Math.max((e?.cantidad_votantes_total || 0) - (e?.cantidad_votaron || 0), 0));
          const tasaPct = Number(e?.tasa_pct ?? 0).toFixed(1);
          return (
            <Marker key={i} position={[e.latitud, e.longitud]} icon={iconFor(e.estado)}>
              <Popup>
                <div className="text-sm">
                  <strong>{e.nombre}</strong>
                  <div className="text-gray-600">{e.direccion}</div>
                  <div className="mt-1">Estado: <b>{prettyEstado(e.estado)}</b></div>
                  <div className="mt-1">
                    Votaron: <b>{formatNumber(e.cantidad_votaron)}</b> / {formatNumber(e.cantidad_votantes_total)} ({tasaPct}%)
                  </div>
                  <div className="mt-1">
                    Faltan: <b>{formatNumber(faltan)}</b>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
