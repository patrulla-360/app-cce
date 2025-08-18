import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarLogin from "../components/NavbarLogin";
import { login } from "../firebase/auth";
import Cookies from "js-cookie";

export default function LoginPage() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const email = `${dni}@cce.com.ar`;
      const userCredential = await login(email, password);
      const user = userCredential.user;

      const idToken = await user.getIdToken();


      const res = await fetch(
  `https://apis-cce-all-main-997103170342.us-east1.run.app/api/usuario/${dni}`,
  {
    credentials: "include",   // ← necesario para que el navegador acepte los Set-Cookie cross-site
  }
);

      if (!res.ok) {
        throw new Error("Usuario no registrado en la base interna");
      }

      const data = await res.json();


      if (data.estado !== "Activo") {
        throw new Error("Usuario inhabilitado");
      }

      Cookies.set("rol", data.rol, { path: "/", sameSite: "Strict", secure: true });
      Cookies.set("dni", data.dni, { path: "/", sameSite: "Strict", secure: true });
      Cookies.set("nombre_usuario", data.nombre_usuario, { path: "/", sameSite: "Strict", secure: true });

      const rol = data.rol;
      Cookies.set("rol", rol, { path: "/", sameSite: "Strict", secure: true });
      Cookies.set("dni", data.dni, { path: "/", sameSite: "Strict", secure: true });
      Cookies.set("nombre_usuario", data.nombre_usuario, { path: "/", sameSite: "Strict", secure: true });

      if (rol === "Administrador") {
        navigate("/dashboard");
      } else if (rol === "Referente") {
        navigate("/inicio");
      } else if (rol === "Fiscal") {
        navigate("/fiscales");
      } else {
        navigate("/no-autorizado");
      }

    } catch (err) {
      console.error("❌ Error en login:", err);
      setError("Credenciales inválidas o usuario no habilitado.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <NavbarLogin />

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#00B6ED]/30 p-8 rounded-2xl shadow-lg">
          <h1 className="text-2xl font-bold text-center text-[#1E293B] mb-6">
            Ingreso al sistema
          </h1>

          {error && (
            <div className="mb-4 text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DNI
              </label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="w-full border border-gray-300 focus:border-[#00B6ED] focus:ring-[#00B6ED] p-2.5 rounded-md shadow-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 focus:border-[#00B6ED] focus:ring-[#00B6ED] p-2.5 rounded-md shadow-sm outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#00B6ED] hover:bg-[#00A0DA] text-white py-2.5 rounded-md font-semibold transition-all duration-300 shadow"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center mt-6 text-sm text-gray-600">
        ¿Necesitás asistencia?{" "}
        <a href="#" className="text-[#00B6ED] font-medium hover:underline">
          Presioná aquí y te ayudamos
        </a>
      </footer>
    </div>
  );
}
