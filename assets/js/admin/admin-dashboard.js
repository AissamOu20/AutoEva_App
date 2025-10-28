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

// =================================
// ✅ IMPORTATION DE TOUS LES MODULES DE SECTION
// =================================
//
// ❗️ IMPORTANT : 
// Assurez-vous que les chemins (ex: './student-settings.js') 
// et les noms de fonctions (ex: initStudentSettings) 
// correspondent EXACTEMENT à vos fichiers.
//
// -------------------------------------------------

// Logique pour l'onglet "Dashboard"
import { initDashboard } from './dashboard-stats.js'; 

// Logique pour l'onglet "Étudiants"
import { initStudentSettings } from './student-settings.js'; 

// Logique pour l'onglet "Groupes"
import { initGroupSettings } from './group-settings.js'; 

// Logique pour l'onglet "Quiz"
import { initQuizSettings } from './quiz-settings.js'; 

// Logique pour l'onglet "Avatars"
import { initAvatarSettings } from './avatar-settings.js'; 

// Logique pour l'onglet "Admins"
import { initAdminSettings } from './admin-settings.js'; 

// Logique pour l'onglet "Import/Export"
import { initImportExport } from './import-export.js'; 


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
  
  // 3. --- LOGIQUE DE NAVIGATION ---
  // -------------------------------
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

          // --- ⭐️ Logique de "Lazy Loading" (Appel des modules importés) ---
          if (!targetSection.dataset.loaded) {
              console.log(`Chargement de la section : ${targetId}`);
              
              // ✅ APPEL DES FONCTIONS IMPORTÉES
              try {
                  // On passe 'user' à chaque module au cas où ils en auraient besoin
                  if (targetId === 'dashboard') {
                       initDashboard(user); 
                  } else if (targetId === 'admins') {
                      initAdminSettings(user);
                  } else if (targetId === 'students') {
                      initStudentSettings(user);
                  } else if (targetId === 'groups') {
                      initGroupSettings(user);
                  } else if (targetId === 'quizzes') {
                      initQuizSettings(user);
                  } else if (targetId === 'avatars') {
                      initAvatarSettings(user);
                  } else if (targetId === 'importExport') {
                      initImportExport(user);
                  }
              } catch (err) {
                  console.error(`Erreur lors du chargement de la section ${targetId}:`, err);
                  showAlert(`Erreur au chargement de la section ${targetId}.`, 'danger');
              }
              
              // Marquer comme chargé pour ne pas re-charger
              targetSection.dataset.loaded = 'true'; 
          }
      }
    });
  });

  // "Collapse" de la sidebar
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


  // 4. --- FONCTIONS D'INITIALISATION (SUPPRIMÉES) ---
  // -------------------------------------------------
  // ❌ Les fonctions function initStudents() { ... }, etc.
  // ❌ ont été supprimées car elles sont maintenant importées.

  
  // 5. --- CHARGEMENT INITIAL ---
  // -----------------------------
  // Charge la logique de la première section active (Dashboard)
  try {
      initDashboard(user); 
      document.getElementById('dashboard').dataset.loaded = 'true';
  } catch(err) {
      console.error("Erreur au chargement du dashboard initial:", err);
      showAlert('Erreur au chargement des statistiques.', 'danger');
  }
  
});