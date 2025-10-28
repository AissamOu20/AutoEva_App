// =================================
// IMPORTS
// =================================
import { 
    database, 
    ref, 
    push, 
    set, 
    query, 
    orderByChild, 
    equalTo, 
    get, 
    remove 
} from '../db/firebase-config.js';
import { showAlert } from '../alerts.js';

// =================================
// SÉLECTEURS DOM ET VARIABLES
// =================================
const adminListBody = document.getElementById('adminListBody');
const addAdminModalEl = document.getElementById('addAdminModal');
const addAdminForm = document.getElementById('addAdminForm');

let addAdminModal; // Instance du Modal Bootstrap
if (addAdminModalEl) {
    addAdminModal = new bootstrap.Modal(addAdminModalEl);
}

let bcrypt; // Stocke l'instance de bcrypt une fois chargée
let currentUserId = null; // Stocke l'ID de l'admin connecté

// =================================
// FONCTION DE HACHAGE (BCRYPT)
// =================================
async function loadBcrypt() {
  if (window.dcodeIO && window.dcodeIO.bcrypt) {
    return window.dcodeIO.bcrypt;
  }
  return new Promise((resolve, reject) => {
    let script = document.querySelector('script[src*="bcrypt.min.js"]');
    if (script && !window.dcodeIO?.bcrypt) {
        const timeout = setTimeout(() => {
            clearInterval(interval);
            reject(new Error("Timeout: bcrypt n'a pas pu être chargé."));
        }, 5000); 
        const interval = setInterval(() => {
            if (window.dcodeIO && window.dcodeIO.bcrypt) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(window.dcodeIO.bcrypt);
            }
        }, 100);
        return;
    } 
    else if (!script) {
        script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";
        script.async = true;
        script.onload = () => {
            if (window.dcodeIO && window.dcodeIO.bcrypt) {
                resolve(window.dcodeIO.bcrypt);
            } else {
                reject(new Error("bcrypt script loaded but lib not found."));
            }
        };
        script.onerror = (e) => reject(new Error("Failed to load bcryptjs script."));
        document.head.appendChild(script);
    }
    else if (script && window.dcodeIO?.bcrypt) {
         resolve(window.dcodeIO.bcrypt);
    }
  });
}

// =================================
// FONCTIONS DU MODULE ADMIN
// =================================

/**
 * Charge et affiche la liste des administrateurs
 */
