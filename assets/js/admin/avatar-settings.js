// ===============================
// 🖼️ admin-avatars.js (Version Manuelle)
// ===============================

// 🔹 Import Firebase Database
import { database, ref, onValue, set, remove, get } from "../db/firebase-config.js";
// (Bootstrap est supposé être global pour le Toast)
// import { showAlert } from '/assets/js/alerts.js'; // Alternative si vous préférez

// 🔹 DOM Elements
const addAvatarForm = document.getElementById('addAvatarForm');
const avatarKeyInput = document.getElementById('avatarKey');
const avatarPathInput = document.getElementById('avatarPath');
const avatarGridDisplay = document.getElementById('avatarGridDisplay');
const addAvatarSubmitBtn = document.getElementById('addAvatarSubmitBtn');

// ------------------------------------
// Charger et Afficher les Avatars
// ------------------------------------
function loadAndDisplayAvatars() {
    const avatarsRef = ref(database, 'avatars');
    onValue(avatarsRef, (snapshot) => {
        if (!avatarGridDisplay) return;
        avatarGridDisplay.innerHTML = "";
        if (!snapshot.exists() || !snapshot.hasChildren()) {
            avatarGridDisplay.innerHTML = '<p class="text-center text-muted w-100">Aucun avatar.</p>'; return;
        }
        const avatarsData = snapshot.val();
        Object.entries(avatarsData).forEach(([key, path]) => { // 'path' au lieu de 'url'
            const col = document.createElement('div'); col.className = 'col';
            const itemDiv = document.createElement('div'); itemDiv.className = 'avatar-item text-center p-2 border rounded h-100 d-flex flex-column align-items-center position-relative';
            const img = document.createElement('img');
            img.src = path; // Utilise le chemin directement
            img.alt = key;
            img.style.cssText = 'width: 70px; height: 70px; object-fit: cover; border-radius: 50%; margin-bottom: 8px; border: 2px solid #f8f9fa;';
            img.onerror = () => { img.src = '/assets/img/user.png'; }; // Fallback
            const keyP = document.createElement('p'); keyP.className = 'avatar-key small text-muted mb-0 mt-auto'; keyP.textContent = key; keyP.style.wordBreak = 'break-all';
            const deleteBtn = document.createElement('button'); deleteBtn.className = 'btn btn-danger btn-sm delete-avatar-btn position-absolute top-0 end-0 m-1';
            deleteBtn.innerHTML = '<i class="bi bi-x-lg"></i>'; deleteBtn.title = `Supprimer "${key}"`;
            deleteBtn.style.cssText = 'width: 24px; height: 24px; line-height: 1; padding: 0; border-radius: 50%;';
            
            // ✅ Modifié pour utiliser un listener délégué dans init()
            deleteBtn.dataset.key = key; 
            
            itemDiv.appendChild(img); itemDiv.appendChild(keyP); itemDiv.appendChild(deleteBtn);
            col.appendChild(itemDiv); avatarGridDisplay.appendChild(col);
        });
    }, (error) => {
        console.error("Erreur Firebase (loadAvatars):", error);
        avatarGridDisplay.innerHTML = '<p class="text-center text-danger w-100">Erreur chargement.</p>';
    });
}

// ------------------------------------
// Ajouter un Avatar (Processus Manuel)
// ------------------------------------
async function addAvatar(event) {
    event.preventDefault();

    const key = avatarKeyInput.value.trim().replace(/[^a-zA-Z0-9_]/g, '_'); // Nettoyer la clé
    const path = avatarPathInput.value.trim(); // Obtenir le chemin

    // --- Validation ---
    if (!key || !path) {
        showToast("La clé et le chemin sont obligatoires.", "warning"); return;
    }
    if (!path.startsWith('/')) {
         showToast("Le chemin doit commencer par '/' (ex: /assets/avatars/image.png).", "warning"); return;
    }

    const dbRef = ref(database, `avatars/${key}`);

    // Désactiver le bouton
    if(addAvatarSubmitBtn) addAvatarSubmitBtn.disabled = true;

    try {
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
            showToast(`La clé "${key}" existe déjà.`, "danger");
            return;
        }

        await set(dbRef, path);

        showToast(`Avatar "${key}" ajouté (chemin: ${path})!`, "success");
        addAvatarForm.reset(); 

    } catch (error) {
        console.error("Erreur ajout avatar DB:", error);
        showToast("Erreur lors de l'ajout à la base de données.", "danger");
    } finally {
        // Réactiver le bouton
        if(addAvatarSubmitBtn) addAvatarSubmitBtn.disabled = false;
    }
}

// ------------------------------------
// Supprimer un Avatar (Seulement de la DB)
// ------------------------------------
async function deleteAvatar(key) {
    if (!confirm(`Supprimer l'avatar "${key}" de la liste ?\n(Le fichier image ne sera PAS supprimé du dossier /assets/avatars/)`)) {
        return;
    }

    const dbRef = ref(database, `avatars/${key}`);

    try {
        await remove(dbRef);
        showToast(`Avatar "${key}" supprimé de la liste.`, "success");
        // L'affichage se met à jour via onValue

    } catch (error) {
        console.error("Erreur suppression avatar DB:", error);
        showToast(`Erreur lors de la suppression de "${key}" de la liste.`, "danger");
    }
}

// ------------------------------------
// Simple Toast Function
// ------------------------------------
function showToast(message, type = "info") {
    // S'assurer que le conteneur existe (sinon le créer)
    let toastContainer = document.querySelector(".toast-container.position-fixed.top-0.end-0.p-3");
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
        toastContainer.style.zIndex = "1100";
        document.body.appendChild(toastContainer);
    }
    const el=document.createElement("div"); 
    el.className=`toast align-items-center text-bg-${type} border-0 show`; 
    el.role="alert"; el.ariaLive="assertive"; el.ariaAtomic="true"; 
    el.innerHTML=`<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`; 
    toastContainer.appendChild(el); 
    const t=new bootstrap.Toast(el,{delay:3000}); 
    t.show(); 
    el.addEventListener('hidden.bs.toast',()=>el.remove());
}


// ------------------------------------
// ✅ FONCTION D'INITIALISATION (Exportée)
// ------------------------------------
/**
 * Initialise la section de gestion des avatars.
 * (Appelée par dashboard.js)
 */
export function initAvatarSettings(user) {
    console.log("Initialisation du module Avatars...");

    // 1. Attacher les écouteurs d'événements
    // (On utilise .removeEventListener d'abord pour éviter les doublons)
    
    if (addAvatarForm) {
        addAvatarForm.removeEventListener('submit', addAvatar);
        addAvatarForm.addEventListener('submit', addAvatar);
    }

    // Utiliser la délégation d'événement pour les boutons de suppression
    if (avatarGridDisplay) {
        const deleteHandler = (e) => {
            const btn = e.target.closest('.delete-avatar-btn');
            if (btn && btn.dataset.key) {
                deleteAvatar(btn.dataset.key);
            }
        };
        avatarGridDisplay.removeEventListener('click', deleteHandler);
        avatarGridDisplay.addEventListener('click', deleteHandler);
    }

    // 2. Charger les données initiales
    loadAndDisplayAvatars();
}