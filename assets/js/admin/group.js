// ===============================
// 🔹 admin-groups.js (Gère les groupes ET le modal des étudiants avec Hachage MDP)
// ===============================

// 🔹 Import Firebase
import { database, ref, onValue, set, remove, update, query, orderByChild, equalTo, get } from "../db/firebase-config.js";

// -----------------------------------------------------------------
// ⬇️ AJOUT : Fonction pour charger bcryptjs dynamiquement ⬇️
// -----------------------------------------------------------------
async function loadBcrypt() {
  if (window.dcodeIO && window.dcodeIO.bcrypt) return window.dcodeIO.bcrypt;
  return new Promise((resolve, reject) => {
    // Vérifier si le script existe déjà pour éviter de le charger plusieurs fois
    if (document.querySelector('script[src*="bcrypt.min.js"]')) {
        // Attendre que bcrypt soit prêt s'il est déjà en cours de chargement
        const checkBcrypt = setInterval(() => {
            if (window.dcodeIO && window.dcodeIO.bcrypt) {
                clearInterval(checkBcrypt);
                resolve(window.dcodeIO.bcrypt);
            }
        }, 100);
        // Ajouter un timeout au cas où
        setTimeout(() => {
            clearInterval(checkBcrypt);
            if (!window.dcodeIO || !window.dcodeIO.bcrypt) {
               reject(new Error("Timeout: bcrypt n'a pas pu être chargé."));
            }
        }, 5000); // 5 secondes timeout
        return;
    }

    // Si le script n'existe pas, le créer et le charger
    const url = "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";
    const s = document.createElement("script");
    s.src = url;
    s.async = true; // Charger de manière asynchrone
    s.onload = () => {
      if (window.dcodeIO && window.dcodeIO.bcrypt) {
          resolve(window.dcodeIO.bcrypt);
      } else {
          reject(new Error("bcrypt chargé mais introuvable (dcodeIO.bcrypt)."));
      }
    };
    s.onerror = (e) => reject(new Error("Échec chargement bcryptjs : " + (e.message || 'Erreur inconnue')));
    document.head.appendChild(s);
  });
}
// -----------------------------------------------------------------
// ⬆️ FIN AJOUT ⬆️
// -----------------------------------------------------------------


// 🔹 DOM (Groupes)
const groupsContainer = document.getElementById("groupsContainer");
const searchInput = document.getElementById("searchGroupInput");

// 🔹 DOM (Modal d'édition de Groupe)
const groupModalEl = document.getElementById("groupModal");
const groupModal = groupModalEl ? new bootstrap.Modal(groupModalEl) : null;
const groupModalLabel = document.getElementById("groupModalLabel");
const groupForm = document.getElementById("groupForm");
const groupIdInput = document.getElementById("groupId");
const groupNameInput = document.getElementById("groupName");
const groupDescriptionInput = document.getElementById("groupDescription");

// 🔹 DOM (Nouveau Modal de gestion des Étudiants)
const manageStudentsModalEl = document.getElementById("manageStudentsModal");
const manageStudentsModal = manageStudentsModalEl ? new bootstrap.Modal(manageStudentsModalEl) : null;
const manageStudentsModalLabel = document.getElementById("manageStudentsModalLabel");
const groupStudentsTableBody = document.getElementById("groupStudentsTableBody");
const addStudentToGroupBtn = document.getElementById("addStudentToGroupBtn");

// 🔹 DOM (Nouveau Modal d'édition d'Étudiant)
const studentFromGroupModalEl = document.getElementById("studentFromGroupModal");
const studentFromGroupModal = studentFromGroupModalEl ? new bootstrap.Modal(studentFromGroupModalEl) : null;
const studentFromGroupForm = document.getElementById("studentFromGroupForm");
const studentFromGroupModalLabel = document.getElementById("studentFromGroupModalLabel");
const studentFromGroupId = document.getElementById("studentFromGroupId");
const studentFromGroupName = document.getElementById("studentFromGroupName");
const studentFromGroupFirstName = document.getElementById("studentFromGroupFirstName");
const studentFromGroupUsername = document.getElementById("studentFromGroupUsername");
const studentFromGroupPassword = document.getElementById("studentFromGroupPassword");

// 🔹 Variables globales
let allGroups = {};
let currentGroupIdForModal = null; // Pour savoir quel groupe on gère

