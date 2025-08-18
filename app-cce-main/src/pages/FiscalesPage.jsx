import React, { useEffect, useState } from "react";

export default function FiscalesPage() {
  const [nombreFiscal, setNombreFiscal] = useState("");
  const [usuarioId, setUsuarioId] = useState(null);
  const [mesaId, setMesaId] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [verificando, setVerificando] = useState(false);
  const [resultadoVerificacion, setResultadoVerificacion] = useState(null); // "ok" | "error"
  const [verificadas, setVerificadas] = useState([]);
  const [personaSeleccionada, setPersonaSeleccionada] = useState(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const res = await fetch("http://localhost:4001/api/fiscales/inicio", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("No se pudo obtener la información del fiscal");

        const data = await res.json();
        setNombreFiscal(data.nombre_usuario);
        setUsuarioId(data.usuario_id);
        setMesaId(data.mesa_id);

        const resPendientes = await fetch("http://localhost:4001/api/fiscales/votantes/pendientes", {
          credentials: "include",
        });

        if (!resPendientes.ok) throw new Error("No se pudieron obtener los votantes pendientes");

        const votantes = await resPendientes.json();
        const adaptados = votantes.map((v) => {
          const partes = v.nombre_apellido.split(" ");
          return {
            orden: v.nro_orden,
            dni: v.dni,
            nombre: partes[0],
            apellido: partes.slice(1).join(" "),
            sexo: v.sexo,
          };
        });
        setPersonas(adaptados);

        const resVerificados = await fetch("http://localhost:4001/api/fiscales/votantes/verificados", {
          credentials: "include",
        });

        if (!resVerificados.ok) throw new Error("No se pudieron obtener los votantes verificados");

        const dataVerificados = await resVerificados.json();
        const adaptadosVerificados = dataVerificados.map((v) => {
          const partes = v.nombre_apellido.split(" ");
          return {
            orden: v.nro_orden,
            dni: v.dni,
            nombre: partes[0],
            apellido: partes.slice(1).join(" "),
            sexo: v.sexo,
            hora: v.hora_verificacion,
          };
        });
        setVerificadas(adaptadosVerificados);
        setCargandoInicial(false);
      } catch (err) {
        console.error("❌ Error general:", err);
      }
    };

    obtenerDatos();
  }, []);

  const filtradas = personas.filter((p) => {
    const texto = `${p.orden} ${p.dni} ${p.nombre} ${p.apellido}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  const confirmarVerificacion = async () => {
    setVerificando(true);
    setResultadoVerificacion(null);

    try {
      const response = await fetch(`http://localhost:4001/api/fiscales/verificar/${personaSeleccionada.dni}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioId }),
      });

      if (!response.ok) {
        const error = await response.json();
        setResultadoVerificacion("error");
        console.error("❌ Error al verificar:", error.detail);
        return;
      }

      const hora = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setVerificadas([...verificadas, { ...personaSeleccionada, hora }]);
      setPersonas(personas.filter((p) => p.dni !== personaSeleccionada.dni));
      setResultadoVerificacion("ok");

      setTimeout(() => {
        setPersonaSeleccionada(null);
        setResultadoVerificacion(null);
        setVerificando(false);
      }, 1500);
    } catch (err) {
      console.error("❌ Error de red:", err);
      setResultadoVerificacion("error");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="bg-[#00B6ED] text-white py-3 px-4 shadow-md sticky top-0 z-50">
        <h1 className="text-lg font-semibold">🗳️ CCE - Fiscal</h1>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {cargandoInicial ? (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-[#00B6ED] mb-3"></div>
              <p className="text-sm text-gray-600">Cargando datos del fiscal y votantes...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md p-4">
              <h2 className="text-[#00B6ED] font-bold text-lg mb-1">Bienvenida, {nombreFiscal}</h2>
              <p className="text-sm text-gray-700"><strong>N° Usuario:</strong> {usuarioId}</p>
              <p className="text-sm text-gray-700"><strong>N° Mesa:</strong> {mesaId}</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="text-[#1E293B] font-semibold text-lg mb-3">Personas a verificar</h3>
              <input
                type="text"
                placeholder="Buscar por nombre, apellido, DNI o número de orden..."
                className="w-full mb-4 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
                onChange={(e) => setBusqueda(e.target.value)}
                value={busqueda}
              />
              {filtradas.length === 0 ? (
                <p className="text-gray-500 text-sm">No se encontraron personas con ese criterio.</p>
              ) : (
                <ul className="space-y-2">
                  {filtradas.map((p) => (
                    <li key={p.dni} className="bg-[#F1F5F9] rounded-lg p-3 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                          <p className="text-sm text-[#1E293B] font-semibold">N° Orden: {p.orden}</p>
                          <p className="text-sm text-gray-700">{p.nombre} {p.apellido}</p>
                          <p className="text-sm text-gray-500">DNI: {p.dni} | Sexo: {p.sexo}</p>
                        </div>
                        <button
                          onClick={() => setPersonaSeleccionada(p)}
                          className="bg-[#00B6ED] text-white px-4 py-1.5 rounded-md text-sm hover:bg-[#009AC7] w-full sm:w-auto"
                        >
                          Verificar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="text-[#1E293B] font-semibold text-lg mb-3">Personas verificadas</h3>
              {verificadas.length === 0 ? (
                <p className="text-gray-500 text-sm">Aún no se ha verificado a nadie.</p>
              ) : (
                <ul className="space-y-2">
                  {verificadas.map((p) => (
                    <li key={p.dni} className="bg-[#F1F5F9] rounded-lg p-3 flex justify-between items-center">
                      <div className="text-sm">
                        <p className="font-medium">{p.orden}. {p.nombre} {p.apellido}</p>
                        <p className="text-xs text-gray-500">DNI: {p.dni}</p>
                      </div>
                      <p className="text-xs text-gray-600">{p.hora}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <button
                className="text-[#00B6ED] font-medium underline text-sm"
                onClick={() => alert("Ayuda solicitada")}
              >
                ¿Tenés un problema? Tocá aquí para pedir ayuda
              </button>
            </div>
          </>
        )}
      </div>

      {personaSeleccionada && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-11/12 max-w-sm shadow-lg text-center">
            <h3 className="text-lg font-semibold text-[#1E293B] mb-3">Confirmar verificación</h3>
            <p className="text-sm text-gray-700 mb-4">
              ¿Estás seguro de verificar a <strong>{personaSeleccionada.nombre} {personaSeleccionada.apellido}</strong> (DNI {personaSeleccionada.dni})?
            </p>
            <div className="flex justify-between gap-4">
              <button
                onClick={() => setPersonaSeleccionada(null)}
                className="w-1/2 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarVerificacion}
                className="w-1/2 py-2 rounded bg-[#00B6ED] text-white font-semibold hover:bg-[#009AC7]"
                disabled={verificando}
              >
                {verificando ? "Verificando..." : "Confirmar"}
              </button>
            </div>

            {resultadoVerificacion === "ok" && (
              <div className="mt-4 text-green-600 font-medium flex items-center justify-center gap-2">
                <span className="text-2xl">✅</span>
                Verificación exitosa
              </div>
            )}

            {resultadoVerificacion === "error" && (
              <div className="mt-4 text-red-600 font-medium flex items-center justify-center gap-2">
                <span className="text-2xl">❌</span>
                Hubo un error al verificar
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
