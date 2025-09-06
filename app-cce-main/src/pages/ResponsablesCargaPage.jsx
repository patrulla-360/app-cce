import React, { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";


const auth = getAuth();
const user = auth.currentUser;

export default function FiscalesPage() {
  const [nombreFiscal, setNombreFiscal] = useState("");
  const [usuarioId, setUsuarioId] = useState(null);

  const [escuelaAsignada, setEscuelaAsignada] = useState(null); // { nombre, direccion, escuela_id }
const [mesasAsignadas, setMesasAsignadas] = useState([]);     // [101,102,...]

  
  const [mesaId, setMesaId] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [verificando, setVerificando] = useState(false);
  const [resultadoVerificacion, setResultadoVerificacion] = useState(null); // "ok" | "error"
  const [verificadas, setVerificadas] = useState([]);
  const [personaSeleccionada, setPersonaSeleccionada] = useState(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [busqueda, setBusqueda] = useState("");


  // nuevo: mesas seleccionadas para filtro (vacío = todas)
const [selectedMesa, setSelectedMesa] = useState(null); // null = Todas

const selectMesa = (mesa) => {
  setSelectedMesa((prev) => (prev === mesa ? null : mesa)); // si clickeás la misma, vuelve a "Todas"
};



// helper para toggle
const toggleMesa = (mesa) => {
  setSelectedMesas((prev) =>
    prev.includes(mesa) ? prev.filter((m) => m !== mesa) : [...prev, mesa]
  );
};




  useEffect(() => {
    const obtenerDatos = async () => {
      const auth = getAuth();

      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          console.warn("⚠️ Usuario no autenticado");
          return;
        }

        try {
          const idToken = await user.getIdToken();

          // Obtener info del fiscal
          const resInicio = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app//api/responsables/inicio", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${idToken}`,
                "Content-Type": "application/json",
              },
            });
            if (!resInicio.ok) throw new Error("No se pudo obtener /responsables/inicio");




            const inicio = await resInicio.json();
            setNombreFiscal(inicio.nombreFiscal);
            setUsuarioId(inicio.usuarioId);
            setEscuelaAsignada(inicio.escuela);          // {escuela_id, nombre, direccion}
            setMesasAsignadas(inicio.mesasAsignadas);    // array de mesas



             // Obtener votantes pendientes (todas las mesas)
              const resPendientes = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app//api/responsables/votantes/pendientes", {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${idToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (!resPendientes.ok) throw new Error("No se pudieron obtener los votantes pendientes");

              const votantesJson = await resPendientes.json();  // ⬅️ respuesta cruda de la API
              const adaptados = votantesJson.map((v) => {
                const partes = v.nombre_apellido.split(" ");
                return {
                  orden: v.nro_orden,
                  dni: v.dni,
                  nombre: partes[0],
                  apellido: partes.slice(1).join(" "),
                  sexo: v.sexo,
                  mesaId: v.d_mesa_id, // ⬅️ incluir mesa
                };
              });

              setPersonas(adaptados);




















          // Obtener votantes verificados
          const resVerificados = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app//api/fiscales/votantes/verificados", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },
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
      });
    };

    obtenerDatos();
  }, []);








