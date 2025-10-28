// =================================
// TEST DES IMPORTS (ÉTAPE 5 - FINALE)
// =================================

console.log("--- admin-dashboard.js : Le fichier est lu (Niveau 0) ---");

// --- Imports partagés (vérifiés) ---
import { database } from '../db/firebase-config.js';
console.log("--- IMPORT 1/4 (firebase-config) : SUCCÈS ---");

import { checkAuth } from '../user.js';
console.log("--- IMPORT 2/4 (user.js) : SUCCÈS ---");

import { showAlert } from '../alerts.js';
console.log("--- IMPORT 3/4 (alerts.js) : SUCCÈS ---");


// --- On teste TOUS les imports locaux ---
import { initDashboard } from './dashboard-stats.js'; 

console.log("--- IMPORT 4/x (Imports locaux) : SUCCÈS ---");


document.addEventListener("DOMContentLoaded", async () => {
  
  console.log("--- admin-dashboard.js : DOMContentLoaded s'est déclenché (Niveau 1) ---");

  // On arrête le script ici pour le test
  return; 

});