async function loadAdmins() {
    if (!adminListBody) return;
    adminListBody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm"></div> Chargement...</td></tr>';
    
    try {
        const usersRef = ref(database, 'users');
        // Requête pour trouver les utilisateurs où role == "admin"
        const adminQuery = query(usersRef, orderByChild('role'), equalTo('admin'));
        const snapshot = await get(adminQuery);

        if (!snapshot.exists()) {
            adminListBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun administrateur trouvé.</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(childSnapshot => {
            const adminId = childSnapshot.key;
            const admin = childSnapshot.val();
            
            // Affiche le statut
            const statusBadge = (admin.isActive === 'active' || admin.isActive === true)
                ? '<span class="badge bg-success">Actif</span>'
                : '<span class="badge bg-secondary">Inactif</span>';
            
            // L'admin connecté ne peut pas se supprimer lui-même
            const isCurrentUser = (currentUserId === adminId);
            const deleteBtn = isCurrentUser
                ? `<button class="btn btn-secondary btn-sm" disabled title="Vous ne pouvez pas vous supprimer"><i class="bi bi-trash3-fill"></i></button>`
                : `<button class="btn btn-danger btn-sm delete-admin-btn" data-id="${adminId}" title="Supprimer"><i class="bi bi-trash3-fill"></i></button>`;

            html += `
                <tr data-id="${adminId}">
                    <td>${admin.username}</td>
                    <td>${admin.nom || ''} ${admin.prenom || ''}</td>
                    <td>${statusBadge}</td>
                    <td class="text-center">
                        ${deleteBtn}
                    </td>
                </tr>
            `;
        });
        adminListBody.innerHTML = html;

    } catch (err) {
        console.error("Erreur lors du chargement des admins:", err);
        adminListBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erreur: ${err.message}</td></tr>`;
        showAlert(err.message, 'danger');
    }
}

/**
 * Gère la soumission du formulaire d'ajout d'admin
 */
async function handleAddAdmin(e) {
    e.preventDefault();
    if (!bcrypt) {
      showAlert('Le module de sécurité (bcrypt) n\'est pas chargé.', 'danger');
      return;
    }

    const nom = document.getElementById('addAdminNom').value;
    const prenom = document.getElementById('addAdminPrenom').value;
    const username = document.getElementById('addAdminUsername').value;
    const password = document.getElementById('addAdminPassword').value;

    if (!nom || !prenom || !username || !password) {
      showAlert('Veuillez remplir tous les champs.', 'warning');
      return;
    }

    const submitBtn = addAdminForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Ajout...';

    try {
        // Vérifier si le nom d'utilisateur existe déjà
        const userQuery = query(ref(database, 'users'), orderByChild('username'), equalTo(username));
        const existingUser = await get(userQuery);
        if (existingUser.exists()) {
            throw new Error(`Le nom d'utilisateur "${username}" existe déjà.`);
        }

        // Hacher le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = {
            nom: nom,
            prenom: prenom,
            username: username,
            password: hashedPassword,
            role: "admin",
            isActive: "active", // Actif par défaut
            avatar: "/assets/img/user.png" // Avatar par défaut
        };

        // Sauvegarder dans la DB
        const newAdminRef = push(ref(database, 'users'));
        await set(newAdminRef, newAdmin);

        showAlert('Administrateur ajouté avec succès !', 'success');
        addAdminModal.hide();
        addAdminForm.reset();
        await loadAdmins(); // Rafraîchir la liste

    } catch (err) {
        console.error("Erreur lors de l'ajout de l'admin:", err);
        showAlert(err.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Ajouter';
    }
}

/**
 * Gère le clic sur le bouton de suppression
 */
async function handleDeleteAdmin(e) {
    const btn = e.target.closest('.delete-admin-btn');
    if (!btn) return;

    const adminId = btn.dataset.id;
    if (!confirm(`Voulez-vous vraiment supprimer cet administrateur ?\nCette action est irréversible.`)) {
        return;
    }

    try {
        await remove(ref(database, `users/${adminId}`));
        showAlert('Administrateur supprimé.', 'success');
        await loadAdmins(); // Rafraîchir la liste
    } catch (err) {
        console.error("Erreur lors de la suppression:", err);
        showAlert(err.message, 'danger');
    }
}

// =================================
// FONCTION D'INITIALISATION (Exportée)
// =================================

/**
 * Initialise la section de gestion des admins.
 * @param {Object} currentUser L'objet utilisateur de l'admin connecté.
 */
export async function initAdminSettings(currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
        console.error("Accès non autorisé à initAdminSettings.");
        return;
    }
    
    currentUserId = currentUser.id; // Stocke l'ID pour la vérification (anti-suppression)

    // Charge bcrypt une seule fois
    if (!bcrypt) {
        try {
            bcrypt = await loadBcrypt();
        } catch(e) {
            console.error(e);
            showAlert(e.message, 'danger');
            // On peut continuer, mais l'ajout sera bloqué
        }
    }

    // Attache les écouteurs d'événements
    if (addAdminForm) {
        addAdminForm.removeEventListener('submit', handleAddAdmin); // Évite les doublons
        addAdminForm.addEventListener('submit', handleAddAdmin);
    }
    if (adminListBody) {
        adminListBody.removeEventListener('click', handleDeleteAdmin); // Évite les doublons
        adminListBody.addEventListener('click', handleDeleteAdmin);
    }

    // Charge la liste des admins
    await loadAdmins();
}