/* ======================== */
/* 🦶 footer.js
/* Gère l'injection du footer
/* ET met à jour le lien "Mon Profil"
/* avec l'ID de l'utilisateur.
/* ======================== */

// 🔹 Import (pour récupérer l'ID de l'utilisateur)
// ❗️ Assurez-vous que le chemin vers 'user.js' est correct
import { getCurrentUser } from './user.js'; 

// 1. Contenu HTML du Footer
// ❗️ J'ai ajouté un id="footerProfileLink" pour cibler le lien
const footerHTML = `
  <div class="footer-container container"> 
    <div class="footer-section about"> 
      <h4>À propos d'AutoEva</h4>
      <p>Votre plateforme d'évaluation et de suivi des compétences techniques. Simple, efficace et adaptée à vos besoins.</p>
    </div>

    <div class="footer-section links"> 
      <h4>Liens rapides</h4>
      <ul>
        <li><a href="../student/dashboard.html">Tableau de Bord</a></li> 
        <li><a href="../student/all-quiz.html">Liste des Quiz</a></li> 
        
        <li><a id="footerProfileLink" href="../student/profile.html">Mon Profil</a></li> 
      
      </ul>
    </div>

    <div class="footer-section contact"> 
      <h4>Contactez-nous</h4>
      <p><i class="bi bi-envelope-fill me-2"></i>support@autoeva.com</p> 
      <p><i class="bi bi-telephone-fill me-2"></i>+212 600 000 000</p>
    </div>
  </div>

  <div class="footer-bottom">
    <div class="container"> 
      &copy; 2025 AutoEva. Tous droits réservés.
    </div>
  </div>
`;

// 2. Fonction pour injecter le footer
function injectFooter() {
  const footerElement = document.getElementById("footer");
  if (!footerElement) {
    console.warn("Élément #footer introuvable. Le footer ne sera pas chargé.");
    return;
  }
  
  footerElement.className = "app-footer"; // Ajoute la classe principale
  footerElement.innerHTML = footerHTML;
  
  // 3. Une fois le HTML injecté, mettre à jour le lien
  updateProfileLink();
}

/**
 * ✅ NOUVELLE FONCTION
 * Met à jour le lien "Mon Profil" avec l'ID de l'utilisateur
 */
async function updateProfileLink() {
  const profileLink = document.getElementById("footerProfileLink");
  if (!profileLink) return; // Sécurité

  try {
    // Récupère l'utilisateur (depuis localStorage ou DB)
    const user = await getCurrentUser(); 
    
    if (user && user.id) {
      // Met à jour le lien
      profileLink.href = `../student/profile.html?id=${user.id}`;
    } else {
      // Laisse le lien par défaut si l'utilisateur n'est pas trouvé
      console.warn("Impossible de récupérer l'ID utilisateur pour le lien du footer.");
    }
  } catch (error) {
    console.error("Erreur (footer.js - updateProfileLink):", error);
  }
}

// 4. Exécution
// S'assure que le DOM est prêt, puis injecte le footer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooter);
} else {
    injectFooter();
}