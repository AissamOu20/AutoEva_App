import { database, ref, get } from "../db/firebase-config.js";
import { checkAuth } from "../user.js";

// ✅ Image selon la catégorie (Inchangé)
function getCategoryImage(category) {
  switch (category) {
    case "Mécanique / Pneumatique / Hydraulique": return "../assets/img/hydro.jpg";
    case "Électricité / Électronique": return "../assets/img/elect.jpg";
    case "Mathématiques et sciences fondamentales": return "../assets/img/math.jpg";
    case "Informatique et automatismes": return "../assets/img/info.jpg";
    case "Maintenance et dépannage": return "../assets/img/main.jpg";
    case "Qualité, sécurité et environnement": return "../assets/img/envo.jpg";
    case "Compétences transversales": return "../assets/img/comp.jpg";
    case "Savoirs technologiques spécifiques": return "../assets/img/tech.jpg";
    case "Unités et grandeurs physiques": return "../assets/img/unite.jpg";
    case "Logique et raisonnement": return "../assets/img/logic.jpg";
    case "Métrologie et instrumentation": return "../assets/img/intru.jpg";
    case "Analyse et résolution de problèmes": return "../assets/img/problm.jpg";
    case "Interprétation et analyse des données": return "../assets/img/inter.jpg";
    case "Proportionnalité et relations entre grandeurs": return "../assets/img/propo.jpg";
    case "Code du travail et droit social marocain": return "../assets/img/cdt.jpg";
    default: return "../assets/img/quiz.png";
  }
}

// ✅ Badge niveau (Inchangé)
function getLevelBadge(level) {
  if (!level) return `<span class="badge bg-secondary">N/A</span>`;
  const l = level.toLowerCase();
  if (l.includes("base")) return `<span class="badge bg-success">BASE</span>`;
  if (l.includes("inter")) return `<span class="badge bg-warning text-dark">INTER</span>`;
  if (l.includes("expert")) return `<span class="badge bg-danger">EXPERT</span>`;
  return `<span class="badge bg-secondary">N/A</span>`;
}

// ✅ Remplir les catégories dans le select (Inchangé)
function populateCategoryFilter(quizzesArray) {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;
  const categories = new Set();
  // Utilise .forEach sur l'array [key, quiz]
  quizzesArray.forEach(([id, quiz]) => {
    const cat = quiz.categorie || quiz.Catégorie;
    if (cat) categories.add(cat);
  });
  categoryFilter.innerHTML = `<option value="">Toutes les catégories</option>`;
  // Trie les catégories par ordre alphabétique
  Array.from(categories).sort().forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
}

// ✅ Vérifier si le quiz a été passé aujourd'hui (Inchangé)
function checkHasTakenToday(quizAttemptData) {
    if (!quizAttemptData || !quizAttemptData.completedAt) return false;
    const lastAttemptDate = new Date(quizAttemptData.completedAt);
    const currentDate = new Date();
    return lastAttemptDate.getFullYear() === currentDate.getFullYear() &&
           lastAttemptDate.getMonth() === currentDate.getMonth() &&
           lastAttemptDate.getDate() === currentDate.getDate();
}