// -----------------------------------------------------------------
// 🔹 1. Gestion des Groupes (Chargement et Affichage)
// -----------------------------------------------------------------
function loadGroups() {
  groupsContainer.innerHTML = '<p class="text-center">Chargement des groupes...</p>';
  const groupsRef = ref(database, "groups");

  onValue(groupsRef, (snapshot) => {
    if (!snapshot.exists()) {
      groupsContainer.innerHTML = '<p class="text-center text-muted">Aucun groupe trouvé.</p>';
      return;
    }
    allGroups = snapshot.val();
    renderGroups();
  }, (error) => {
    console.error("Erreur Firebase (loadGroups):", error);
    groupsContainer.innerHTML = '<p class="text-center text-danger">Erreur de chargement.</p>';
  });
}

function renderGroups() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  groupsContainer.innerHTML = "";

  const filteredGroups = Object.entries(allGroups).filter(([id, group]) =>
    group.nom.toLowerCase().includes(searchTerm)
  );

  filteredGroups.sort(([, groupA], [, groupB]) => (groupA.rang || 999) - (groupB.rang || 999));

  if (filteredGroups.length === 0) {
     groupsContainer.innerHTML = '<p class="text-center text-muted">Aucun groupe ne correspond à votre recherche.</p>';
     return;
  }

  filteredGroups.forEach(([groupId, group]) => {
    const numberOfStudents = (group.etudiants || []).length;
    const card = document.createElement("div");
    card.className = "col-md-4 mb-4";
    card.innerHTML = `
      <div class="group-card card shadow-sm h-100">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <h5 class="card-title">${group.nom}</h5>
                <span class="badge bg-primary rounded-pill" style="font-size: 1rem;">
                    # ${group.rang || '-'}
                </span>
            </div>
            <p class="card-text text-muted">${group.description || "Pas de description."}</p>
            <div class="group-info">
              <span><strong>Étudiants :</strong> ${numberOfStudents}</span>
              <span><strong>Total Points :</strong> ${group.total_points || 0}</span>
            </div>
        </div>
        <div class="card-footer group-buttons">
          <button class="btn btn-sm btn-outline-primary btn-edit" title="Modifier">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn btn-sm btn-outline-info btn-info" title="Gérer étudiants">
            <i class="bi bi-people"></i>
          </button>
        </div>
      </div>
    `;

    card.querySelector(".btn-edit").addEventListener("click", () => openEditModal(groupId, group));
    card.querySelector(".btn-delete").addEventListener("click", () => deleteGroup(groupId));
    card.querySelector(".btn-info").addEventListener("click", () => manageStudents(groupId));

    groupsContainer.appendChild(card);
  });
}

// -----------------------------------------------------------------
// 🔹 2. Logique Modaux (Édition Groupe)
// -----------------------------------------------------------------
function openEditModal(id, group) {
  if (!groupModal) return;
  groupForm.reset();
  groupModalLabel.textContent = `Modifier le groupe : ${id}`;
  groupIdInput.value = id;
  groupNameInput.value = group.nom;
  groupNameInput.disabled = true;
  groupDescriptionInput.value = group.description || "";
  groupModal.show();
}

async function saveGroup(event) {
  event.preventDefault();
  if (!groupModal) return;
  const id = groupIdInput.value;
  const description = groupDescriptionInput.value.trim();
  if (!id) return;

  try {
    await update(ref(database, `groups/${id}`), {
        description: description
    });
    groupModal.hide();
  } catch (error) {
    console.error("Erreur 'saveGroup':", error);
    alert("Erreur lors de la sauvegarde.");
  }
}

// -----------------------------------------------------------------
// 🔹 3. Supprimer un Groupe (Robuste)
// -----------------------------------------------------------------
async function deleteGroup(id) {
  if (!confirm(`Voulez-vous vraiment supprimer le groupe "${id}" ?\n\nTous les étudiants de ce groupe seront "sans groupe".`)) {
    return;
  }

  try {
    const updates = {};
    updates[`groups/${id}`] = null;
    const usersQuery = query(ref(database, "users"), orderByChild("group"), equalTo(id));
    const usersSnapshot = await get(usersQuery);

    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((child) => {
        updates[`users/${child.key}/group`] = "";
      });
    }

    await update(ref(database), updates);
  } catch (error) {
    console.error("Erreur 'deleteGroup':", error);
    alert("Erreur lors de la suppression.");
  }
}

