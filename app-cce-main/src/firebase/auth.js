import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import app from "./config";

const auth = getAuth(app);

export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};
