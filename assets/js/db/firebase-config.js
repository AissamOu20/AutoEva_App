// ===================================
// 🔹 Fichier de Configuration Firebase
// /db/firebase-config.js
// ===================================

// 🔹 Importations de base
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

// 🔹 Importations Realtime Database (Ce que tu avais déjà)
import { 
    getDatabase, 
    ref, 
    get, 
    update,
    set,
    remove,
    push, 
    query, 
    orderByChild, 
    equalTo,
    onValue ,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// 🔹 Importations Authentication (NÉCESSAIRE pour la connexion)
import { 
    getAuth, 
    signInAnonymously, // Pour la connexion anonyme (corrige Permission Denied)
    signOut,           // Pour la déconnexion
    onAuthStateChanged // Pour checkAuth.js
    // Tu peux ajouter ici signInWithEmailAndPassword, updatePassword, etc. si tu changes de méthode
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// 🔹 Importations Storage (NÉCESSAIRE pour les avatars)
import { 
    getStorage, 
    ref as storageRef, // 'ref' est déjà pris, on le renomme 'storageRef'
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";


// 🔹 Ta Configuration Firebase (Inchangée)
const firebaseConfig = {
  apiKey: "AIzaSyAVssazudqS82vTsQPNdc7uiHVGjDdyT0k",
  authDomain: "quizapp-733d4.firebaseapp.com",
  databaseURL: "https://quizapp-733d4-default-rtdb.firebaseio.com",
  projectId: "quizapp-733d4",
  storageBucket: "quizapp-733d4.appspot.com",
  messagingSenderId: "1017686265383",
  appId: "1:1017686265383:web:f236f21352b94abfc04802"
};

// ----------------------------------------------------
// 🔹 Initialisation des Services
// ----------------------------------------------------
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);       // ⭐️ Initialise l'Authentification
const storage = getStorage(app); // ⭐️ Initialise le Storage
// ----------------------------------------------------


// ----------------------------------------------------
// 🔹 Exportations (Regroupées)
// ----------------------------------------------------
export { 
    // Services
    database, 
    auth, 
    storage,
    
    // Database Functions
    ref, 
    get, 
    set, 
    push, 
    remove, 
    update, 
    query, 
    orderByChild, 
    equalTo, 
    onValue, 
    serverTimestamp,
    
    // Auth Functions
    signInAnonymously,
    signOut,
    onAuthStateChanged,
    
    // Storage Functions
    storageRef, // Renommé
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
};