// -----------------------------------------------------------------
// 🔹 4. GÉRER ÉTUDIANTS (Nouvelle Logique de Modal)
// -----------------------------------------------------------------
function manageStudents(id) {
  if (!manageStudentsModal) return alert("Modal de gestion des étudiants introuvable.");
  currentGroupIdForModal = id;
  manageStudentsModalLabel.textContent = `Étudiants du groupe : ${id}`;
  loadStudentsForGroup(id);
  manageStudentsModal.show();
}

async function loadStudentsForGroup(groupId) {
  groupStudentsTableBody.innerHTML = '<tr><td colspan="5">Chargement...</td></tr>';

  try {
    const usersQuery = query(ref(database, "users"), orderByChild("group"), equalTo(groupId));
    const snapshot = await get(usersQuery);

    if (!snapshot.exists()) {
      groupStudentsTableBody.innerHTML = '<tr><td colspan="5">Aucun étudiant dans ce groupe.</td></tr>';
      return;
    }

    groupStudentsTableBody.innerHTML = "";
    const students = snapshot.val();

    Object.entries(students).forEach(([id, student]) => {
      if (student.role !== 'student') return;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${student.id}</td>
        <td>${student.nom || ''} ${student.prenom || ''}</td>
        <td>${student.username || ''}</td>
        <td>${student.totalPoints || 0}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary btn-edit-student" title="Modifier">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete-student" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      row.querySelector(".btn-edit-student").addEventListener("click", () => openStudentEditModal(student));
      row.querySelector(".btn-delete-student").addEventListener("click", () => deleteStudentFromGroup(student.id));

      groupStudentsTableBody.appendChild(row);
    });

  } catch (error) {
    console.error("Erreur 'loadStudentsForGroup':", error);
    groupStudentsTableBody.innerHTML = '<tr><td colspan="5" class="text-danger">Erreur de chargement.</td></tr>';
  }
}

// -----------------------------------------------------------------
// 🔹 5. CRUD Étudiants (depuis le Modal)
// -----------------------------------------------------------------
function openStudentAddModal() {
  if (!studentFromGroupModal) return;

  studentFromGroupForm.reset();
  studentFromGroupId.value = "";
  studentFromGroupModalLabel.textContent = `Ajouter au groupe : ${currentGroupIdForModal}`;
  studentFromGroupPassword.placeholder = "Mot de passe obligatoire";
  studentFromGroupModal.show();
}

function openStudentEditModal(student) {
  if (!studentFromGroupModal) return;

  studentFromGroupForm.reset();
  studentFromGroupModalLabel.textContent = `Modifier : ${student.nom} ${student.prenom}`;

  studentFromGroupId.value = student.id;
  studentFromGroupName.value = student.nom;
  studentFromGroupFirstName.value = student.prenom;
  studentFromGroupUsername.value = student.username;
  studentFromGroupPassword.placeholder = "Laisser vide pour ne pas changer";

  studentFromGroupModal.show();
}

// (MODIFIÉ) Gère la sauvegarde (Ajout ou Modification) avec Hachage
async function saveStudentFromGroup(event) {
  event.preventDefault();

  const studentId = studentFromGroupId.value;
  const nom = studentFromGroupName.value;
  const prenom = studentFromGroupFirstName.value;
  const username = studentFromGroupUsername.value;
  const passwordInput = studentFromGroupPassword.value; // Mot de passe en clair

  let bcrypt; // <-- AJOUT: variable pour bcrypt

  try {
    // Tenter de charger bcryptjs
    bcrypt = await loadBcrypt(); // <-- AJOUT
  } catch (bcryptErr) {
      console.error("Impossible de charger bcrypt :", bcryptErr);
      alert("Erreur critique: impossible de charger le module de hachage.");
      return; // Bloquer la sauvegarde si bcrypt n'est pas dispo
  }

  try {
    let finalId = studentId;
    let isNewUser = false;
    let hashedPassword = null; // <-- AJOUT: pour stocker le mdp haché

    // Hacher le mot de passe s'il est fourni
    if (passwordInput) {
        try {
            hashedPassword = await bcrypt.hash(passwordInput, 10); // 10 = salt rounds <-- AJOUT
        } catch (hashErr) {
            console.error("Erreur de hachage:", hashErr);
            alert("Erreur lors du hachage du mot de passe.");
            return; // Bloquer si le hachage échoue
        }
    }

    if (studentId) {
      // --- Mode Édition ---
      const studentRef = ref(database, `users/${studentId}`);
      const updates = { nom, prenom, username };
      if (hashedPassword) { // <-- MODIFIÉ: utiliser hashedPassword
        updates.password = hashedPassword;
      }
      await update(studentRef, updates);

    } else {
      // --- Mode Ajout ---
      if (!hashedPassword) { // <-- MODIFIÉ: vérifier hashedPassword
        alert("Le mot de passe est obligatoire pour un nouvel étudiant.");
        return;
      }
      isNewUser = true;
      const usersSnap = await get(ref(database, "users"));
      const maxId = Object.keys(usersSnap.val() || {}).reduce((max, id) => Math.max(max, parseInt(id) || 0), 0);
      finalId = maxId + 1;

      const newStudentData = {
        id: finalId,
        nom,
        prenom,
        username,
        password: hashedPassword, // <-- MODIFIÉ: utiliser hashedPassword
        group: currentGroupIdForModal,
        role: "student",
        avatar: '/assets/img/user.png',
        isActive: true,
        quizzes: {},
        totalPoints: 0
      };
      await set(ref(database, `users/${finalId}`), newStudentData);
    }

    studentFromGroupModal.hide();
    loadStudentsForGroup(currentGroupIdForModal);

    // Mettre à jour les stats UNIQUEMENT si un nouvel user a été ajouté ou si mdp a changé (impact potentiel futur?)
    if (isNewUser) { // Simplifié: on recalcule juste si c'est un nouvel user
        await updateGroupsCalculations();
    }

  } catch (error) {
    console.error("Erreur 'saveStudentFromGroup':", error);
    alert("Erreur lors de la sauvegarde de l'étudiant.");
  }
}


