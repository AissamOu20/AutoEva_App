// ===============================
// 🔹 student-settings.js (Génération auto username/password + Hachage)
// ===============================

// 🔹 Import Firebase
import { database, ref, onValue, set, remove, update, get } from "../db/firebase-config.js";
// (Bootstrap est supposé être global)

// -----------------------------------------------------------------
// ⬇️ Fonction pour charger bcryptjs dynamiquement ⬇️
// -----------------------------------------------------------------
async function loadBcrypt() {
  if (window.dcodeIO && window.dcodeIO.bcrypt) return window.dcodeIO.bcrypt;
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="bcrypt.min.js"]')) {
        const checkBcrypt = setInterval(() => {
            if (window.dcodeIO && window.dcodeIO.bcrypt) {
                clearInterval(checkBcrypt);
                resolve(window.dcodeIO.bcrypt);
            }
        }, 100);
        setTimeout(() => {
            clearInterval(checkBcrypt);
            if (!window.dcodeIO || !window.dcodeIO.bcrypt) {
               reject(new Error("Timeout: bcrypt n'a pas pu être chargé."));
            }
        }, 5000);
        return;
    }
    const url = "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
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
// ⬆️ FIN BCRYPT ⬆️
// -----------------------------------------------------------------

// 🔹 DOM (Tableau et recherche)
const studentsTable = document.querySelector("#studentsTable tbody");
const addStudentBtn = document.getElementById("addStudentBtn");
const searchInput = document.getElementById("searchStudent");
const paginationContainer = document.getElementById("studentsPagination");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

// 🔹 DOM (Modal d'Édition)
const editStudentModalEl = document.getElementById("editStudentModal");
const editStudentModal = editStudentModalEl ? new bootstrap.Modal(editStudentModalEl) : null;
const editStudentForm = document.getElementById("editStudentForm");
const editStudentId = document.getElementById("editStudentId");
const editUsername = document.getElementById("editUsername");
const editNom = document.getElementById("editNom");
const editPrenom = document.getElementById("editPrenom");
const editGroup = document.getElementById("editGroup");

// ⭐️ DOM (Modal d'Ajout)
const addStudentModalEl = document.getElementById("addStudentModal");
const addStudentModal = addStudentModalEl ? new bootstrap.Modal(addStudentModalEl) : null;
const addStudentForm = document.getElementById("addStudentForm");
const addNomInput = document.getElementById("addNom");
const addPrenomInput = document.getElementById("addPrenom");
const addGroupInput = document.getElementById("addGroup");

// 🔹 Variables
let studentsData = [];
let selectedStudents = [];
let currentPage = 1;
const pageSize = 20;
let isInitialized = false; // ✅ Pour s'assurer que l'init ne se fait qu'une fois
const studentsRef = ref(database, "users");

// ===============================
// 🔹 Table + pagination
// ===============================
function renderTable() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const filtered = studentsData.filter(s =>
        (s.nom?.toLowerCase().includes(searchTerm) ||
        s.prenom?.toLowerCase().includes(searchTerm) ||
        s.username?.toLowerCase().includes(searchTerm) ||
        (s.Groupe || s.group || "").toLowerCase().includes(searchTerm))
    );

    const totalPages = Math.ceil(filtered.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filtered.slice(start, end);

    if (!studentsTable) return;
    studentsTable.innerHTML = ""; // Clear table body

    // Select All Checkbox Logic
    const tableHead = document.querySelector("#studentsTable thead tr");
    let selectAllCheckbox = tableHead?.querySelector("#selectAllStudents");
    if (tableHead && !selectAllCheckbox) {
        const th = document.createElement("th");
        th.innerHTML = `<input type="checkbox" id="selectAllStudents" class="form-check-input">`;
        th.classList.add("text-center", "select-all");
        tableHead.prepend(th);
        selectAllCheckbox = document.getElementById("selectAllStudents");
        selectAllCheckbox?.addEventListener("change", e => {
            const checked = e.target.checked;
            selectedStudents = checked ? filtered.map(s => s.id) : [];
            renderTable(); 
        });
    }

    if (selectAllCheckbox) {
        const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedStudents.includes(s.id));
        selectAllCheckbox.checked = allFilteredSelected;
        selectAllCheckbox.indeterminate = !allFilteredSelected && filtered.some(s => selectedStudents.includes(s.id));
    }


    // Render table rows
    pageData.forEach(student => {
        const isChecked = selectedStudents.includes(student.id);
        const row = document.createElement("tr");
        row.innerHTML = `
        <td class="text-center">
            <input type="checkbox" class="form-check-input select-student" data-id="${student.id}" ${isChecked ? "checked" : ""}>
        </td>
        <td>${student.id}</td>
        <td>
            <div class="d-flex align-items-center">
            <img src="${student.avatar || './assets/img/user.png'}" class="avatar me-2" alt="Avatar">
            <span>${student.username || ''}</span>
            </div>
        </td>
        <td>${student.nom || ""} ${student.prenom || ""}</td>
        <td>${student.Groupe || student.group || ""}</td>
        <td>
            <span class="badge ${student.isActive ? 'bg-success' : 'bg-secondary'}">
            ${student.isActive ? "Actif" : "Inactif"}
            </span>
        </td>
        <td class="text-center">
            <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary btn-edit" title="Modifier"><i class="bi bi-pencil-square"></i></button>
            <button class="btn btn-sm btn-outline-danger btn-delete" title="Supprimer"><i class="bi bi-trash"></i></button>
            <button class="btn btn-sm btn-outline-warning btn-reset" title="Réinitialiser MDP"><i class="bi bi-arrow-counterclockwise"></i></button>
            </div>
        </td>
        `;

        row.querySelector(".btn-edit")?.addEventListener("click", () => openEditModal(student));
        row.querySelector(".btn-delete")?.addEventListener("click", () => deleteStudent(student.id));
        row.querySelector(".btn-reset")?.addEventListener("click", () => resetPassword(student.id));
        row.querySelector(".select-student")?.addEventListener("change", e => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                if (!selectedStudents.includes(id)) selectedStudents.push(id);
            } else {
                selectedStudents = selectedStudents.filter(x => x !== id);
            }
            if (selectAllCheckbox) {
                const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedStudents.includes(s.id));
                selectAllCheckbox.checked = allFilteredSelected;
                selectAllCheckbox.indeterminate = !allFilteredSelected && filtered.some(s => selectedStudents.includes(s.id));
            }
        });

        row.addEventListener("dblclick", () => window.location.href = `../student/profile.html?id=${student.id}`);
        studentsTable.appendChild(row);
    });

    renderPagination(totalPages, filtered.length); 
}

