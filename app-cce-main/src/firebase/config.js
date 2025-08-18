import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAlEcaDKF5uNXOqaimqfm0ecA4rCvuiavY",
  authDomain: "comando-control-electoral.firebaseapp.com",
  projectId: "comando-control-electoral",
  storageBucket: "comando-control-electoral.firebasestorage.app",
  messagingSenderId: "924194852701",
  appId: "1:924194852701:web:48b04e992ca3cc501762b4"
};

const app = initializeApp(firebaseConfig);
export default app;
