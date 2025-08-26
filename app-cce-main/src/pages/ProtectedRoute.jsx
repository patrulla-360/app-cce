import React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => {
      setAuthed(!!user);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  if (checking) return null; // no mostrar nada hasta saber

  return authed ? children : <Navigate to="/" replace />;
}
