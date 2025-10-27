import { database, ref, get, update } from "../db/firebase-config.js";
import { checkAuth } from "../user.js";

// 🔹 Sélecteurs DOM (Cible le contenu de la carte)
const profileCard = document.querySelector(".profile-card");
const avatarModalEl = document.getElementById("avatarModal");
const avatarsGrid = document.getElementById("avatarsGrid");
// ❌ SUPPRIMÉ : Le bouton close personnalisé n'est plus nécessaire
// const closeBtn = document.getElementById("closeAvatarModal"); 

// 🔹 Instance de Modal Bootstrap (Simplifié)
let avatarModalInstance = null;
if (avatarModalEl && window.bootstrap) {
    // Initialise le modal si Bootstrap est chargé
    avatarModalInstance = new bootstrap.Modal(avatarModalEl);
} else {
    // Gère le cas où Bootstrap JS n'est pas chargé
    console.error("Bootstrap Modal JS non trouvé. Le modal d'avatar ne fonctionnera pas.");
}

// 🔹 Loader dynamique (Inchangé)
const loader = document.createElement("div");
loader.id = "loader";
Object.assign(loader.style, {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  background: "rgba(255,255,255,0.8)", display: "none", flexDirection: "column",
  alignItems: "center", justifyContent: "center", zIndex: 1060, // z-index plus élevé
  fontFamily: "sans-serif", fontSize: "18px", color: "#333"
});
const spinner = document.createElement("div");
Object.assign(spinner.style, {
  border: "5px solid #f3f3f3", borderTop: "5px solid #3498db", borderRadius: "50%",
  width: "50px", height: "50px", marginBottom: "10px", animation: "spin 1s linear infinite"
});
const loaderText = document.createElement("div");
loaderText.id = "loaderText"; loaderText.textContent = "Chargement...";
loader.appendChild(spinner); loader.appendChild(loaderText);
document.body.appendChild(loader);
const style = document.createElement("style");
style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);

function showLoader(text = "Chargement...") { loaderText.textContent = text; loader.style.display = "flex"; }
function hideLoader() { loader.style.display = "none"; }

