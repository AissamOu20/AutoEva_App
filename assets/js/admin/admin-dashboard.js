// =================================
// TEST DU CHARGEMENT (STATS + STUDENTS)
// =================================

console.log("--- admin-dashboard.js : Le fichier est lu (Niveau 0) ---");

// --- Imports partagés (vérifiés) ---
import { database } from '../db/firebase-config.js';
console.log("--- IMPORT 1/x (firebase-config) : SUCCÈS ---");
import { checkAuth, logout } from '../user.js';
console.log("--- IMPORT 2/x (user.js) : SUCCÈS ---");
import { showAlert } from '../alerts.js';
console.log("--- IMPORT 3/x (alerts.js) : SUCCÈS ---");

// --- Imports locaux (testés) ---
import { initDashboard } from '../admin/dashboard-stats.js'; 
console.log("--- IMPORT 4/x (dashboard-stats.js) : SUCCÈS ---");

// ✅ ÉTAPE 2 : On décommente l'import pour 'students'
import { initStudentSettings } from '../admin/student-settings.js'; 
console.log("--- IMPORT 5/x (student-settings.js) : SUCCÈS ---");

// (On laisse les autres imports commentés pour l'instant)
/*
import { initGroupSettings } from '../admin/group-settings.js'; 
import { initQuizSettings } from '../admin/quiz-settings.js'; 
import { initAvatarSettings } from '../admin/avatar-settings.js'; 
import { initAdminSettings } from '../admin/admin-settings.js'; 
import { initImportExport } from '../admin/import-export.js';
*/ 


document.addEventListener("DOMContentLoaded", async () => {
  
  console.log("--- admin-dashboard.js : DOMContentLoaded s'est déclenché (Niveau 1) ---");

  // 1. --- AUTHENTIFICATION ---
  console.log("DEBUG: Lancement de checkAuth...");
  const user = await checkAuth(true); 
  if (!user || user.role !== 'admin') {
    console.error("DEBUG: Authentification échouée ou n'est pas admin.");
    if (user) await logout();
    return;
  }
  console.log(`DEBUG: Admin authentifié : ${user.username}`);

  // 2. --- SÉLECTEURS DOM ---
  const logoutBtn = document.getElementById('logoutBtn');
  const sections = document.querySelectorAll('.section');
  const sidebarLinks = document.querySelectorAll('.sidebar a[data-section]');
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('collapseBtn');
  
  // 3. --- LOGIQUE DE NAVIGATION ---
  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.dataset.section;
      const targetSection = document.getElementById(targetId);
      console.log(`--- CLIC SUR : ${targetId} ---`);

      if (targetSection) {
          sections.forEach(sec => sec.classList.remove('active'));
          targetSection.classList.add('active');
          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');

          if (!targetSection.dataset.loaded) {
              console.log(`Chargement du module pour : ${targetId}`);
              try {
                  if (targetId === 'dashboard') {
                       initDashboard(user); 
                  }
                  
                  // ✅ ÉTAPE 2 : On décommente le 'else if' pour 'students'
                  else if (targetId === 'students') {
                      initStudentSettings(user);
                  }
                  
                  /* --- TEST : Reste commenté ---
                  else if (targetId === 'groups') {
                      initGroupSettings(user);
                  } 
                  // ... etc ...
                  */
              } catch (err) {
                  console.error(`Erreur lors du chargement de la section ${targetId}:`, err);
                  showAlert(`Erreur au chargement de la section ${targetId}.`, 'danger');
              }
              targetSection.dataset.loaded = 'true'; 
          }
      } else {
          console.error(`ERREUR: Section non trouvée ! ID cherché : #${targetId}`);
      }
    });
  });

  // "Collapse" et "Logout" (code inchangé)
  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const icon = collapseBtn.querySelector('i');
    icon.classList.toggle('bi-chevron-right');
    icon.classList.toggle('bi-chevron-left');
  });
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
  });
  
  // 5. --- CHARGEMENT INITIAL (Dashboard) ---
  try {
      console.log("DEBUG: Chargement initial du Dashboard...");
      initDashboard(user); 
      document.getElementById('dashboard').dataset.loaded = 'true';
      console.log("DEBUG: Chargement initial du Dashboard TERMINÉ.");
  } catch(err) {
      console.error("ERREUR au chargement du dashboard initial:", err);
      showAlert('Erreur au chargement des statistiques.', 'danger');
  }
  
});