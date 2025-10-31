/* ================================================= */
/* 🏆 student-groups-ranking.js
/* Script autonome pour la page de classement.
/* Affiche le classement de TOUS les groupes.
/* ================================================= */

// 🔹 Imports (simplifiés)
import { checkAuth } from "../user.js"; 
import { database, ref, onValue, query, orderByChild } from "../db/firebase-config.js";

// 🔹 DOM
const rankingContainer = document.getElementById("groupRankingContainer");
const pageTitle = document.getElementById("pageTitle"); // Toujours utile si on veut le manipuler

// -----------------------------------------------------------------
// 🔹 1. EXÉCUTION PRINCIPALE (Simplifiée)
// -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    if (!rankingContainer || !pageTitle) {
        console.error("Fatal: 'groupRankingContainer' ou 'pageTitle' n'a pas été trouvé.");
        return;
    }
    
    try {
        // 1. On vérifie qui est l'utilisateur
        const user = await checkAuth(true);
        if (!user) return; // checkAuth gère la redirection

        // 2. On charge directement le classement des groupes
        loadGroupRanking(user.group);

    } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
        rankingContainer.innerHTML = '<p class="text-center text-danger col-12">Erreur de chargement. Veuillez réessayer.</p>';
    }
});


// -----------------------------------------------------------------
// 🔹 2. Fonctions pour le classement des groupes
// -----------------------------------------------------------------

/**
 * Charge les données de tous les groupes, triées par rang.
 */
function loadGroupRanking(userGroup) {
  const groupsRef = ref(database, "groups");
  const rankingQuery = query(groupsRef, orderByChild("rang"));

  onValue(rankingQuery, (snapshot) => {
    if (!snapshot.exists()) {
      rankingContainer.innerHTML = '<p class="text-center text-muted col-12">Aucun groupe n\'a encore été classé.</p>';
      return;
    }
    const groupsArray = [];
    snapshot.forEach((childSnapshot) => {
      groupsArray.push(childSnapshot.val());
    });
    renderAllGroupsCards(groupsArray, userGroup);
  }, (error) => {
    console.error("Erreur Firebase (loadGroupRanking):", error);
    rankingContainer.innerHTML = '<p class="text-center text-danger col-12">Erreur de chargement du classement.</p>';
  });
}

/**
 * Affiche TOUS les groupes sous forme de cartes.
 */
function renderAllGroupsCards(groups, userGroup) {
  rankingContainer.innerHTML = ""; // Vider les squelettes
  let animationDelay = 0;

  groups.forEach((group) => {
    if (!group.rang || group.rang === 0) return;

    const studentCount = (group.etudiants || []).length;
    const groupNameEncoded = encodeURIComponent(group.nom);

    // Classes de la carte
    let cardClasses = 'leaderboard-card group-card animate-slide-up';
    if (group.rang === 1) cardClasses += ' rank-1';
    else if (group.rang === 2) cardClasses += ' rank-2';
    else if (group.rang === 3) cardClasses += ' rank-3';
    if (userGroup && group.nom === userGroup) {
       cardClasses += ' current-user-group';
    }
    
    const delayStyle = `animation-delay: ${animationDelay}s;`;
    animationDelay += 0.05;

    const cardHTML = `
      <div class="col">
        <div class="${cardClasses}" style="${delayStyle}">
          
          <span class="rank-badge">${group.rang}</span>
          
          <div class="name mt-3">${group.nom || 'Groupe Inconnu'}</div>
          
          <div class="details">${studentCount} Étudiant(s)</div>
          
          <div class="points">
            <i class="bi bi-trophy-fill text-warning"></i> ${group.total_points || 0} pts Total
          </div>

          <a href="group-ranking.html?group=${groupNameEncoded}" class="btn btn-sm btn-outline-info mt-3 btn-group-details">
              Voir classement du groupe
          </a>

        </div>
      </div>
    `;
    rankingContainer.innerHTML += cardHTML;
  });
}

// -----------------------------------------------------------------
// 🔹 3. MODE 2 (Supprimé)
// -----------------------------------------------------------------
// Les fonctions loadStudentRankingForGroup et renderStudentRankingCards
// ont été supprimées car elles ne sont plus nécessaires sur cette page.