// 🔹 Skeleton (Inchangé)
function showProfileSkeleton() {
  if (!profileCard) return; 
  profileCard.innerHTML = `
    <div class="skeleton-card text-center">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-text long"></div>
      <div class="skeleton-text medium"></div>
      <hr>
      <div class="row mt-4">
        <div class="col-12">
          <h3 class="mb-3">Quiz passés</h3>
          <table class="table quiz-table skeleton-table" style="width: 90%; margin: 0 auto;">
            <thead class="table-light">
              <tr>
                <th>#</th>
                <th>Quiz</th>
                <th>Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${Array(3).fill(`
                <tr>
                  <td><div></div></td>
                  <td><div></div></td>
                  <td><div></div></td>
                  <td><div></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 🔹 Affichage réel du profil (Inchangé)
// (Le "bi bi-pencil-fill" fonctionnera grâce au lien CDN ajouté dans le HTML)
function renderProfile(profileUser, isEditMode) {
    if (!profileCard) return false;
    profileCard.innerHTML = `
        <div class="position-relative d-inline-block avatar-section">
            <img src="${profileUser.avatar || "/assets/img/user.png"}" alt="avatar" class="avatar img-thumbnail p-1" id="profileAvatar">
            <button class="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 edit-avatar-btn"
                    id="changeAvatarBtn" title="Changer l'avatar" style="display: ${isEditMode ? 'inline-flex' : 'none'};">
                <i class="bi bi-pencil-fill"></i> </button>
        </div>
        <h2 id="allname" class="fw-bold mb-1">${profileUser.nom || ''} ${profileUser.prenom || ''}</h2>
        <p class="text-muted mb-4" id="groupDisplay">Groupe: ${profileUser.Groupe || profileUser.group || "N/A"}</p>
        <hr class="my-4">
        <div class="row mt-4">
          <div class="col-12 text-start">
            <h3 class="mb-3 text-center fw-semibold">Quiz passés</h3>
            <div class="table-responsive">
              <table class="table quiz-table table-hover align-middle">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="text-center">#</th>
                    <th scope="col">Quiz</th>
                    <th scope="col" class="text-center">Score</th>
                    <th scope="col" class="text-center">Date</th>
                  </tr>
                </thead>
                <tbody id="quizList">
                </tbody>
              </table>
            </div>
          </div>
        </div>
    `;
    return true; 
}

// 🔹 Remplissage du tableau des quizzes (Inchangé)
async function fillQuizzes(profileUser) {
  const quizList = document.getElementById("quizList");
  if (!quizList) return;
  quizList.innerHTML = '<tr><td colspan="4" class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></td></tr>';

  if (profileUser.quizzes && Object.keys(profileUser.quizzes).length > 0) {
    let i = 1;
    quizList.innerHTML = "";
    
    const sortedQuizzes = Object.values(profileUser.quizzes)
                            .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

    sortedQuizzes.forEach(q => {
      const quizName = q.quizTitle || q.quizId || "Quiz sans titre";
      const score = q.score ?? 0;
      const total = q.totalPointsPossible ?? 0;
      let dateStr = "N/A";
      if (q.completedAt) {
        dateStr = new Date(q.completedAt).toLocaleString('fr-FR');
      }
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <th scope="row" class="text-center">${i}</th>
        <td>${quizName}</td>
        <td class="text-center">${score}/${total}</td>
        <td class="text-center">${dateStr}</td>
      `;
      quizList.appendChild(row);
      i++;
    });
  } else {
    quizList.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aucun quiz passé.</td></tr>`;
  }
}

// -----------------------------------------------------------------
// 🔹 Gestion avatars (✅ SIMPLIFIÉ pour Bootstrap)
// -----------------------------------------------------------------
async function setupAvatar(profileUser, isEditMode) {
  const changeAvatarBtn = document.getElementById("changeAvatarBtn");
  
  // Vérifie si le bouton ET l'instance du modal existent
  if (!changeAvatarBtn || !avatarModalInstance) {
      if (!avatarModalInstance) {
          console.warn("L'instance du Modal n'a pas pu être créée.");
      }
      return;
  }
  
  // Ouvre le modal (uniquement via Bootstrap)
  changeAvatarBtn.addEventListener("click", () => {
    avatarModalInstance.show(); // ⭐️ Méthode Bootstrap
  });

  // ❌ SUPPRIMÉ : Plus besoin de gérer les clics de fermeture manuels.
  // Bootstrap (via data-bs-dismiss="modal") s'en charge.

  // --- Chargement des avatars ---
  if (!avatarsGrid) return;
  avatarsGrid.innerHTML = `<div class="spinner-border spinner-border-sm"></div>`;

  const avatarsSnap = await get(ref(database, "avatars"));
  if (!avatarsSnap.exists()) {
      avatarsGrid.innerHTML = "<p class='text-danger'>Aucun avatar à charger.</p>";
      return;
  }

  const avatars = avatarsSnap.val();
  avatarsGrid.innerHTML = "";

  Object.entries(avatars).forEach(([key, url]) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = key;
    img.classList.add("avatar-choice");
    // (Les styles .avatar-choice sont dans le CSS)

    // Cliquer pour sélectionner
    img.addEventListener("click", async () => {
      try {
        showLoader("Mise à jour...");
        await update(ref(database, "users/" + profileUser.id), { avatar: url });

        profileUser.avatar = url;
        const authUser = await checkAuth(false);
        if(authUser && authUser.id.toString() === profileUser.id.toString()) {
            localStorage.setItem("currentUser", JSON.stringify(profileUser));
        }

        const profileAvatarEl = document.getElementById("profileAvatar");
        if (profileAvatarEl) profileAvatarEl.src = url;
        const navAvatarEl = document.getElementById("navAvatar");
        if (navAvatarEl) navAvatarEl.src = url;

        // Fermer le modal (uniquement via Bootstrap)
        avatarModalInstance.hide();
        // ❌ SUPPRIMÉ : Le fallback manuel (style.display)

      } catch (err) {
        console.error("Erreur avatar :", err);
        loaderText.textContent = "Erreur !";
        setTimeout(hideLoader, 2000); 
      } finally {
        if (!loaderText.textContent.startsWith("Erreur")) {
           hideLoader();
        } else {
           setTimeout(() => { loaderText.textContent = "Chargement..."; hideLoader(); }, 2100);
        }
      }
    });
    avatarsGrid.appendChild(img);
  });
}

// -----------------------------------------------------------------
// 🔹 Fonction principale (Inchangée)
// -----------------------------------------------------------------
async function main() {
    showProfileSkeleton(); // Affiche le skeleton au début
  
  try {
    const currentUser = await checkAuth(true);
    if (!currentUser) throw new Error("Utilisateur non connecté");

    const params = new URLSearchParams(window.location.search);
    const profileIdParam = params.get("id");
    const currentUserId = currentUser.id;

    const profileIdToLoad = profileIdParam || currentUserId;
    const isEditMode = (profileIdToLoad.toString() == currentUserId.toString());

    const snapshot = await get(ref(database, "users/" + profileIdToLoad));
    
    if (!snapshot.exists()) {
        throw new Error("Profil utilisateur introuvable.");
    }
    
    let profileUser = snapshot.val();
    profileUser.id = profileIdToLoad;

    if (isEditMode) {
        localStorage.setItem("currentUser", JSON.stringify(profileUser));
    }

    // Affiche les infos (avatar, nom, groupe)
    const renderSuccess = renderProfile(profileUser, isEditMode);
    
    if(renderSuccess) {
        // Si l'affichage du profil a réussi, charge le reste
        await fillQuizzes(profileUser);
        await setupAvatar(profileUser, isEditMode);
    } 

  } catch (err) {
    console.error("Erreur dans main():", err);
    if (profileCard) {
        profileCard.innerHTML = `<div class="alert alert-danger text-center">${err.message}</div>`;
    }
  }
}

main();