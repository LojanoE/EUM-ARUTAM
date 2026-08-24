// Configuración de Firebase — proyecto uem-arutam
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
// Caché persistente en IndexedDB: las lecturas hechas con internet quedan
// disponibles sin conexión (la impresión de reportes funciona offline).
// El manejador multi-pestaña permite tener app.html e imprimir.html abiertos
// a la vez. Las escrituras siguen yendo al servidor.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
