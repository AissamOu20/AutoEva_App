// ✅ AJOUT: 'update' est nécessaire pour changer le statut 'isActive'
import { database, ref, get, update, set } from "./db/firebase-config.js";

export async function getCurrentUser(forceRefresh = false) {
    const user = localStorage.getItem("currentUser");
    if (!user) return null;

    let currentUser = JSON.parse(user);

    if (forceRefresh) {
        // Aller chercher les données réelles dans Firebase
        const snapshot = await get(ref(database, "users/" + currentUser.id));
        if (snapshot.exists()) {
            currentUser = snapshot.val();
            // Assurez-vous que l'ID (qui est la clé/username) est préservé
            currentUser.id = snapshot.key; 
            
            // Mettre à jour localStorage avec les données récentes
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }
    }

    return currentUser;
}

export async function checkAuth(redirectToLogin = true, forceRefresh = false) {
    const user = await getCurrentUser(forceRefresh);
    if (!user && redirectToLogin) {
        // Si l'utilisateur n'est pas trouvé ET qu'on demande la redirection
        window.location.href = "/"; // Redirige vers la page de login (index.html)
        return null;
    }
    return user;
}

/**
 * ✅ NOUVELLE FONCTION: Gère la connexion
 * Tente de connecter l'utilisateur, vérifie son mdp,
 * et met à jour son statut 'isActive' sur 'active'.
 */
export async function loginUser(username, password) {
    // 1. Récupérer l'utilisateur par son 'username' (qui est l'ID/clé)
    const userRef = ref(database, "users/" + username);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
        throw new Error("Utilisateur non trouvé.");
    }

    let userData = snapshot.val();
    
    // 2. Vérifier le mot de passe
    // ⚠️ ATTENTION : C'est très non sécurisé. Voir la note à la fin.
    if (userData.password !== password) {
         throw new Error("Mot de passe incorrect.");
    }

    // 3. Mettre à jour le statut 'isActive' dans Firebase
    try {
        await update(userRef, {
            isActive: true // ou 'true' si c'est un booléen
        });
    } catch (updateError) {
        console.warn("Échec de la mise à jour du statut 'isActive'", updateError);
        // On peut choisir de continuer même si cela échoue
    }

    // 4. Préparer et stocker l'utilisateur localement
    userData.id = username; // S'assurer que l'ID est défini
    localStorage.setItem("currentUser", JSON.stringify(userData));

    return userData;
}


/**
 * ✅ MODIFIÉ: Gère la déconnexion
 * Met à jour 'isActive' sur 'inactive' AVANT de supprimer l'utilisateur local.
 */
export async function logout() {
    // D'abord, récupérer l'utilisateur actuel pour connaître son ID
    const user = await getCurrentUser(false); 

    if (user && user.id) {
        try {
            // Mettre à jour le statut 'isActive' sur 'inactive'
            const userRef = ref(database, "users/" + user.id);
            await update(userRef, {
                isActive: false // ou 'false'
            });
        } catch (updateError) {
            console.warn("Échec de la mise à jour du statut 'isActive' lors de la déconnexion", updateError);
        }
    }

    // Ensuite, vider le localStorage et rediriger
    localStorage.removeItem("currentUser");
    window.location.href = "AutoEva_App/";
}