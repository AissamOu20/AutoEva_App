// =================================
// TEST DU CHARGEMENT INITIAL (STATS)
// =================================

console.log("--- admin-dashboard.js : Le fichier est lu (Niveau 0) ---");

// --- Imports partagés (vérifiés) ---
import { database } from '../db/firebase-config.js';
console.log("--- IMPORT 1/4 (firebase-config) : SUCCÈS ---");

import { checkAuth, logout } from '../user.js';
console.log("--- IMPORT 2/4 (user.js) : SUCCÈS ---");

import { showAlert } from '../alerts.js';
console.log("--- IMPORT 3/4 (alerts.js) : SUCCÈS ---");

// --- Imports locaux (testés) ---
import { initDashboard } from '../admin/dashboard-stats.js'; 
console.log("--- IMPORT 4/x (Imports locaux) : SUCCÈS ---");

// (On laisse les autres imports commentés pour l'instant)
/*
import { initStudentSettings } from '../admin/student-settings.js'; 
import { initGroupSettings } from '../admin/group-settings.js'; 
import { initQuizSettings } from '../admin/quiz-settings.js'; 
import { initAvatarSettings } from '../admin/avatar-settings.js'; 
import { initAdminSettings } from '../admin/admin-settings.js'; 
import { initImportExport } from '../admin/import-export.js';
*/ 


document.addEventListener("DOMContentLoaded", async () => {
  
  console.log("--- admin-dashboard.js : DOMContentLoaded s'est déclenché (Niveau 1) ---");

  // 1. --- AUTHENTIFICATION ---
  // (Nécessaire pour initDashboard)
  console.log("DEBUG: Lancement de checkAuth...");
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

  
  // 5. --- CHARGEMENT INITIAL (TEST DES STATS) ---
  // -----------------------------
  // On teste le chargement de la section active (Dashboard)
  try {
      console.log("DEBUG: Lancement de initDashboard(user)...");
      initDashboard(user); 
      document.getElementById('dashboard').dataset.loaded = 'true';
      console.log("DEBUG: Chargement initial du Dashboard TERMINÉ.");
  } catch(err) {
      console.error("ERREUR au chargement du dashboard initial:", err);
      showAlert('Erreur au chargement des statistiques.', 'danger');
  }

});