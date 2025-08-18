import React from "react";
import logoCCE from "../assets/logo-cce.png";

export default function Navbar() {
  return (
    <nav className="bg-white shadow px-4 py-3 flex items-center justify-center">
      <img src={logoCCE} alt="Logo CCE" className="h-16" /> {/* Aumentamos de h-10 a h-16 */}
    </nav>

    
  );
}