function renderPagination(totalPages, totalItems) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = "";
    if (totalPages <= 1) return;

    // Previous Button
    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
    if (currentPage > 1) {
        prevLi.addEventListener("click", (e) => { e.preventDefault(); currentPage--; renderTable(); });
    }
    paginationContainer.appendChild(prevLi);

    // Page Numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
     if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
        const firstLi = document.createElement("li");
        firstLi.className = `page-item`;
        firstLi.innerHTML = `<a class="page-link" href="#">1</a>`;
        firstLi.addEventListener("click", (e) => { e.preventDefault(); currentPage = 1; renderTable(); });
        paginationContainer.appendChild(firstLi);
        if (startPage > 2) {
             const ellipsisLi = document.createElement("li");
             ellipsisLi.className = `page-item disabled`;
             ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
             paginationContainer.appendChild(ellipsisLi);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === currentPage ? "active" : ""}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener("click", (e) => { e.preventDefault(); currentPage = i; renderTable(); });
        paginationContainer.appendChild(li);
    }

     if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
             const ellipsisLi = document.createElement("li");
             ellipsisLi.className = `page-item disabled`;
             ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
             paginationContainer.appendChild(ellipsisLi);
        }
        const lastLi = document.createElement("li");
        lastLi.className = `page-item`;
        lastLi.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
        lastLi.addEventListener("click", (e) => { e.preventDefault(); currentPage = totalPages; renderTable(); });
        paginationContainer.appendChild(lastLi);
    }

    // Next Button
    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
    if (currentPage < totalPages) {
        nextLi.addEventListener("click", (e) => { e.preventDefault(); currentPage++; renderTable(); });
    }
    paginationContainer.appendChild(nextLi);
}

// ===============================
// ⭐️ SAUVEGARDER NOUVEL ÉTUDIANT (Génération Auto)
// ===============================
async function saveNewStudent(event) {
    event.preventDefault();
    const nom = addNomInput.value.trim();
    const prenom = addPrenomInput.value.trim();
    const group = addGroupInput.value.trim();

    if (!nom || !prenom || !group) {
        alert("Le nom, le prénom et le groupe sont obligatoires.");
        return;
    }

    const generatedUsername = `${nom.toLowerCase()}_${prenom.toLowerCase()}_${group.toLowerCase()}`.replace(/\s+/g, '');
    const generatedPassword = `${prenom.toLowerCase()}@123`.replace(/\s+/g, '');
    console.log(`Généré Username: ${generatedUsername}, Password: ${generatedPassword}`); 

    let bcrypt;
    try {
        bcrypt = await loadBcrypt();
    } catch (bcryptErr) {
        console.error("Impossible de charger bcrypt :", bcryptErr);
        alert("Erreur critique: impossible de charger le module de hachage.");
        return;
    }

    let hashedPassword;
    try {
        showCenterToast("Hachage du mot de passe...", true);
        updateCenterToastProgress(0.5);
        hashedPassword = await bcrypt.hash(generatedPassword, 10); 
        updateCenterToastProgress(1);
        hideCenterToastAfter(500);
    } catch (hashErr) {
        console.error("Erreur de hachage:", hashErr);
        alert("Erreur lors du hachage du mot de passe généré.");
        hideCenterToastAfter(100);
        return;
    }

    let newId = 1;
    if (studentsData.length) {
        const maxId = Math.max(...studentsData.map(s => parseInt(s.id) || 0));
        newId = maxId + 1;
    }

    try {
        await set(ref(database, "users/" + newId), {
            id: newId,
            nom,
            prenom,
            group,
            username: generatedUsername, 
            password: hashedPassword,    
            role: "student",
            avatar: './assets/img/user.png',
            isActive: false, // Inactif par défaut
            quizzes: {},
            totalPoints: 0
        });

        addStudentModal.hide(); 
        await updateGroups(); 

    } catch (dbError) {
        console.error("Erreur sauvegarde Firebase:", dbError);
        alert("Erreur lors de l'ajout de l'étudiant.");
        hideCenterToastAfter(100);
    }
}