// (NOUVEAU) Supprime un étudiant
async function deleteStudentFromGroup(studentId) {
  if (!confirm(`Voulez-vous vraiment supprimer cet étudiant (ID: ${studentId}) ?`)) {
    return;
  }

  try {
    await remove(ref(database, `users/${studentId}`));
    loadStudentsForGroup(currentGroupIdForModal);
    await updateGroupsCalculations();

  } catch (error) {
    console.error("Erreur 'deleteStudentFromGroup':", error);
    alert("Erreur lors de la suppression.");
  }
}

// -----------------------------------------------------------------
// 🔹 6. Outil : Recalculer les stats des groupes
// -----------------------------------------------------------------
async function updateGroupsCalculations() {
  console.log("Recalcul des statistiques des groupes...");

  try {
    const groupsSnap = await get(ref(database, "groups"));
    const usersSnap = await get(ref(database, "users"));

    if (!groupsSnap.exists() || !usersSnap.exists()) {
      console.warn("Données manquantes pour le recalcul.");
      return;
    }

    const allGroups = groupsSnap.val();
    const allUsers = usersSnap.val();

    for (const groupId in allGroups) {
      allGroups[groupId].total_points = 0;
      allGroups[groupId].etudiants = [];
    }

    for (const userId in allUsers) {
      const user = allUsers[userId];
      if (user.role === 'student' && user.group && allGroups[user.group]) {
        allGroups[user.group].total_points += (user.totalPoints || 0);
        allGroups[user.group].etudiants.push(user.id); // Stocker l'ID de l'étudiant
      }
    }

    const groupList = Object.values(allGroups);
    groupList.sort((a, b) => b.total_points - a.total_points);
    groupList.forEach((group, index) => {
      group.rang = index + 1;
    });

    // Recréer l'objet pour la mise à jour
    const updatedGroups = {};
    groupList.forEach(group => {
        updatedGroups[group.nom] = group; // Utiliser le nom comme clé
    });

    await update(ref(database, 'groups'), updatedGroups); // Utiliser l'objet recréé
    console.log("Statistiques des groupes mises à jour.");

  } catch (error) {
    console.error("Erreur 'updateGroupsCalculations':", error);
  }
}


// -----------------------------------------------------------------
// 🔹 7. Écouteurs d'événements
// -----------------------------------------------------------------
if (searchInput) {
    searchInput.addEventListener("input", renderGroups);
}
if (groupForm) {
    groupForm.addEventListener("submit", saveGroup);
}
if (addStudentToGroupBtn) {
    addStudentToGroupBtn.addEventListener("click", openStudentAddModal);
}
if (studentFromGroupForm) {
    studentFromGroupForm.addEventListener("submit", saveStudentFromGroup);
}

// -----------------------------------------------------------------
// 🔹 Démarrage
// -----------------------------------------------------------------
loadGroups();