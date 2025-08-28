import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function OperadoresPage() {
  const [dni, setDni] = useState("");
  const [datosPadron, setDatosPadron] = useState(null);
  const [responsables, setResponsables] = useState([]);
  const [responsableIntermedio, setResponsableIntermedio] = useState("");
  const [responsableSuperior, setResponsableSuperior] = useState("");
  const [responsableDirecto, setResponsableDirecto] = useState("");
  const [usuarioId, setUsuarioId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Autenticación y carga de responsables
  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const token = await user.getIdToken();
      setUsuarioId(user.uid);

      try {
        const res = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/usuarios/responsables", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setResponsables(data);
      } catch (err) {
        console.error("Error al cargar responsables:", err);
      }
    });
  }, []);

      
  const handleCancelar = () => {
  setDni("");
  setDatosPadron(null);
  setResponsableSuperior("");
    setResponsableIntermedio("");   // 👈 nuevo
  setResponsableDirecto("");
  setError(null);
};


  const buscarEnPadron = async () => {
  const doc = (dni || "").replace(/\D/g, "");
  if (!doc || doc.length < 7) {
    setError("Ingresá un DNI válido");
    return;
  }

  setCargando(true);
  setError(null);
  setDatosPadron(null);

  try {
    const res = await fetch(`https://apis-cce-all-main-997103170342.us-east1.run.app/api/padron/verifica/${doc}`);

    if (!res.ok) {
      // 404 y 409 vienen con { detail: "..." }
      const err = await res.json().catch(() => ({}));
      setError(`❌ ${err.detail ?? "Error al consultar el padrón"}`);
      return;
    }

    const data = await res.json(); // { nombre, apellido, sexo, dni, cod_circ, nro_mesa, orden }
    setDatosPadron(data);
  } catch {
    setError("❌ Error de red al consultar el padrón");
  } finally {
    setCargando(false);
  }
};


const handleCargar = async () => {
  // Validaciones duras antes de llamar a la API
  if (!datosPadron) {
    setError("Primero verificá el DNI en el padrón.");
    return;
  }
   
  if (!responsableSuperior) {
    setError("Seleccioná el responsable superior.");
    return;
  }
  if (!responsableDirecto.trim()) {
    setError("Ingresá el responsable directo.");
    return;
  }

  try {
    const res = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/padron/carga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dni: datosPadron.dni,                 // el normalizado de la verificación
        resp_superior_id: Number(responsableSuperior),
        resp_intermedio: responsableIntermedio.trim(),  // 👈 nuevo en el body
        resp_directo: responsableDirecto.trim(),
        created_by: usuarioId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al cargar el referido");
      return;
    }

    const data = await res.json();
    alert(`✅ Carga OK (ID: ${data.referido_id})`);
    handleCancelar(); // limpia todo
  } catch {
    setError("❌ Error de red al cargar el referido");
  }
};








  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="bg-[#00B6ED] text-white py-3 px-4 shadow-md sticky top-0 z-50">
        <h1 className="text-lg font-semibold">👥 CCE - Carga de Referidos</h1>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">Panel de carga de referidos</h2>

          {/* Responsable Superior */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsable superior</label>
            <select
              value={responsableSuperior}
              onChange={(e) => setResponsableSuperior(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {responsables.map((r) => (
                <option key={r.usuario_id} value={r.usuario_id}>
                    {r.nombre} ({r.referencia})
                    </option>
              ))}
            </select>
          </div>



          {/* Responsable Intermedio (nuevo) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsable intermedio
            </label>
            <input
              type="text"
              placeholder="Nombre o identificador del responsable intermedio"
              value={responsableIntermedio}
              onChange={(e) => setResponsableIntermedio(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>



          {/* Responsable Directo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsable directo</label>
            <input
              type="text"
              placeholder="Nombre o identificador del responsable directo"
              value={responsableDirecto}
              onChange={(e) => setResponsableDirecto(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>

          {/* DNI del referido */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="DNI del referido"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
                    />

            <button
              onClick={buscarEnPadron}
              className="bg-[#00B6ED] text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-[#009AC7]"
              disabled={cargando}
            >
              {cargando ? "Buscando..." : "Verificar en padrón"}
            </button>
          </div>

          {/* Resultado de la verificación */}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {datosPadron && (
            <div className="mt-4 space-y-3 text-sm text-gray-800 border-t pt-4">
              <div className="text-green-700 font-medium">✅ Resultado encontrado en el padrón:</div>
              <div><strong>Nombre:</strong> {datosPadron.nombre}</div>
              <div><strong>Apellido:</strong> {datosPadron.apellido}</div>
              <div><strong>DNI:</strong> {datosPadron.dni}</div>
              <div><strong>Sexo:</strong> {datosPadron.sexo}</div>
              <div><strong>Cod. Circ:</strong> {datosPadron.cod_circ}</div>
              <div><strong>Nro. Mesa:</strong> {datosPadron.nro_mesa}</div>
              <div><strong>Orden:</strong> {datosPadron.orden}</div>

              <button
                onClick={handleCargar}
                className="mt-6 bg-green-600 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-green-700 w-full"
                disabled={!responsableSuperior || !responsableIntermedio || !responsableDirecto} // 👈 opcional: aseguremos selección
              >
                ✅ Cargar referido
              </button>
               <button
                  onClick={handleCancelar}
                  className="mt-6 bg-red-600 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-red-700 w-full"
                >
                  ❌ Cancelar
                </button>
            </div>
          )}



        </div>
      </div>
    </div>
  );
}
