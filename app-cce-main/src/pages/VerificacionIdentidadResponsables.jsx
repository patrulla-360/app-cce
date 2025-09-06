import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoCCE from "../assets/logo-cce.png";

const API_BASE = "http://127.0.0.1:4001"; // ajustá si corresponde

export default function RegistroPage() {
  const navigate = useNavigate();

  const [dni, setDni] = useState("");
  const [paso, setPaso] = useState(1); // 1: DNI, 2: Código, 3: Éxito
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [maskedPhone, setMaskedPhone] = useState("");
  const [code, setCode] = useState("");

  const onlyDigits = (s) => (s || "").replace(/\D/g, "");
  const validDni = /^\d{7,9}$/.test(dni);
  const validCode = /^\d{2}$/.test(code);

  // Paso 1: enviar DNI
  const handleInicio = async (e) => {
    e.preventDefault();
    setError("");

    if (!validDni) {
      setError("Ingresá un DNI válido (7 a 9 dígitos).");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${API_BASE}/api/identidad/inicio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: onlyDigits(dni) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error en verificación");

      if (!data.ok) {
        // Caso NEGATIVO (no responsable)
        setError(data.message || "No figurás como responsable de carga.");
        return;
      }

      // Caso POSITIVO
      setMaskedPhone(data.masked_phone || "");
      setPaso(2);
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Paso 2: confirmar código
  const handleConfirmar = async (e) => {
    e.preventDefault();
    setError("");

    if (!validCode) {
      setError("Código inválido (2 dígitos).");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${API_BASE}/api/identidad/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: onlyDigits(dni), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.detail || "No se pudo confirmar el código.");

      // Emitimos credenciales
      const r2 = await fetch(`${API_BASE}/api/identidad/credenciales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: onlyDigits(dni) }),
      });
      const d2 = await r2.json();
      if (!r2.ok || !d2.ok) throw new Error(d2.detail || "No se pudo emitir credenciales.");

      // ✅ Mostrar pantalla de éxito con botón Finalizar (sin redirección automática)
      setPaso(3);
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const irAlLogin = () => navigate("/"); // botón Finalizar

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col items-center justify-start py-8">
      {/* Logo */}
      <img src={logoCCE} alt="CCE Logo" className="w-24 h-24 mb-4" />

      <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full">
        <h2 className="text-xl font-bold text-[#1E293B] mb-3 text-center">¡Bienvenido!</h2>
        <p className="text-gray-700 text-sm mb-6 text-center">
          Para obtener tu usuario y contraseña, por favor ingresá tu DNI.<br/>
          Verificaremos a qué escuela correspondés y te enviaremos tus credenciales por WhatsApp.
        </p>

        {paso === 1 && (
          <form className="space-y-4" onSubmit={handleInicio}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(onlyDigits(e.target.value))}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
                placeholder="Solo números (7 a 9 dígitos)"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!validDni || cargando}
              className={`w-full px-6 py-2 rounded-md text-sm font-semibold text-white ${
                (!validDni || cargando)
                  ? "bg-[#8ED9F0] cursor-not-allowed"
                  : "bg-[#00B6ED] hover:bg-[#009AC7]"
              }`}
            >
              {cargando ? "Procesando..." : "Continuar"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {paso === 2 && (
          <form className="space-y-4" onSubmit={handleConfirmar}>
            <p className="text-sm text-gray-700">
              Te enviamos un código por WhatsApp al número <b>{maskedPhone}</b>.
              Ingresalo para continuar.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código (2 dígitos)</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value).slice(0, 2))}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B6ED]"
                placeholder="Ej: 07"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!validCode || cargando}
              className={`w-full px-6 py-2 rounded-md text-sm font-semibold text-white ${
                (!validCode || cargando)
                  ? "bg-[#8ED9F0] cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {cargando ? "Verificando..." : "Confirmar"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {paso === 3 && (
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold text-green-700">Verificación exitosa</h3>
            <p className="text-sm text-gray-700">
              Verificamos tu identidad exitosamente. Te enviamos tus credenciales por WhatsApp; recordá que
              debés acceder con tu <b>DNI</b> y la <b>contraseña</b> que te enviaremos una única vez por WhatsApp.
            </p>
            <p className="text-sm text-gray-700">
              Presioná el botón <b>Finalizar</b> para ser enviado a la pantalla de inicio de sesión.
            </p>
            <button
              type="button"
              onClick={irAlLogin}
              className="w-full px-6 py-2 rounded-md text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700"
            >
              Finalizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
