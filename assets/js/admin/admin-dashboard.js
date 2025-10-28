// =================================
// TEST DES IMPORTS (ÉTAPE 2)
// =================================

console.log("--- admin-dashboard.js : Le fichier est lu (Niveau 0) ---");

// --- On teste le premier import ---
import { database } from '../db/firebase-config.js';
console.log("--- IMPORT 1/4 (firebase-config) : SUCCÈS ---");


/* --- Imports commentés pour l'instant ---
import { checkAuth, logout } from '../student/user.js';
import { showAlert } from '../alerts.js'; 
import { initDashboard } from './dashboard-stats.js'; 
import { initStudentSettings } from './student-settings.js'; 
import { initGroupSettings } from './group-settings.js'; 
import { initQuizSettings } from './quiz-settings.js'; 
import { initAvatarSettings } from './avatar-settings.js'; 
import { initAdminSettings } from './admin-settings.js'; 
import { initImportExport } from './import-export.js'; 
*/


document.addEventListener("DOMContentLoaded", async () => {
  
  console.log("--- admin-dashboard.js : DOMContentLoaded s'est déclenché (Niveau 1) ---");

  // On arrête le script ici pour le test
  return; 

});