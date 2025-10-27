import { database } from "./firebase-node.js"; // attention au chemin
import { ref, set } from "firebase/database";

// Avatars locaux
const totalAvatars = 6;
const avatarsData = {};

for (let i = 1; i <= totalAvatars; i++) {
  avatarsData[i] = `/assets/avatars/avatar${i}.png`;
}

const avatarsRef = ref(database, "avatars");

set(avatarsRef, avatarsData)
  .then(() => console.log("✅ Avatars ajoutés dans Firebase Database !"))
  .catch(err => console.error("❌ Erreur :", err));
