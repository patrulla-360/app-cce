import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DashboardReferidosPage() {
  const [totalReferidos, setTotalReferidos] = useState(0);
  const [porDia, setPorDia] = useState([]);
  const [distribucion, setDistribucion] = useState([]);
  const [loading, setLoading] = useState(true);

  const [referidos, setReferidos] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [totalReferidosTabla, setTotalReferidosTabla] = useState(0);

  // Carga de métricas
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resTotal = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/metricas/referidos/total");
        const dataTotal = await resTotal.json();
        setTotalReferidos(dataTotal.total);

        const resPorDia = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/metricas/referidos/por-dia");
        const dataPorDia = await resPorDia.json();
        setPorDia(dataPorDia);

        const resDistribucion = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/metricas/referidos/distribucion");
        const dataDistribucion = await resDistribucion.json();
        setDistribucion(dataDistribucion);
      } catch (error) {
        console.error("Error cargando métricas:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();

    const intervalo = setInterval(() => {
      console.log("⏰ Refrescando métricas automáticamente...");
      cargarDatos();
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalo);
  }, []);

  // Carga paginada de referidos con búsqueda
  useEffect(() => {
    const cargarReferidosPaginado = async () => {
      try {
        const res = await fetch(`https://apis-cce-all-main-997103170342.us-east1.run.app/api/referidos/paginado?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        const data = await res.json();
        setReferidos(data.data);
        setTotalReferidosTabla(data.total);
      } catch (err) {
        console.error("Error cargando tabla de referidos:", err);
      }
    };

    cargarReferidosPaginado();
  }, [page, search]);


  // ==============================
  // Transformar datos para gráfico
  // ==============================
  const datosAgrupados = () => {
    const mapa = new Map();

    porDia.forEach(({ fecha, referencia, cantidad }) => {
      const dia = fecha.toString(); // 20250829
      if (!mapa.has(dia)) mapa.set(dia, {});
      const actual = mapa.get(dia);
      actual[referencia] = (actual[referencia] || 0) + cantidad;
      mapa.set(dia, actual);
    });

    return Array.from(mapa.entries()).map(([fecha, refs]) => ({
      fecha,
      ...refs,
    }));
  };

  const colores = [
  "#00B6ED", "#4ade80", "#fbbf24", "#f87171", "#a78bfa",
  "#f472b6", "#60a5fa", "#34d399", "#facc15", "#fb7185",
  "#7dd3fc", "#a3e635", "#fcd34d", "#38bdf8", "#818cf8",
  "#e879f9", "#fdba74", "#22d3ee", "#c084fc", "#2dd4bf",
  "#bef264", "#fca5a5", "#fef08a", "#86efac", "#93c5fd",
  "#d8b4fe", "#fecdd3", "#a5f3fc", "#fde68a", "#f9a8d4"
];


  // ==============================
  // Render
  // ==============================
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans px-6 py-4">
      <div className="bg-[#00B6ED] text-white py-3 px-4 shadow-md sticky top-0 z-50 mb-4 rounded-md">
        <h1 className="text-lg font-semibold">📊 CCE - Dashboard de Referidos</h1>
      </div>

      {loading ? (
        <div className="text-center mt-20 text-gray-600">Cargando métricas...</div>
      ) : (
        <div className="space-y-10">
          {/* Card de total */}
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <h2 className="text-gray-600 text-sm">Total de personas cargadas</h2>
            <p className="text-4xl font-bold text-[#00B6ED] mt-2">{totalReferidos.toLocaleString()}</p>
          </div>

          {/* Gráfico por día */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Cargas por día y secretaría</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosAgrupados()}>
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(porDia.reduce((acc, d) => ({ ...acc, [d.referencia]: true }), {})).map((ref, i) => (
                  <Bar key={ref} dataKey={ref} stackId="a" fill={colores[i % colores.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla distribución */}
          <div className="bg-white rounded-xl shadow-md p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Distribución por responsable y secretaría</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-100">
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Referencia</th>
                  <th className="px-4 py-2">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {distribucion.map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-2">{row.nombre}</td>
                    <td className="px-4 py-2">{row.referencia}</td>
                    <td className="px-4 py-2">{row.cantidad.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>




          {/* Tabla paginada con todos los referidos */}
                <div className="bg-white rounded-xl shadow-md p-6 mt-10 w-full overflow-x-auto">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">📄 Listado completo de referidos</h2>

                {/* Barra de búsqueda */}
                <input
                    type="text"
                    placeholder="Buscar por DNI, nombre, referencia, responsables..."
                    value={search}
                    onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    }}
                    className="w-full mb-4 p-2 border border-gray-300 rounded-md text-sm"
                />

                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-2">Documento</th>
                        <th className="px-4 py-2">Apellido y Nombre</th>
                        <th className="px-4 py-2">Responsable Superior</th>
                        <th className="px-4 py-2">Referencia</th>
                        <th className="px-4 py-2">Resp. Intermedio</th>
                        <th className="px-4 py-2">Resp. Directo</th>
                        <th className="px-4 py-2">Fecha</th>
                    </tr>
                    </thead>
                    <tbody>
                    {referidos.map((r, i) => (
                        <tr key={i} className="border-b">
                        <td className="px-4 py-2">{r.documento}</td>
                        <td className="px-4 py-2">{r.apellido_nombre}</td>
                        <td className="px-4 py-2">{r.nombre}</td>
                        <td className="px-4 py-2">{r.referencia}</td>
                        <td className="px-4 py-2">{r.resp_intermedio}</td>
                        <td className="px-4 py-2">{r.resp_directo}</td>
                        <td className="px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                {/* Paginación */}
                <div className="mt-4 flex items-center justify-between text-sm">
                    <span>
                    Página {page} de {Math.ceil(totalReferidosTabla / limit)}
                    </span>
                    <div className="space-x-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                        ← Anterior
                    </button>
                    <button
                        disabled={page >= Math.ceil(totalReferidosTabla / limit)}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                        Siguiente →
                    </button>
                    </div>
                </div>
                </div>

        </div>
      )}
    </div>
  );
}
