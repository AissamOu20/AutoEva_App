// =================================
// IMPORTS
// =================================
import { 
    database, 
    ref, 
    set, 
    push, 
    get,
    remove,
    query,
    orderByChild,
    equalTo
} from '/assets/js/db/firebase-config.js';

import { checkAuth, logout } from '/assets/js/user.js';
import { showAlert } from '/assets/js/alerts.js';

// ✅ IMPORTATION DU MODULE DE GESTION DES ADMINS
import { initAdminSettings } from './admin-settings.js';

// =================================
// LOGIQUE PRINCIPALE DU DASHBOARD
// =================================
document.addEventListener("DOMContentLoaded", async () => {
  
  // 1. --- AUTHENTIFICATION ET VÉRIFICATION DU RÔLE ---
  // -------------------------------------------------
  const user = await checkAuth(true); // Vérifie si connecté
  if (!user) return; // checkAuth gère déjà la redirection

  // ❗️ Vérification cruciale : l'utilisateur est-il un admin ?
  if (user.role !== 'admin') {
    showAlert('Accès non autorisé. Vous n\'êtes pas administrateur.', 'danger');
    await logout(); // Déconnecte l'utilisateur non-admin
    return;
  }

  // 2. --- SÉLECTEURS DOM ---
  // -------------------------
  const logoutBtn = document.getElementById('logoutBtn');
  const sections = document.querySelectorAll('.section');
  const sidebarLinks = document.querySelectorAll('.sidebar a[data-section]');
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('collapseBtn');
  

  // 3. --- LOGIQUE DE NAVIGATION (VOS SNIPPETS INTÉGRÉS) ---
  // -------------------------------------------------------

  // ✅ VOTRE SNIPPET : Navigation dans la Sidebar (modifié pour lazy-loading)
  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.dataset.section;
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
          // Masquer toutes les sections
          sections.forEach(sec => sec.classList.remove('active'));
          // Afficher la section cible
          targetSection.classList.add('active');

          // Mettre à jour le lien actif
          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');

          // --- ⭐️ Logique de "Lazy Loading" (Chargement à la demande) ---
          // On ne charge les données d'une section que la première fois qu'on clique dessus
          if (!targetSection.dataset.loaded) {
              console.log(`Chargement de la section : ${targetId}`);
              
              if (targetId === 'admins') {
                  initAdminSettings(user); // Appelle le module admin
              } else if (targetId === 'students') {
                  initStudents();
              } else if (targetId === 'groups') {
                  initGroups();
              } else if (targetId === 'quizzes') {
                  initQuizzes();
              } else if (targetId === 'avatars') {
                  initAvatars();
              } else if (targetId === 'importExport') {
                  initImportExport();
              }
              // Marquer comme chargé pour ne pas re-charger
              targetSection.dataset.loaded = 'true'; 
          }
      }
    });
  });

  // ✅ VOTRE SNIPPET : "Collapse" de la sidebar
  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    // Gère l'icône de chevron
    const icon = collapseBtn.querySelector('i');
    icon.classList.toggle('bi-chevron-right');
    icon.classList.toggle('bi-chevron-left');
  });

  // Gestion de la déconnexion
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await logout(); // Utilise la fonction centralisée de user.js
  });


  // 4. --- FONCTIONS D'INITIALISATION DES SECTIONS ---
  // (La logique "admin" est dans admin-settings.js)
  // -------------------------------------------------
  
  function initDashboard() {
      console.log("Chargement section Dashboard...");
      // Mettez ici le code pour charger vos stats (studentCount, groupCount, etc.)
      // Exemple : 
      // document.getElementById('studentCount').textContent = '123';
      // document.getElementById('groupCount').textContent = '10';
  }
  
  function initStudents() {
      console.log("Chargement section Étudiants...");
      // Mettez ici le code de gestion des étudiants (loadStudents, pagination, etc.)
      // (Ce code sera sûrement dans un module séparé comme 'student-settings.js')
      const studentTableBody = document.getElementById('studentsTable')?.querySelector('tbody');
      if (studentTableBody) studentTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Logique étudiants à implémenter.</td></tr>';
  }

  function initGroups() {
      console.log("Chargement section Groupes...");
      const groupsContainer = document.getElementById('groupsContainer');
      if (groupsContainer) groupsContainer.innerHTML = '<p class="text-center">Logique groupes à implémenter.</p>';
  }
  
  function initQuizzes() {
      console.log("Chargement section Quiz...");
      const quizzesTableBody = document.getElementById('quizzesTable');
      if (quizzesTableBody) quizzesTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Logique quiz à implémenter.</td></tr>';
  }
  
  function initAvatars() {
      console.log("Chargement section Avatars...");
      const avatarGrid = document.getElementById('avatarGridDisplay');
      if (avatarGrid) avatarGrid.innerHTML = '<p class="text-center">Logique avatars à implémenter.</p>';
  }
  
  function initImportExport() {
      console.log("Chargement section Import/Export...");
      // Mettez ici le code pour gérer les imports/exports
  }


  // 5. --- CHARGEMENT INITIAL ---
  // -----------------------------
  // Chargez la logique de la première section active (Dashboard)
  // (elle a la classe 'active' dans le HTML par défaut)
  initDashboard();
  document.getElementById('dashboard').dataset.loaded = 'true';
  
});