// ===============================
// 🔹 Modifier étudiant
// ===============================
async function saveEditedStudent(event) {
    event.preventDefault();
    const id = editStudentId.value;
    try {
        await update(ref(database, "users/" + id), {
            username: editUsername.value,
            nom: editNom.value,
            prenom: editPrenom.value,
            group: editGroup.value
        });
        editStudentModal.hide();
        await updateGroups();
    } catch (error) {
        console.error("Erreur modification étudiant:", error);
        alert("Erreur lors de la modification.");
    }
}

// ===============================
// 🔹 Supprimer étudiant(s)
// ===============================
async function deleteStudent(id) {
    if (!confirm("Supprimer cet étudiant ?")) return;
    try {
        await remove(ref(database, "users/" + id));
        selectedStudents = selectedStudents.filter(x => x !== id);
        await updateGroups();
    } catch (error) {
        console.error("Erreur suppression étudiant:", error);
        alert("Erreur lors de la suppression.");
    }
}

async function deleteSelectedStudents() {
    if (selectedStudents.length === 0) return showCenterToast("Aucun étudiant sélectionné !", false, 1500);
    if (!confirm(`Supprimer ${selectedStudents.length} étudiant(s) ?`)) return;

    showCenterToast("Suppression en cours...", true);

    try {
        const updates = {};
        selectedStudents.forEach(id => {
            updates[`users/${id}`] = null;
        });
        await update(ref(database), updates);
        selectedStudents = [];
        await updateGroups(); // Gère le toast final

    } catch (error) {
        console.error("Erreur suppression multiple:", error);
        hideCenterToastAfter(2000, "Erreur lors de la suppression ❌");
    }
}


// ===============================
// 🔹 Réinitialiser mot de passe
// ===============================
async function resetPassword(id) {
    const newPassword = prompt("Nouveau mot de passe (sera haché):");
    if (!newPassword) return;

    let bcrypt;
    try {
        bcrypt = await loadBcrypt();
    } catch (bcryptErr) {
        console.error("Impossible de charger bcrypt :", bcryptErr);
        alert("Erreur critique: impossible de charger le module de hachage.");
        return;
    }

    let hashedPassword;
    try {
        showCenterToast("Hachage en cours...", true);
        updateCenterToastProgress(0.5);
        hashedPassword = await bcrypt.hash(newPassword, 10);
        updateCenterToastProgress(1);
    } catch (hashErr) {
        console.error("Erreur de hachage:", hashErr);
        alert("Erreur lors du hachage du mot de passe.");
        hideCenterToastAfter(100);
        return;
    }

    try {
        await update(ref(database, "users/" + id), { password: hashedPassword });
        hideCenterToastAfter(1000, "Mot de passe réinitialisé ✅");
    } catch (dbError) {
        console.error("Erreur MàJ Firebase:", dbError);
        alert("Erreur lors de la mise à jour du mot de passe.");
        hideCenterToastAfter(100);
    }
}


// ===============================
// 🔹 Ouvrir modal édition
// ===============================
function openEditModal(student) {
    if (!editStudentModal) return;
    editStudentId.value = student.id;
    editUsername.value = student.username || '';
    editNom.value = student.nom || '';
    editPrenom.value = student.prenom || '';
    editGroup.value = student.group || student.Groupe || "";
    editStudentModal.show();
}

