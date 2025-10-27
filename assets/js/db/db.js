import { ref, get,set } from "firebase/database";
import { database } from "./firebase-node.js"; // attention au chemin
 

const adminId = 120; // par exemple timestamp comme ID

const adminData = {
  username: "admin1",
  password: "123456",
  nom: "John",
  prenom: "Doe",
  role: "admin",
  isActive: true
  // aucun avatar ici
};

// Référence vers la nouvelle entrée
const adminRef = ref(database, `users/${adminId}`);

set(adminRef, adminData)
  .then(() => {
    console.log("Admin ajouté avec succès !");
  })
  .catch((err) => {
    console.error("Erreur lors de l'ajout de l'admin :", err);
  });