// Configuración de Firebase — proyecto uem-arutam
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqcA4adwXG1NKSw-NQBekyaASIDJUl-FY",
  authDomain: "uem-arutam.firebaseapp.com",
  projectId: "uem-arutam",
  storageBucket: "uem-arutam.firebasestorage.app",
  messagingSenderId: "135050587157",
  appId: "1:135050587157:web:25ea3c4492258ad788721c",
  measurementId: "G-8VP25TZPH1"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
