import React from "react";
import { getAuth } from "firebase/auth";

const auth = getAuth();

const MODO_MANTENIMIENTO = true; // ← poné false para volver a la vista normal

export default function FiscalesPage() {
  if (MODO_MANTENIMIENTO) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans">
        {/* Topbar */}
        <div className="bg-[#00B6ED] text-white py-3 px-4 shadow-md sticky top-0 z-50">
          <h1 className="text-lg font-semibold">🗳️ CCE</h1>
        </div>

        {/* Contenido mantenimiento */}
        <div className="p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg max-w-xl w-full p-8 text-center">
            <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center text-6xl">
              🚧
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Sección temporalmente deshabilitada
            </h2>
            <p className="text-slate-600">
              Estamos preparando todo para el <strong>Domingo</strong>.
            </p>

            <div className="mt-6 text-xs text-slate-400">
              Gracias por tu paciencia 🙌
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
