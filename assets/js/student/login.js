// ===============================
// 🔹 student/login.js
// ===============================

// ✅ AJOUT : 'update', 'query', 'orderByChild', 'equalTo' pour une recherche efficace
import { ref, get, child, update, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// ⭐️ Imports Auth depuis la config ⭐️
// ✅ MODIFIÉ : Le chemin remonte de 3 niveaux (student -> js -> assets -> racine) pour trouver /db/
// ✅ AJOUT : Fonctions de persistance de session
import { database, auth, signInAnonymously, signOut, setPersistence, browserSessionPersistence, browserLocalPersistence } from "../db/firebase-config.js";
// ✅ MODIFIÉ : Le chemin remonte de 1 niveau (student -> js) pour trouver alerts.js
import { showAlert } from "../alerts.js";

// DOM
const form = document.getElementById("loginForm");
const loginBtn = form.querySelector("button[type='submit']");
// ⭐️ AJOUT: Récupération de la case à cocher
const rememberMeCheckbox = document.getElementById("rememberMe");

// ===================== Loader Overlay (Inchangé) =====================
const overlayLoader = document.createElement("div");
overlayLoader.id = "overlayLoader";
overlayLoader.style.cssText = "display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); z-index: 9999; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.3s ease;";
const spinner = document.createElement("div");
spinner.style.cssText = "width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.2); border-top-color: #3498db; border-radius: 50%; animation: spin 1s linear infinite;";
overlayLoader.appendChild(spinner);
document.body.appendChild(overlayLoader);
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

function showOverlayLoader() {
  overlayLoader.style.display = "flex";
  requestAnimationFrame(() => { overlayLoader.style.opacity = "1"; });
  document.body.style.pointerEvents = "none";
}
function hideOverlayLoader() {
  overlayLoader.style.opacity = "0";
  overlayLoader.addEventListener("transitionend", () => {
      overlayLoader.style.display = "none";
      document.body.style.pointerEvents = "auto";
    }, { once: true });
}

// ===================== Load bcrypt (Inchangé) =====================
async function loadBcrypt() {
  // 1. Vérifie s'il est déjà chargé
  if (window.dcodeIO && window.dcodeIO.bcrypt) {
    console.log("bcrypt already loaded.");
    return window.dcodeIO.bcrypt;
  }

  return new Promise((resolve, reject) => {
    // 2. Vérifie si la balise <script> est déjà là
    let script = document.querySelector('script[src*="bcrypt.min.js"]');
    if (script && !window.dcodeIO?.bcrypt) {
        console.log("bcrypt script tag found, waiting for it to load...");
        const timeout = setTimeout(() => {
            clearInterval(interval);
            reject(new Error("Timeout: bcrypt n'a pas pu être chargé."));
        }, 5000); // 5 sec timeout
        
        const interval = setInterval(() => {
            if (window.dcodeIO && window.dcodeIO.bcrypt) {
                clearInterval(interval);
                clearTimeout(timeout);
                console.log("bcrypt loaded after waiting.");
                resolve(window.dcodeIO.bcrypt);
            }
        }, 100);
        return;
    } 
    // 3. Si la balise <script> n'existe pas, on la crée
    else if (!script) {
        console.log("Creating and loading bcrypt script...");
        script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";
        script.async = true;
        script.onload = () => {
            if (window.dcodeIO && window.dcodeIO.bcrypt) {
                console.log("bcrypt loaded successfully after creating script.");
                resolve(window.dcodeIO.bcrypt);
            } else {
                reject(new Error("bcrypt script loaded but lib not found (window.dcodeIO.bcrypt)."));
            }
        };
        script.onerror = (e) => reject(new Error("Failed to load bcryptjs script: " + (e.message || 'Unknown error')));
        document.head.appendChild(script);
    }
    // 4. Cas où il était déjà chargé entre-temps
    else if (script && window.dcodeIO?.bcrypt) {
         console.log("bcrypt was already loaded (race condition check).");
         resolve(window.dcodeIO.bcrypt);
    }
  });
}

// ===================== Login (✅ MODIFIÉ AVEC LES DEUX LOGIQUES) =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showAlert("Veuillez remplir tous les champs.", "warning");
    return;
  }

  showOverlayLoader();
  loginBtn.disabled = true;
  loginBtn.innerText = "Vérification...";

  let bcrypt;
  let tempAuthUser = null;

  try {
    // --- 1. Load bcrypt ---
    bcrypt = await loadBcrypt();
    if (!bcrypt) {
        throw new Error("Module de hachage (bcrypt) n'a pas pu être chargé. Veuillez réessayer.");
    }

    // ======================================================
    // ⭐️ LOGIQUE 1: Définir la persistance de la session
    // ======================================================
    const persistenceType = rememberMeCheckbox.checked 
        ? browserLocalPersistence  // "Se souvenir de moi" (persiste après fermeture)
        : browserSessionPersistence; // "Session" (se termine à la fermeture)
    
    // Applique la règle de persistance AVANT de se connecter
    await setPersistence(auth, persistenceType);
    console.log(`Persistance de la session réglée sur : ${rememberMeCheckbox.checked ? 'local' : 'session'}`);

    // --- 3. Sign in anonymously first ---
    console.log("Attempting anonymous sign-in...");
    const userCredential = await signInAnonymously(auth);
    tempAuthUser = userCredential.user;
    console.log("Anonymous sign-in successful, UID:", tempAuthUser.uid);

    // --- 4. ✅ AMÉLIORATION : Query la DB au lieu de tout télécharger ---
    console.log("Querying user database for:", username);
    const usersRef = ref(database, "users");
    // Crée une requête pour trouver l'utilisateur par 'username'
    const userQuery = query(usersRef, orderByChild("username"), equalTo(username));
    
    const snapshot = await get(userQuery);

    if (!snapshot.exists()) {
      // Note : Gardez le message d'erreur vague pour des raisons de sécurité
      throw new Error("Nom d'utilisateur ou mot de passe incorrect.");
    }

    let foundUser = null;
    let userId = null; // L'ID Firebase (clé) de l'utilisateur

    // Itère sur le résultat (normalement 1 seul)
    snapshot.forEach((childSnapshot) => {
        userId = childSnapshot.key;
        foundUser = childSnapshot.val();
    });
    
    if (!foundUser || !userId) {
       // Ne devrait pas arriver si snapshot.exists() est vrai, mais par sécurité
       throw new Error("Nom d'utilisateur ou mot de passe incorrect.");
    }

    // --- 5. Find user and compare password ---
    console.log("Username match found. Comparing password...");
    if (!foundUser.password) {
       console.warn("User found but has no password hash:", foundUser.username);
       throw new Error("Ce compte n'est pas configuré pour la connexion.");
    }
    
    const match = await bcrypt.compare(password, foundUser.password); 

    if (!match) {
        console.log("Password mismatch for:", foundUser.username);
        throw new Error("Nom d'utilisateur ou mot de passe incorrect.");
    }
    
    // --- 6. Handle result (MOT DE PASSE CORRECT) ---
    console.log("Password match! User ID:", userId);
    
    // ======================================================
    // ⭐️ LOGIQUE 2: Mettre à jour "isActive" (Selon votre demande)
    // ======================================================
    try {
        const userRefToUpdate = ref(database, `users/${userId}`);
        await update(userRefToUpdate, { isActive: true }); 
        console.log("Statut utilisateur mis à jour : 'active'.");
    } catch (updateErr) {
        console.warn("Échec de la mise à jour du statut 'isActive'", updateErr);
        // On continue quand même, la connexion est prioritaire
    }
    // ======================================================

    // --- 7. LOGIN SUCCESS ---
    foundUser.id = userId; // Ajoute l'ID Firebase à l'objet utilisateur
    
    // ⭐️ AJOUT: Met à jour l'objet local avant de le sauvegarder
    // pour que localStorage reflète le statut "isActive: true"
    foundUser.isActive = true; 
    
    localStorage.setItem("currentUser", JSON.stringify(foundUser));
    showAlert(`Connexion réussie : ${foundUser.username}`, "success");

    switch (foundUser.role) {
      case "admin":
        // ✅ MODIFIÉ : Chemin relatif depuis /student/login.html
        window.location.href = "../admin/dashboard.html";
        break;
      case "student":
        // ✅ MODIFIÉ : Chemin relatif depuis /student/login.html
        window.location.href = "dashboard.html"; // ou all-quiz.html
        break;
      default:
        // Si le rôle n'est pas géré, déconnectez l'utilisateur anonyme
        if (tempAuthUser) await signOut(auth);
        showAlert("Rôle utilisateur inconnu ! Connexion annulée.", "danger");
    }

  } catch (err) {
    console.error("Erreur login :", err);
    // Affiche l'erreur (ex: "Nom d'utilisateur ou mdp incorrect")
    showAlert(err.message || "Erreur lors de la connexion.", "danger");
    // Déconnecte l'utilisateur anonyme si une erreur survient
    if (tempAuthUser) {
      try { await signOut(auth); console.log("Signed out anonymous user due to error."); }
      catch (signOutErr) { console.error("Error signing out anonymous user:", signOutErr); }
    }
  } finally {
    hideOverlayLoader();
    loginBtn.disabled = false;
    loginBtn.innerText = "Se connecter";
  }
});