// =================================================================
// 🔹 DÉMARRAGE ET LOGIQUE PRINCIPALE (MODIFIÉ)
// =================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // ⭐️ MODIFICATION : Utilise le conteneur unique de l'HTML
  const quizListContainer = document.getElementById("quizListContainer"); 
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  // ⭐️ SUPPRESSION : skeletonContainer n'est plus séparé

  // ⭐️ MODIFICATION : Vérifie le conteneur unique
  if (!quizListContainer) {
    console.error("Conteneur '#quizListContainer' introuvable !");
    return;
  }
  
  let allQuizzes = [];
  let userQuizHistory = {};
  
  // Affiche les skeletons PENDANT l'authentification et le chargement
  showSkeletons(9); // 9 skeletons

  // --- 1. Authentification d'abord ---
  try {
      const user = await checkAuth(true); // Attend la confirmation d'authentification
      
      if (user) {
          // --- 2. Récupérer l'historique de l'utilisateur (maintenant qu'on est authentifié) ---
          try {
              const historySnap = await get(ref(database, `users/${user.id}/quizzes`));
              if (historySnap.exists()) {
                  userQuizHistory = historySnap.val();
              }
          } catch (historyErr) {
               console.warn("Erreur récupération historique:", historyErr.message);
          }
          
          // --- 3. Charger les quiz (uniquement si l'authentification a réussi) ---
          await loadQuizzes();

      } else {
           throw new Error("Authentification échouée, utilisateur non trouvé.");
      }

  } catch (err) {
      console.error("Échec de l'authentification ou du chargement:", err);
      // ⭐️ MODIFICATION : Affiche l'erreur dans le conteneur unique
      quizListContainer.innerHTML = `<p class="text-center text-danger w-100">${err.message}</p>`;
  }

  // --- 4. Définition des fonctions ---

  async function loadQuizzes() {
    try {
      // ⭐️ LECTURE CORRIGÉE : Changé de "quizzs" à "quizzes"
      const snapshot = await get(ref(database, "quizzes")); // Chemin 'quizzes'

      if (!snapshot.exists()) {
        quizListContainer.innerHTML = `<p class="text-center w-100">Aucun quiz trouvé.</p>`;
        return;
      }

      const quizzes = snapshot.val();
      // Filtre les quiz (doivent avoir des questions) et stocke [key, data]
      const filteredQuizzes = Object.entries(quizzes).filter(([id, quiz]) =>
         (quiz.totalQuestions || (Array.isArray(quiz.questionsIds) ? quiz.questionsIds.length : 0)) > -1
      );

      allQuizzes = filteredQuizzes;
      populateCategoryFilter(allQuizzes); // Remplit le filtre
      displayQuizzes(allQuizzes); // Affiche les quiz (remplace les skeletons)

      // Attache les écouteurs de filtre
      searchInput?.addEventListener("input", filterQuizzes);
      searchInput?.addEventListener("change", filterQuizzes);
      
      // ✅ CORRECTION : Ajout de l'écouteur pour le filtre de catégorie
      categoryFilter?.addEventListener("change", filterQuizzes);

    } catch (error) {
      console.error("Erreur lors du chargement des quiz :", error);
      quizListContainer.innerHTML = `<p class="text-center text-danger w-100">Erreur chargement: ${error.message}</p>`;
    }
  }

  // ⭐️ MODIFICATION : Fonction pour afficher le skeleton
  function showSkeletons(count = 9) {
    if (!quizListContainer) return;
    quizListContainer.innerHTML = ""; // Vide le conteneur

    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement("div");
      skeleton.classList.add("col");
      // Utilise le HTML du skeleton défini dans all-quiz.css
      skeleton.innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-content">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line badge-line"></div>
                <div class="skeleton-line text-short"></div>
                <div class="skeleton-line text-medium"></div>
                <div class="skeleton-line text-long"></div>
            </div>
            <div class="skeleton-footer">
                <div class="skeleton-line button"></div>
                <div class="skeleton-line date"></div>
            </div>
        </div>
      `;
      quizListContainer.appendChild(skeleton);
    }
  }

  // ⭐️ SUPPRESSION : hideSkeletons() n'est plus nécessaire
  // function hideSkeletons() { ... }

  // ⭐️ MODIFICATION : Fonction d'affichage des quiz
  function displayQuizzes(quizzesArray) {
    quizListContainer.innerHTML = ""; // Vide les skeletons ou les résultats précédents
    if (quizzesArray.length === 0) {
      quizListContainer.innerHTML = `<p class="text-center w-100">Aucun quiz correspondant.</p>`;
      return;
    }
    quizzesArray.forEach(([id, quiz]) => { // id = firebaseKey
      const col = document.createElement("div");
      col.classList.add("col");
      const categoryImg = getCategoryImage(quiz.categorie || quiz.Catégorie);
      const levelBadge = getLevelBadge(quiz.niveau || quiz.Niveau);
      const quizId = quiz.id_quiz; // L'ID défini par l'utilisateur
      
      const attemptData = userQuizHistory[quizId];
      const hasTaken = checkHasTakenToday(attemptData);
      
      let cardClasses = "card quiz-card shadow-sm h-100";
      let buttonHtml = `<a href="./quiz.html?id=${quizId}" class="btn btn-outline-success btn-sm">Démarrer le Quiz</a>`;
      
      if (hasTaken) {
          cardClasses += " quiz-disabled";
          buttonHtml = `<button class="btn btn-outline-secondary btn-sm" disabled>Passé Aujourd'hui</button>`;
      }
      
      const version = quiz.version || "1.0";
      const totalQuestions = quiz.totalQuestions || (Array.isArray(quiz.questionsIds) ? quiz.questionsIds.length : 0);
      const description = quiz.competences || "Pas de description disponible.";

      // Utilise la nouvelle structure HTML de all-quiz.css
      col.innerHTML = `
        <div class="${cardClasses}">
          <div class="quiz-card-img" style="background-image: url('${categoryImg}');"></div>
          <div class="card-body">
              <h4 class="quiz-title">${quiz.titre_quiz || quiz.Titre_Quiz || "Sans titre"}</h4>
              <div class="d-flex align-items-center gap-2 mb-3">
                  ${levelBadge}
                  <span class="badge bg-info text-dark">v${version}</span>
                  <span class="badge bg-light text-dark border">${totalQuestions} Qs</span>
              </div>
              <p class="card-text quiz-description text-muted small">${description}</p>
              <div class="mt-auto d-flex justify-content-between align-items-center card-footer-custom">
                  ${buttonHtml}
                  <small class="text-body-secondary">${quiz.date || ""}</small>
              </div>
          </div>
        </div>
      `;
      quizListContainer.appendChild(col);
    });
  }

  // Fonction de filtrage globale (Inchangée)
  function filterQuizzes() {
    const searchText = searchInput.value.toLowerCase();
    const selectedCat = categoryFilter.value;

    const filtered = allQuizzes.filter(([id, quiz]) => {
      const title = (quiz.titre_quiz || quiz.Titre_Quiz || "").toLowerCase();
      const cat = quiz.categorie || quiz.Catégorie || "";
      const matchesSearch = title.includes(searchText);
      const matchesCat = selectedCat === "" || cat === selectedCat;
      return matchesSearch && matchesCat;
    });

    displayQuizzes(filtered);
  }

});