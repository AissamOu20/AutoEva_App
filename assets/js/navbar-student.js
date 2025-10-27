// ✅ AJOUT : Importation des fonctions centralisées
// Assurez-vous que le chemin vers user.js est correct depuis la racine
import { checkAuth, logout } from './user.js'; 

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("navbar");

  // 1. 🔹 Vérifier l'authentification d'abord 🔹
  // checkAuth(true) gère la redirection si l'utilisateur est absent
  const user = await checkAuth(true); 

  if (!user) {
    // Si checkAuth redirige, on arrête l'exécution ici
    return; 
  }

  // 2. 🔹 Charger le HTML de la Navbar 🔹
  // Mettez ce code dans un try...catch au cas où le fichier HTML est introuvable
  try {
    const response = await fetch("/components/navbar-student.html");
    if (!response.ok) {
        throw new Error(`Erreur: ${response.status} - Impossible de charger navbar-student.html`);
    }
    container.innerHTML = await response.text();
  } catch (err) {
    console.error("Échec du chargement de la navbar:", err);
    container.innerHTML = `<p class="text-danger text-center">Erreur chargement navbar</p>`;
    // Si la navbar ne charge pas, on ne peut pas ajouter le listener de logout, etc.
    return; 
  }

  // 3. 🔹 Afficher le nom et l'avatar (l'utilisateur existe forcément ici) 🔹
  document.getElementById("usernameDisplay").textContent = user.username;
  document.getElementById("navAvatar").src = user.avatar || "/assets/img/user.png";

  // 4. 🔹 Ajouter le lien vers son profil avec son ID 🔹
  const profileLink = document.getElementById("profileLink");
  if (profileLink) {
    profileLink.href = `/student/profile.html?id=${user.id}`;
  }

  // 5. 🔹 Gestion du logout (MODIFIÉ) 🔹
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      // ✅ Utilise la fonction logout() qui met à jour "isActive"
      await logout(); 
    });
  }
});