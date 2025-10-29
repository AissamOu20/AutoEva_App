// =================================
// IMPORTS (TOUS ACTIFS, AVEC VOS CHEMINS)
// =================================


// --- Imports partagés (vérifiés) ---
import { 
    database, ref, set, push, get, remove, query, orderByChild, equalTo
} from '../db/firebase-config.js';


import { checkAuth, logout } from '../user.js';


import { showAlert } from '../alerts.js';

// --- Imports locaux (Tous actifs, avec vos chemins) ---
import { initDashboard } from '../admin/dashboard-stats.js'; 
import { initStudentSettings } from '../admin/student-settings.js'; 
import { initGroupSettings } from '../admin/group-settings.js'; 
import { initQuizSettings } from '../admin/quiz-settings.js'; 
import { initAvatarSettings } from '../admin/avatar-settings.js'; 
import { initAdminSettings } from '../admin/admin-settings.js'; 
import { initImportExport } from '../admin/import-export.js';



document.addEventListener("DOMContentLoaded", async () => {
  


  // 1. --- AUTHENTIFICATION ---
  
  const user = await checkAuth(true); 
  if (!user || user.role !== 'admin') {
    console.error("DEBUG: Authentification échouée ou n'est pas admin.");
    if (user) await logout();
    return;
  }
 

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
     

      if (targetSection) {
          sections.forEach(sec => sec.classList.remove('active'));
          targetSection.classList.add('active');
          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');

          if (!targetSection.dataset.loaded) {
           
              try {
                  // ✅ TOUTES LES SECTIONS SONT ACTIVES
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
    
      initDashboard(user); 
      document.getElementById('dashboard').dataset.loaded = 'true';
      
  } catch(err) {
      console.error("ERREUR au chargement du dashboard initial:", err);
      showAlert('Erreur au chargement des statistiques.', 'danger');
  }
  
});