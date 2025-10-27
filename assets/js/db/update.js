import { database, ref,remove } from "./firebase-node.js";



async function deleteAllQuestions() {
  try {
    const questionsRef = ref(database, "questions"); // chemin de la collection
    await remove(questionsRef); // supprime tout
    console.log("Toutes les questions ont été supprimées ✅");
  } catch (error) {
    console.error("Erreur lors de la suppression :", error);
  }
}

// Appel de la fonction
deleteAllQuestions();
