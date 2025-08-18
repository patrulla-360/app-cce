// src/utils/authHeader.js
import { getAuth } from "firebase/auth";

export const authHeader = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const token = await user.getIdToken(); // ✅ JWT actualizado
  return {
    Authorization: `Bearer ${token}`,
  };
};
