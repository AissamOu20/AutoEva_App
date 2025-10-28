// ✅ CORRIGÉ : Le chemin remonte de 'js/' à 'assets/' puis entre 'js/student/'
// (Ou ajustez si 'navbar-student.js' est ailleurs)
import { checkAuth, logout } from './user.js'; 

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("navbar");

  // 1. 🔹 Vérifier l'authentification d'abord 🔹
  const user = await checkAuth(true); 

  if (!user) {
    return; 
  }

  // 2. 🔹 Charger le HTML de la Navbar 🔹
  try {
    // ✅ CORRIGÉ : Ajout de la racine du projet '/AutoEva_App'
    const response = await fetch("/AutoEva_App/components/navbar-student.html");
    if (!response.ok) {
        throw new Error(`Erreur: ${response.status} - Impossible de charger navbar-student.html`);
    }
    container.innerHTML = await response.text();
  } catch (err) {
    console.error("Échec du chargement de la navbar:", err);
    container.innerHTML = `<p class="text-danger text-center">Erreur chargement navbar</p>`;
    return; 
  }

  // 3. 🔹 Afficher le nom et l'avatar (l'utilisateur existe forcément ici) 🔹
  document.getElementById("usernameDisplay").textContent = user.username;
  // ✅ CORRIGÉ : Ajout de la racine du projet '/AutoEva_App' au chemin de l'avatar
  document.getElementById("navAvatar").src = user.avatar || "/AutoEva_App/assets/img/user.png";

  // 4. 🔹 Ajouter le lien vers son profil avec son ID 🔹
  const profileLink = document.getElementById("profileLink");
  if (profileLink) {
    // ✅ CORRIGÉ : Ajout de la racine du projet '/AutoEva_App'
    profileLink.href = `/AutoEva_App/student/profile.html?id=${user.id}`;
  }

  // 5. 🔹 Gestion du logout (MODIFIÉ) 🔹
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logout(); 
    });
  }
});