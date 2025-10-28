// =================================
// IMPORTS (CHEMINS CORRIGÉS)
// =================================

// --- Imports partagés (vérifiés) ---
import { 
    database, ref, set, push, get, remove, query, orderByChild, equalTo
} from '../db/firebase-config.js';
import { checkAuth, logout } from '../user.js';
import { showAlert } from '../alerts.js';

// --- Imports locaux (vérifiés) ---
import { initDashboard } from '../admin/dashboard-stats.js'; 
import { initStudentSettings } from '../admin/student-settings.js'; 
import { initGroupSettings } from '../admin/group-settings.js'; 
import { initQuizSettings } from '../admin/quiz-settings.js'; 
import { initAvatarSettings } from '../admin/avatar-settings.js'; 
import { initAdminSettings } from '../admin/admin-settings.js'; 
import { initImportExport } from '../admin/import-export.js'; 


// =================================
// LOGIQUE PRINCIPALE DU DASHBOARD (COMPLÈTE)
// =================================
document.addEventListener("DOMContentLoaded", async () => {
  
  console.log("--- admin-dashboard.js : DOMContentLoaded (Code complet) ---");
  
  // 1. --- AUTHENTIFICATION ET VÉRIFICATION DU RÔLE ---
  // -------------------------------------------------
  const user = await checkAuth(true); // Vérifie si connecté
  if (!user) {
    console.error("DEBUG: checkAuth a échoué, script arrêté.");
    return; // checkAuth gère déjà la redirection
  }

  // ❗️ Vérification cruciale : l'utilisateur est-il un admin ?
  if (user.role !== 'admin') {
    console.error("DEBUG: Utilisateur n'est pas admin, script arrêté.");
    showAlert('Accès non autorisé. Vous n\'êtes pas administrateur.', 'danger');
    await logout(); // Déconnecte l'utilisateur non-admin
    return;
  }
  
  console.log(`DEBUG: Admin authentifié : ${user.username}`);

  // 2. --- SÉLECTEURS DOM ---
  // -------------------------
  const logoutBtn = document.getElementById('logoutBtn');
  const sections = document.querySelectorAll('.section');
  const sidebarLinks = document.querySelectorAll('.sidebar a[data-section]');
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('collapseBtn');
  
  console.log(`DEBUG: Liens de navigation trouvés : ${sidebarLinks.length}`);
  
  // 3. --- LOGIQUE DE NAVIGATION ---
  // -------------------------------
  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.dataset.section;
      const targetSection = document.getElementById(targetId);

      console.log(`--- CLIC SUR : ${targetId} ---`);

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
              console.log(`Chargement du module pour : ${targetId}`);
              
              try {
                  // ✅ APPEL DES FONCTIONS IMPORTÉES
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
      } else {
          console.error(`ERREUR: Section non trouvée ! ID cherché : #${targetId}`);
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
  
  // 5. --- CHARGEMENT INITIAL ---
  // -----------------------------
  // Charge la logique de la première section active (Dashboard)
  try {
      console.log("DEBUG: Chargement initial du Dashboard...");
      initDashboard(user); 
      document.getElementById('dashboard').dataset.loaded = 'true';
      console.log("DEBUG: Chargement initial du Dashboard TERMINÉ.");
  } catch(err) {
      console.error("Erreur au chargement du dashboard initial:", err);
      showAlert('Erreur au chargement des statistiques.', 'danger');
  }
  
});