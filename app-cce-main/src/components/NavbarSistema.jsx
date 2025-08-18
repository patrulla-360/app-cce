import React from "react";
import logoCCE from "../assets/logo-cce.png";

export default function NavbarSistema() {
  return (
    <nav className="bg-white shadow-md px-4 py-2 flex items-center justify-between">
      {/* Logo + nombre sistema */}
      <div className="flex items-center space-x-2">
        <img src={logoCCE} alt="Logo CCE" className="h-8 sm:h-10" />
        <span className="font-semibold text-blue-800 text-sm sm:text-base hidden sm:inline">
          Centro de Control Electoral
        </span>
      </div>

      {/* Datos usuario + menú */}
      <div className="flex items-center space-x-3">
        <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline"></span>
     
      </div>
    </nav>
  );
}
