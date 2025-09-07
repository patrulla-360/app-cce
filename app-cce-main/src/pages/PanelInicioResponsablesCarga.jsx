import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const PANEL_ROUTE = "/responsables/votantes";
const TARGET_ISO = "2025-09-07T07:00:00-03:00";

// === Config de API ===
const API_BASE = "https://apis-cce-all-main-997103170342.us-east1.run.app";

// Une base + path
const api = (path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${p}`;
  console.debug("[API] URL:", url);
  return url;
};

// Helper GET con token
async function apiGet(path, idToken) {
  const url = api(path);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      "X-Requested-With": "fetch",
    },
  });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const isJSON = ct.includes("application/json");
  const body = isJSON ? await res.json().catch(() => null) : await res.text().catch(() => "");
  console.debug(`[API] GET ${url} -> ${res.status} (${ct || "no-ct"})`);
  if (!res.ok) {
    const brief = isJSON ? JSON.stringify(body) : (body || "").slice(0, 200);
    throw new Error(`HTTP ${res.status} en ${url}: ${brief}`);
  }
  return body;
}

// Helper para formatear el rango
function formatRangoMesas(desde, hasta) {
  if (desde == null && hasta == null) return "";
  if (desde != null && hasta == null) return `${desde}`;
  if (desde == null && hasta != null) return `${hasta}`;
  if (Number(desde) === Number(hasta)) return `${desde}`; // mismo número
  return `${desde}–${hasta}`;
}

export default function InicioResponsablePage() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [nombreFiscal, setNombreFiscal] = useState("");
  const [usuarioId, setUsuarioId] = useState(null);

  const [escuelaAsignada, setEscuelaAsignada] = useState(null);
  const [nombreResponsable, setNombreResponsable] = useState("");

  const [msLeft, setMsLeft] = useState(() =>
    Math.max(0, new Date(TARGET_ISO).getTime() - Date.now())
  );

  // Auth + carga inicial
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("⚠️ No hay usuario autenticado");
        setCargando(false);
        return;
      }
      try {
        const idToken = await user.getIdToken(true);

        // 1) Datos base (nombre / usuarioId)
        try {
          const inicio = await apiGet("/api/responsables/inicio", idToken);
          setNombreFiscal(inicio?.nombreFiscal ?? "");
          setUsuarioId(inicio?.usuarioId ?? null);
        } catch (e) {
          console.error("Error obteniendo /api/responsables/inicio:", e);
        }

        // 2) Escuela asignada + datos del responsable (nombre_apellido, rango mesas)
        try {
          const esc = await apiGet("/api/responsables/inicio/escuela", idToken);

          // ⬇️ Normalizamos para asegurarnos que existan los campos con nombre consistente
          const escuelaNorm = {
            nombre: esc?.nombre ?? "",
            direccion: esc?.direccion ?? "",
            nombre_apellido: esc?.nombre_apellido ?? "",
            mesas_desde:
              esc?.mesas_desde != null
                ? Number(esc.mesas_desde)
                : esc?.mesasDesde != null
                ? Number(esc.mesasDesde)
                : null,
            mesas_hasta:
              esc?.mesas_hasta != null
                ? Number(esc.mesas_hasta)
                : esc?.mesasHasta != null
                ? Number(esc.mesasHasta)
                : null,
          };

          console.debug("Escuela asignada (normalizada):", escuelaNorm);
          setEscuelaAsignada(escuelaNorm);
          setNombreResponsable(escuelaNorm.nombre_apellido || "");
        } catch (e) {
          console.warn("Escuela no disponible:", e.message);
          setEscuelaAsignada(null);
        }
      } catch (e) {
        console.error("❌ Error en inicio:", e);
      } finally {
        setCargando(false);
      }
    });
    return () => unsub();
  }, []);

  // Countdown
  useEffect(() => {
    const target = new Date(TARGET_ISO).getTime();
    const tick = () => setMsLeft(Math.max(0, target - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const { days, hours, minutes, seconds } = useMemo(() => {
    let ms = Math.max(0, msLeft);
    const d = Math.floor(ms / 86400000); ms -= d * 86400000;
    const h = Math.floor(ms / 3600000);  ms -= h * 3600000;
    const m = Math.floor(ms / 60000);    ms -= m * 60000;
    const s = Math.floor(ms / 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return { days: String(d), hours: pad(h), minutes: pad(m), seconds: pad(s) };
  }, [msLeft]);

  const habilitado = msLeft === 0;

  // Nombre a mostrar en el saludo (prioriza el de /inicio; si no, el de responsable)
  const displayName = nombreFiscal || nombreResponsable;

  const rangoMesasText = formatRangoMesas(
    escuelaAsignada?.mesas_desde,
    escuelaAsignada?.mesas_hasta
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="bg-[#00B6ED] text-white py-3 px-4 shadow-md sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">🗳️ CCE - Responsable</h1>
          {usuarioId && (
            <span className="text-xs bg-white/15 px-3 py-1 rounded-full">
              ID: {usuarioId}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {cargando ? (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-[#00B6ED] mb-3"></div>
              <p className="text-sm text-gray-600">Cargando información…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Bienvenida + Escuela */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="text-2xl font-extrabold text-[#0F172A] mb-1 flex items-center gap-2">
                <span aria-hidden="true" className="text-3xl leading-none">👋</span>
                <span>
                    Bienvenido/a
                </span>
                </h2>


              {/* Nombre completo del responsable debajo (si viene del backend) */}
              {nombreResponsable && (
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">{nombreResponsable}</span>
                </p>
              )}

              <p className="text-sm text-gray-700 mb-1 font-medium">
                Recordá que tu escuela asignada es:
              </p>
              {escuelaAsignada ? (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="inline-flex items-center bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                      🏫 {escuelaAsignada.nombre}
                    </span>
                    {escuelaAsignada.direccion && (
                      <span className="text-sm text-gray-600">
                        — {escuelaAsignada.direccion}
                      </span>
                    )}
                  </div>

                  {/* Rango de mesas (chip verde) */}
                  {rangoMesasText && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center bg-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
                        🗳️ Mesas asignadas: {rangoMesasText}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-500">No se encontró escuela asignada.</span>
              )}

              <p className="text-sm text-gray-600 mt-3">
                Si esta no es tu escuela asignada, por favor comunicate con tus organizadores y enviales una captura de pantalla para que puedan realizar la modificación correspondiente.
              </p>
            </div>

            {/* Acceso + Countdown */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="text-[#1E293B] font-semibold text-lg mb-2">
                Acceso al panel de verificación “Mano a Mano”
              </h3>

              {!habilitado ? (
                <>
                  <p className="text-sm text-gray-700">Podrás ingresar en:</p>
                  <div className="mt-4 grid grid-cols-4 gap-3 max-w-md">
                    <TimeBox label="Días" value={days} />
                    <TimeBox label="Horas" value={hours} />
                    <TimeBox label="Min" value={minutes} />
                    <TimeBox label="Seg" value={seconds} />
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Objetivo: Domingo a las 07:00 de la mañana
                  </p>
                </>
              ) : (
                <div className="mt-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2">
                  <span>✅</span> ¡Disponible ahora!
                </div>
              )}

              <button
                onClick={() => navigate(PANEL_ROUTE)}
                disabled={!habilitado}
                className={`mt-5 w/full sm:w-auto px-5 py-2 rounded-md text-white font-semibold transition
                  ${habilitado ? "bg-[#00B6ED] hover:bg-[#009AC7]" : "bg-gray-300 cursor-not-allowed"}`}
                title={habilitado ? "Ingresar al panel" : "Se habilitará cuando llegue la hora"}
              >
                Ingresar al panel de votos
              </button>
            </div>

            {/* Footer ayuda */}
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
    </div>
  );
}

function TimeBox({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] bg-slate-100 rounded-xl py-3">
        {value}
      </div>
      <div className="mt-1 text-[11px] tracking-wide text-gray-600 uppercase">{label}</div>
    </div>
  );
}
