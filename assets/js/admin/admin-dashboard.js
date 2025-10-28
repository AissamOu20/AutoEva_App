// =================================
// IMPORTS
// =================================

// ❗️ On garde les chemins relatifs corrigés
import { 
    database, ref, set, push, get, remove, query, orderByChild, equalTo
} from '../db/firebase-config.js';
import { checkAuth, logout } from '../student/user.js';
import { showAlert } from '../alerts.js';

// Imports locaux (corrects)
import { initDashboard } from './dashboard-stats.js'; 
import { initStudentSettings } from './student-settings.js'; 
import { initGroupSettings } from './group-settings.js'; 
import { initQuizSettings } from './quiz-settings.js'; 
import { initAvatarSettings } from './avatar-settings.js'; 
import { initAdminSettings } from './admin-settings.js'; 
import { initImportExport } from './import-export.js'; 


// =================================
// LOGIQUE PRINCIPALE DU DASHBOARD
// =================================
document.addEventListener("DOMContentLoaded", async () => {
  
  // ✅ DEBUG 1: Vérifier si le script se lance
  console.log("--- admin-dashboard.js chargé (DOMContentLoaded) ---");

  // 1. --- AUTHENTIFICATION ET VÉRIFICATION DU RÔLE ---
  // -------------------------------------------------
  const user = await checkAuth(true); 
  if (!user) {
    console.error("DEBUG: checkAuth a échoué, script arrêté.");
    return; 
  }

  if (user.role !== 'admin') {
    console.error("DEBUG: Utilisateur n'est pas admin, script arrêté.");
    showAlert('Accès non autorisé. Vous n\'êtes pas administrateur.', 'danger');
    await logout(); 
    return;
  }
  
  // ✅ DEBUG 2: Confirmer que l'admin est authentifié
  console.log(`DEBUG: Admin authentifié : ${user.username} (Rôle: ${user.role})`);


  // 2. --- SÉLECTEURS DOM ---
  // -------------------------
  const logoutBtn = document.getElementById('logoutBtn');
  const sections = document.querySelectorAll('.section');
  const sidebarLinks = document.querySelectorAll('.sidebar a[data-section]');
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('collapseBtn');
  
  // ✅ DEBUG 3: Vérifier si les sélecteurs trouvent quelque chose
  console.log(`DEBUG: Liens de navigation trouvés : ${sidebarLinks.length}`);
  console.log(`DEBUG: Sections trouvées : ${sections.length}`);
  
  // 3. --- LOGIQUE DE NAVIGATION ---
  // -------------------------------
  sidebarLinks.forEach(link => {
    
    // ✅ DEBUG 4: Voir chaque lien trouvé
    console.log(`DEBUG: Attachement du clic au lien : ${link.dataset.section}`);

    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.dataset.section;
      
      // ✅ DEBUG 5: Voir sur quel lien on clique
      console.log(`--- CLIC SUR : ${targetId} ---`);

      const targetSection = document.getElementById(targetId);

      if (targetSection) {
          // ✅ DEBUG 6: Confirmer que la section HTML a été trouvée
          console.log(`DEBUG: Section trouvée : ${targetSection.id}`);

          sections.forEach(sec => sec.classList.remove('active'));
          targetSection.classList.add('active');

          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');

          if (!targetSection.dataset.loaded) {
              // ✅ DEBUG 7: Confirmer la tentative de chargement
              console.log(`DEBUG: Chargement du module pour : ${targetId}`);
              
              try {
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
                  console.error(`DEBUG: ERREUR lors du chargement de ${targetId}:`, err);
                  showAlert(`Erreur au chargement de la section ${targetId}.`, 'danger');
              }
              
              targetSection.dataset.loaded = 'true'; 
          } else {
              // ✅ DEBUG 8: Confirmer que le module est déjà chargé
              console.log(`DEBUG: Module pour ${targetId} déjà chargé.`);
          }
      } else {
        // ✅ DEBUG 9: ERREUR si la section n'est pas trouvée
        console.error(`ERREUR: Section non trouvée ! ID cherché : #${targetId}`);
      }
    });
  });

  // ... (Reste du code pour collapseBtn et logoutBtn) ...
  
  // Gestion de la déconnexion
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log("DEBUG: Clic sur Déconnexion");
    await logout(); 
  });
  
  // 5. --- CHARGEMENT INITIAL ---
  // -----------------------------
  try {
      console.log("DEBUG: Chargement initial du Dashboard...");
      initDashboard(user); 
      document.getElementById('dashboard').dataset.loaded = 'true';
      console.log("DEBUG: Chargement initial du Dashboard TERMINÉ.");
  } catch(err) {
      console.error("DEBUG: ERREUR au chargement du dashboard initial:", err);
      showAlert('Erreur au chargement des statistiques.', 'danger');
  }
  
});