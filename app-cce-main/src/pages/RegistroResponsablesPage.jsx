import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegistroPage() {
  const navigate = useNavigate();

  // Campos
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [pais, setPais] = useState("54");
  const [area, setArea] = useState("11");
  const [numero, setNumero] = useState("");

  // UI general
  const [cargando, setCargando] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [error, setError] = useState("");

  // Verificación
  const [verificacionIniciada, setVerificacionIniciada] = useState(false);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [cargandoCodigo, setCargandoCodigo] = useState(false);
  const [okMsgCodigo, setOkMsgCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);

  // Countdown (2 minutos = 120s)
  const DURACION_SEG = 120;
  const [segRestantes, setSegRestantes] = useState(DURACION_SEG);

  // Helpers
  const onlyDigits = (s) => (s || "").replace(/\D/g, "");

  // UI (sin el 9, solo para mostrar)
  const prettyPhone = useMemo(() => {
    const p = onlyDigits(pais);
    const a = onlyDigits(area);
    const n = onlyDigits(numero);
    if (!p || !a || n.length < 1) return "";
    const fmt = n.length === 8 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
    return `+${p} ${a} ${fmt}`;
  }, [pais, area, numero]);

  // E.164 solo visual si querés mostrar JID (sin 9)
  const e164 = useMemo(() => {
    const p = onlyDigits(pais);
    const a = onlyDigits(area);
    const n = onlyDigits(numero);
    if (!p || !a || !n) return "";
    return `${p}${a}${n}`;
  }, [pais, area, numero]);

  const jid = useMemo(() => (e164 ? `${e164}@c.us` : ""), [e164]);

  // Para API: con “9” entre país y área
  const buildE164Con9 = () => {
    const p = onlyDigits(pais);
    const a = onlyDigits(area);
    const n = onlyDigits(numero);
    if (!p || !a || !n) return "";
    return `${p}9${a}${n}`;
  };

  // Validaciones
  const validNombre = nombre.trim().length >= 2;
  const validApellido = apellido.trim().length >= 2;
  const validDni = /^\d{7,9}$/.test(dni);
  const validPais = /^\d{1,3}$/.test(pais);
  const validArea = /^\d{2,4}$/.test(area);
  const validNumero = /^\d{8}$/.test(numero);
  const telOk = validPais && validArea && validNumero;
  const formOk = validNombre && validApellido && validDni && telOk;

  // mm:ss para el contador
  const mm = String(Math.floor(segRestantes / 60)).padStart(2, "0");
  const ss = String(segRestantes % 60).padStart(2, "0");
  const tiempoExpirado = verificacionIniciada && segRestantes <= 0;

  // Timer
  useEffect(() => {
    if (!verificacionIniciada) return;
    if (segRestantes <= 0) return;
    const t = setInterval(() => setSegRestantes((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [verificacionIniciada, segRestantes]);

  // Iniciar verificación
  const handleVerificarNumero = async () => {
    if (verificacionIniciada) return;
    setErrorCodigo(""); setOkMsgCodigo("");

    if (!validNombre || !validApellido || !validDni || !telOk) {
      setErrorCodigo("Completá nombre, apellido, DNI y un teléfono válido.");
      return;
    }

    setEnviandoCodigo(true);
    try {
      const res = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/registro/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          dni: onlyDigits(dni),
          phone_e164: buildE164Con9(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "No se pudo iniciar la verificación");
      }

      const data = await res.json();
      if (!data.ok) throw new Error("El envío del código no fue confirmado por el bot.");

      setVerificacionIniciada(true);
      setSegRestantes(DURACION_SEG);
      setOkMsgCodigo("✅ Código enviado por WhatsApp.");
    } catch (err) {
      setErrorCodigo(`❌ ${err.message}`);
    } finally {
      setEnviandoCodigo(false);
    }
  };

  // Confirmar código
  const handleConfirmarCodigo = async () => {
    setErrorCodigo(""); setOkMsgCodigo("");
    if (tiempoExpirado) {
      setErrorCodigo("El código expiró. Reiniciá el proceso.");
      return;
    }
    if (!codigo.trim()) {
      setErrorCodigo("Ingresá el código que te enviamos por WhatsApp.");
      return;
    }
    setCargandoCodigo(true);
    try {
      const res = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/registro/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: onlyDigits(dni),
          phone_e164: buildE164Con9(),
          code: codigo.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "No se pudo confirmar el código");
      }
      // ✅ marcado verificado: oculto sección de código y contador
      setCodigoConfirmado(true);
      setVerificacionIniciada(false);
      setOkMsgCodigo("✅ Número verificado.");
    } catch (err) {
      setErrorCodigo(`❌ ${err.message}`);
    } finally {
      setCargandoCodigo(false);
    }
  };

  // Finalizar registro → pega a /api/registro/responsables/exitoso y redirige
  const handleFinalizarRegistro = async (e) => {
    e.preventDefault();
    setError(""); setOkMsg("");

    if (!formOk || !codigoConfirmado) {
      setError("Revisá los datos y confirmá tu número antes de finalizar.");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch("https://apis-cce-all-main-997103170342.us-east1.run.app/api/registro/responsables/exitoso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: onlyDigits(dni),
          phone_e164: buildE164Con9(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "No se pudo finalizar el registro");
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error("La API no devolvió ok=true");
      }

      // Todo OK → redirigir a /responsables
      navigate("/");
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* Header */}
      <div className="bg-[#00B6ED] text-white py-3 px-4 shadow-md sticky top-0 z-50">
        <h1 className="text-lg font-semibold">📝 CCE – Registro</h1>
      </div>

      {/* Card */}
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">¡Bienvenido! Registrate</h2>

          <form className="space-y-5" onSubmit={handleFinalizarRegistro}>
            {/* Nombre / Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
                  placeholder="Apellido"
                />
              </div>
            </div>

            {/* DNI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(onlyDigits(e.target.value))}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
                placeholder="Solo números (7 a 9 dígitos)"
              />
            </div>

            {/* Teléfono (fila única) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono (con país y área)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-sm">+</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pais}
                    onChange={(e) => setPais(onlyDigits(e.target.value))}
                    className="w-16 border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="54"
                  />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={area}
                  onChange={(e) => setArea(onlyDigits(e.target.value))}
                  className="w-20 border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="11"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={numero}
                  onChange={(e) => setNumero(onlyDigits(e.target.value).slice(0, 8))}
                  className="flex-1 min-w-0 border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="8 dígitos"
                />
              </div>

              {/* Botón Verificar número */}
              {!verificacionIniciada && !codigoConfirmado && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleVerificarNumero}
                    disabled={!telOk || enviandoCodigo || !validNombre || !validApellido || !validDni}
                    className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-semibold text-white ${
                      (!telOk || enviandoCodigo || !validNombre || !validApellido || !validDni)
                        ? "bg-[#8ED9F0] cursor-not-allowed"
                        : "bg-[#00B6ED] hover:bg-[#009AC7]"
                    }`}
                  >
                    {enviandoCodigo ? "Enviando código..." : "Verificar número"}
                  </button>
                </div>
              )}

              {/* Badge cuando ya está verificado */}
              {codigoConfirmado && (
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    ✔ Número verificado
                  </span>
                </div>
              )}
            </div>

            {/* Contador (solo mientras espera código) */}
            {verificacionIniciada && !codigoConfirmado && (
              <div className="flex justify-center">
                <div className="mt-2 mb-1 flex items-center gap-2 text-[#00B6ED] font-semibold">
                  <span role="img" aria-label="reloj">⏱</span>
                  <span className="font-mono text-xl sm:text-2xl">{mm}:{ss}</span>
                </div>
              </div>
            )}

            {/* Código (se oculta al confirmar) */}
            {verificacionIniciada && !codigoConfirmado && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-700 text-center sm:text-left">
                  Ingresá el código enviado por WhatsApp a {prettyPhone}.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.trim())}
                    className="w-full sm:w-40 border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="Código"
                    disabled={tiempoExpirado}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmarCodigo}
                    disabled={!codigo || cargandoCodigo || tiempoExpirado}
                    className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-semibold text-white ${
                      !codigo || cargandoCodigo || tiempoExpirado
                        ? "bg-[#8ED9F0] cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {cargandoCodigo ? "Confirmando..." : "Confirmar código"}
                  </button>
                </div>
              </div>
            )}

            {/* Finalizar registro (violeta) */}
            {codigoConfirmado && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!formOk || cargando}
                  className={`w-full px-6 py-2 rounded-md text-sm font-semibold text-white ${
                    !formOk || cargando
                      ? "bg-purple-300 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  {cargando ? "Enviando..." : "Finalizar registro"}
                </button>
              </div>
            )}

            {/* Mensajes */}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {okMsg && <p className="text-sm text-green-700">{okMsg}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