const filtradas = useMemo(() => {
  const q = busqueda.trim().toLowerCase();

  // 1) filtro por UNA mesa (null = todas)
  const porMesa = personas.filter(
    (p) => selectedMesa === null || p.mesaId === selectedMesa
  );

  // 2) filtro por texto
  return porMesa
    .filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.apellido.toLowerCase().includes(q) ||
        String(p.dni).includes(q) ||
        String(p.orden).includes(q) ||
        String(p.mesaId).includes(q)
    )
    // 3) orden: por mesa y nro de orden
    .sort((a, b) => (a.mesaId - b.mesaId) || (a.orden - b.orden));
}, [personas, busqueda, selectedMesa]);





  const confirmarVerificacion = async () => {
    setVerificando(true);
    setResultadoVerificacion(null);

    try {
      const response = await fetch(`https://apis-cce-all-main-997103170342.us-east1.run.app//api/fiscales/verificar/${personaSeleccionada.dni}`, {
        method: "POST",
          credentials: "include",
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
        <h1 className="text-lg font-semibold">🗳️ CCE - Responsable</h1>
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
      {/* Card: Datos del fiscal */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h2 className="text-[#00B6ED] font-bold text-lg mb-1">
          Bienvenido/a, {nombreFiscal}
        </h2>

        {/* Usuario */}
        <div className="mb-3">
          <p className="text-sm text-gray-700 mb-1">
            <strong>N° Usuario:</strong>
          </p>
          <span className="inline-flex items-center bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
            🆔 {usuarioId}
          </span>
        </div>

        {/* Escuela */}
        <div className="mb-3">
          <p className="text-sm text-gray-700 mb-1">
            <strong>Escuela Asignada:</strong>
          </p>
          {escuelaAsignada ? (
            <div className="inline-flex items-center bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
              <span className="mr-1">🏫</span>
              {escuelaAsignada.nombre} — {escuelaAsignada.direccion}
            </div>
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>

        {/* Mesas */}
        <div>
          <p className="text-sm text-gray-700 mb-1">
            <strong>Mesas Asignadas:</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {mesasAsignadas?.length ? (
              mesasAsignadas.map((mesa) => (
                <span
                  key={mesa}
                  className="bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full"
                >
                  🗳️ Mesa {mesa}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Card: Personas a verificar */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-[#1E293B] font-semibold text-lg mb-3">Personas a verificar</h3>

 
       {/* Filtro por mesa */}
          <div className="mb-3">
            <p className="text-sm text-gray-700 mb-2 font-medium">Filtro por mesa</p>
            <div className="flex flex-wrap gap-2">
              {/* Todas */}
              <button
                type="button"
                onClick={() => setSelectedMesa(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition
                  ${selectedMesa === null
                    ? "bg-sky-100 text-sky-700 border-sky-200"
                    : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                  }`}
              >
                Todas las mesas
              </button>

              {/* Chips por mesa (una sola seleccionable) */}
              {mesasAsignadas?.map((m) => {
                const active = selectedMesa === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMesa(m)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition
                      ${active
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                      }`}
                  >
                    🗳️ Mesa {m}
                  </button>
                );
              })}
            </div>
          </div>





        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, DNI, orden o mesa..."
          className="w-full mb-4 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
          onChange={(e) => setBusqueda(e.target.value)}
          value={busqueda}
        />

        {/* Lista */}
        {filtradas.length === 0 ? (
          <p className="text-gray-500 text-sm">No se encontraron personas con ese criterio.</p>
        ) : (
          <ul className="space-y-2">
            {filtradas.map((p) => (
              <li key={`${p.dni}-${p.mesaId}`} className="bg-[#F1F5F9] rounded-lg p-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-[#1E293B] font-semibold">N° Orden: {p.orden}</p>
                      <span className="inline-flex items-center bg-emerald-100 text-emerald-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                        🗳️ Mesa {p.mesaId}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {p.nombre} {p.apellido}
                    </p>
                    <p className="text-sm text-gray-500">
                      DNI: {p.dni} <span className="mx-1">•</span> Sexo: {p.sexo}
                    </p>
                  </div>

                  <button
                    onClick={() => setPersonaSeleccionada(p)}
                    className="bg-[#00B6ED] text-white px-4 py-1.5 rounded-md text-sm hover:bg-[#009AC7] w-full sm:w-auto"
                  >
                    Votó
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Card: Personas verificadas */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-[#1E293B] font-semibold text-lg mb-3">Personas verificadas</h3>
        {verificadas.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no se ha verificado a nadie.</p>
        ) : (
          <ul className="space-y-2">
            {verificadas.map((p) => (
              <li key={`${p.dni}-${p.orden}`} className="bg-[#F1F5F9] rounded-lg p-3 flex justify-between items-center">
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

      {/* Card: Ayuda */}
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