// =================================
// 🔹 Fonction updateGroups
// =================================
async function updateGroups() {
    console.log("Mise à jour des groupes lancée...");
    showCenterToast("Mise à jour des groupes...", true);

    try {
        const groupsSnap = await get(ref(database, "groups"));
        const usersSnap = await get(ref(database, "users"));

        const existingGroups = groupsSnap.val() || {};
        const currentUsers = usersSnap.val() || {};

        const newGroupsData = {};

        Object.values(currentUsers).forEach(user => {
            if (user.role !== 'student') return;
            const groupName = user.group || user.Groupe;
            if (!groupName) return;

            if (!newGroupsData[groupName]) {
                newGroupsData[groupName] = {
                    nom: groupName,
                    total_points: 0,
                    etudiants: [],
                    description: existingGroups[groupName]?.description || ""
                };
            }
            newGroupsData[groupName].total_points += (user.totalPoints || 0);
            newGroupsData[groupName].etudiants.push(user.id);
        });

        const groupList = Object.values(newGroupsData);
        groupList.sort((a, b) => b.total_points - a.total_points);
        groupList.forEach((group, index) => {
            group.rang = index + 1;
        });

        const finalGroupData = {};
        groupList.forEach(group => {
            finalGroupData[group.nom] = group;
        });

        await set(ref(database, "groups"), finalGroupData);

        console.log("Mise à jour des groupes terminée.");
        hideCenterToastAfter(1000, "Groupes mis à jour ✅");

    } catch (error) {
        console.error("Erreur lors de la mise à jour des groupes:", error);
        hideCenterToastAfter(2000, "Erreur de mise à jour ❌");
    }
}

// ===============================
// 🔹 Toast central bloquant
// ===============================
let toastHideTimeout = null;
function showCenterToast(message, withProgress = false, duration = null) {
    let toast = document.getElementById("centerToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "centerToast";
        toast.innerHTML = `
        <div id="toastContent" class="text-center p-4 rounded-4 shadow-lg bg-white" style="min-width: 250px;">
            <span id="toastMessage">${message}</span>
            <div id="toastProgressContainer" style="display: ${withProgress ? 'block' : 'none'};">
                <div id="toastProgress" class="bg-primary rounded mt-3" style="height:6px; width:0%; transition: width 0.3s;"></div>
            </div>
        </div>`;
        toast.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        display:flex; justify-content:center; align-items:center;
        background:rgba(0,0,0,0.4); z-index:99999;
        pointer-events:none;
        `;
        document.body.appendChild(toast);
    } else {
        document.getElementById("toastMessage").innerText = message;
        document.getElementById("toastProgressContainer").style.display = withProgress ? 'block' : 'none';
        document.getElementById("toastProgress").style.width = withProgress ? "0%" : "100%";
        toast.style.display = "flex";
    }

    if (toastHideTimeout) clearTimeout(toastHideTimeout);
    
    if (duration !== null) {
        hideCenterToastAfter(duration);
    }
}

function updateCenterToastProgress(percent) {
    const progress = document.getElementById("toastProgress");
    if (progress) {
        const clampedPercent = Math.max(0, Math.min(1, percent));
        progress.style.width = `${clampedPercent * 100}%`;
    }
}

function hideCenterToastAfter(ms = 1500, finalMsg = "") {
    const toast = document.getElementById("centerToast");
    const messageEl = document.getElementById("toastMessage");
    const progressEl = document.getElementById("toastProgress");

    if (!toast) return;

    if (finalMsg && messageEl) {
        messageEl.innerText = finalMsg;
    }
    if (finalMsg && progressEl && document.getElementById("toastProgressContainer")?.style.display !== 'none') {
        progressEl.style.width = "100%";
    }

    if (toastHideTimeout) clearTimeout(toastHideTimeout);

    toastHideTimeout = setTimeout(() => {
        if (toast) {
            toast.style.display = "none";
        }
        toastHideTimeout = null;
    }, ms);
}


// ===============================
// 🚀 POINT D'ENTRÉE (EXPORTÉ)
// ===============================
/**
 * Initialise la section de gestion des étudiants.
 * (Appelée par dashboard.js)
 * @param {Object} user L'objet utilisateur admin (au cas où)
 */
export function initStudentSettings(user) {
    if (isInitialized) return; // Ne s'exécute qu'une fois
    console.log("Initialisation du module Étudiants...");

    // 1. Attacher les écouteurs d'événements
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', saveNewStudent);
    }
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', saveEditedStudent);
    }
    if (searchInput) {
        searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    }
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            if (!addStudentModal) return alert("Le modal d'ajout n'est pas configuré !");
            addStudentForm.reset();
            addStudentModal.show();
        });
    }
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedStudents);
    }

    // 2. Démarrer le listener Firebase
    // (Cela déclenche le premier appel à renderTable)
    onValue(studentsRef, snapshot => {
        const users = snapshot.val() || {};
        studentsData = Object.entries(users)
            .map(([id, u]) => ({ id, ...u })) // S'assurer que l'ID (clé) est inclus
            .filter(u => u.role === "student");
        renderTable(); 
    });

    isInitialized = true;
}