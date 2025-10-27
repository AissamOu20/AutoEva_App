// ===============================
// 📦 importExport.js
// ===============================

// ✅ Import Firebase (Realtime Database)
import { database, ref, get, set, update } from "../db/firebase-config.js";

/**
 * importExport.js
 * - Charge bcryptjs dynamiquement dans le navigateur
 * - Hache les mots de passe dans les imports de type "users"
 * - Gère l'import de 'users', 'questions', et 'quizzs' (avec id_quiz)
 * - Calcule 'totalQuestions' à partir de 'questionsIds' lors de l'import de quizzs
 * - Conserve ton UI/loader/progress existant
 */

/* ===== util: charger bcryptjs dynamiquement ===== */
async function loadBcrypt() {
  if (window.dcodeIO && window.dcodeIO.bcrypt) return window.dcodeIO.bcrypt;
  return new Promise((resolve, reject) => {
    const url = "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => {
      if (window.dcodeIO && window.dcodeIO.bcrypt) resolve(window.dcodeIO.bcrypt);
      else reject(new Error("bcrypt chargé mais introuvable (dcodeIO.bcrypt)."));
    };
    s.onerror = (e) => reject(new Error("Échec chargement bcryptjs : " + e.message));
    document.head.appendChild(s);
  });
}

document.addEventListener("DOMContentLoaded", () => {

  // ======== Éléments DOM ========
  const importType = document.getElementById("importType");
    
  const importFile = document.getElementById("importFile");
  const chooseFileBtn = document.getElementById("chooseFileBtn");
  const clearFileBtn = document.getElementById("clearFileBtn");
  const importConfirmBtn = document.getElementById("importConfirmBtn");
  const exportType = document.getElementById("exportType");
  const exportFormat = document.getElementById("exportFormat");
  const exportBtn = document.getElementById("exportBtn");
  const importExportHistory = document.getElementById("importExportHistory");
  const dropzone = document.querySelector(".import-dropzone");
  const fileNameDisplay = document.getElementById("fileNameDisplay");

  // ======== Loader Overlay (créé dynamiquement) ========
  const overlay = document.createElement("div");
  overlay.id = "importOverlay";
  overlay.style = `
    display: none; 
    position: fixed; inset: 0; 
    background: rgba(0,0,0,0.65); 
    z-index: 2000;
    align-items: center; 
    justify-content: center;
    flex-direction: column;
    color: white;
  `;
  overlay.innerHTML = `
    <div class="rounded-4 shadow-lg bg-dark p-4 text-center" style="min-width:300px;">
      <h5 id="progressText" class="mb-3">Importation en cours...</h5>
      <div style="width:100%; background:#444; border-radius:6px; overflow:hidden;">
        <div id="progressBar" style="width:0%; height:10px; background:linear-gradient(90deg,#007bff,#00d084); transition:width .3s;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let selectedFile = null;

  // ======== Bouton Choisir ========
  chooseFileBtn.addEventListener("click", () => importFile.click());

  // ======== Bouton Effacer ========
  clearFileBtn.addEventListener("click", () => {
    selectedFile = null;
    importFile.value = "";
    fileNameDisplay.innerText = "Glissez votre fichier ici ou cliquez pour le sélectionner";
    showToast("Fichier réinitialisé", "warning");
  });

  // ======== Sélection fichier ========
  importFile.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));

  // ======== Drag & Drop ========
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("border-primary");
  });

  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("border-primary"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("border-primary");
    handleFileSelection(e.dataTransfer.files[0]);
  });

  function handleFileSelection(file) {
    if (!file) return;
    const allowedExtensions = ["json", "csv", "xls", "xlsx"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      showToast("Type de fichier non supporté", "danger");
      return;
    }

    selectedFile = file;
    fileNameDisplay.innerText = file.name;
    showToast(`Fichier sélectionné : ${file.name}`, "info");
  }

  // ======== CONFIRMATION IMPORTATION ========
  importConfirmBtn.addEventListener("click", async () => {
    if (!selectedFile || !importType.value) {
      return showToast("Veuillez sélectionner un fichier et un type de données.", "danger");
    }

    const reader = new FileReader();
    const ext = selectedFile.name.split(".").pop().toLowerCase();

    reader.onload = async (e) => {
      let data;
      const type = importType.value;
      

      try {
        // 🧠 Lecture du fichier selon le format
        if (ext === "json") {
          data = JSON.parse(e.target.result);
          console.log("Données JSON lues :", data);
        } else if (["xls", "xlsx"].includes(ext)) {
          const wb = XLSX.read(e.target.result, { type: "binary" });
          const sheetName = wb.SheetNames[0];
          data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        } else if (ext === "csv") data = parseCSV(e.target.result);
        else throw new Error("Format non pris en charge");

        // 🔍 Vérification des colonnes
        const expectedColumnsMap = {
          questions: ["id_question", "id_quiz", "question", "type", "options", "reponse", "points"],
          users: ["id", "username", "nom", "prenom", "group", "role", "avatar", "isActive", "password"],
          quizzes: ["id_quiz", "titre_quiz", "categorie", "niveau", "questionsIds"] // ✅ Votre mise à jour
        };
        const expectedColumns = expectedColumnsMap[type] || [];
        
        if (data.length === 0) {
            return showToast("Le fichier est vide.", "danger");
        }

        const columns = Object.keys(data[0] || {});
        const missing = expectedColumns.filter(c => !columns.includes(c));
        
        if (missing.length > 0) {
          // Avertit si des colonnes manquent, mais bloque seulement si c'est critique
          showToast(`Avertissement: Colonnes manquantes : ${missing.join(", ")}`, "warning");
          if ((type === "quizzes" && !columns.includes("id_quiz")) ||
              (type === "users" && !columns.includes("id")) ||
              (type === "questions" && !columns.includes("id_question"))) {
            return showToast(`Erreur: Colonne ID critique manquante (${type === "quizzes" ? "id_quiz" : "id"}).`, "danger");
          }
        }

        // 🧱 Loader
        overlay.style.display = "flex";
        const progressBar = document.getElementById("progressBar");
        const progressText = document.getElementById("progressText");
        progressBar.style.width = "0%";
        progressText.textContent = "Importation en cours... 0%";

        // ⚙️ Récupération des données existantes si questions
        let compteur = 1;
        let existingQuestions = {};
        if (type === "questions") {
          const snapshot = await get(ref(database, "questions"));
          if (snapshot.exists()) {
            existingQuestions = snapshot.val();
            const ids = Object.keys(existingQuestions).map(id => parseInt(id));
            if (ids.length > 0) {
                compteur = Math.max(...ids) + 1;
            }
          }
        }
    
        // ===== If type === "users": hash passwords BEFORE saving =====
        if (type === "users") {
          try {
            const bcrypt = await loadBcrypt();
            for (let i = 0; i < data.length; i++) {
              const user = data[i];
              if (!user.password && user.motdepasse) user.password = user.motdepasse;
              if (user.password && user.password.toString().trim() !== "") {
                const pwStr = user.password.toString();
                if (!/^\$2[abyx]\$/.test(pwStr)) { 
                  progressText.textContent = `Hachage des mots de passe... ${i + 1}/${data.length}`;
                  try {
                    user.password = await bcrypt.hash(pwStr, 10);
                  } catch (hashErr) {
                    console.error("Erreur hash:", hashErr);
                    user.password = ""; 
                  }
                }
              }
              const hashPercent = Math.round(((i + 1) / data.length) * 40); 
              progressBar.style.width = hashPercent + "%";
            }
          } catch (bcryptErr) {
            console.error("Impossible de charger bcrypt :", bcryptErr);
            overlay.style.display = "none";
            return showToast("Erreur: impossible de charger bcrypt pour hachage.", "danger");
          }
        }

        // 📥 Importation des données une par une (après hachage si users)
        let importedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < data.length; i++) {
          const item = data[i];

          // Remplir les champs manquants
          (expectedColumns).forEach(key => {
            if (item[key] === undefined || item[key] === null) item[key] = "";
          });

          // -----------------------------------------------------------------
          // ⬇️ MODIFICATION 1: Calcul de totalQuestions ⬇️
          // -----------------------------------------------------------------

          // Corriger les types (tableaux encodés en string)
          for (let key in item) {
            if (typeof item[key] === "string" && item[key].trim().startsWith("[") && item[key].trim().endsWith("]")) {
              try { item[key] = JSON.parse(item[key]); } catch {}
            }
            if (key === "isActive") {
              item[key] = (item[key] === true || item[key] === "true" || item[key] === 1 || item[key] === "1");
            }
          }

          // ✅ AJOUT : Calculer totalQuestions si on importe un quiz
          if (type === "quizzes") {
              if (Array.isArray(item.questionsIds)) {
                  item.totalQuestions = item.questionsIds.length;
              } else {
                  // Si 'questionsIds' n'est pas un tableau valide (ou est vide)
                  item.totalQuestions = 0;
                  if (item.questionsIds === "") item.questionsIds = []; // Assure que c'est un tableau vide
              }
          }
          // -----------------------------------------------------------------
          // ⬆️ FIN MODIFICATION 1 ⬆️
          // -----------------------------------------------------------------


          // 🧩 Vérification des doublons (questions)
          if (type === "questions") {
            const exists = Object.values(existingQuestions).some(q =>
              q.id_question === item.id_question || (item.question && q.question && q.question.trim() === item.question.trim())
            );
            if (exists) {
              skippedCount++;
              continue; // ⛔ Passe à la suivante
            }
          }

          
          // -----------------------------------------------------------------
          // ⬇️ MODIFICATION 2: Logique d'enregistrement de l'ID ⬇️
          // -----------------------------------------------------------------
          
          // 🗂️ Enregistrement Firebase
          let id;

          if (type === "questions") {
            id = compteur; // Utilise le compteur auto-incrémenté
            compteur++;
          } else if (type === "quizzes") {
            id = item.id_quiz || item.quiz_id; // ✅ Utilise l'ID du quiz
          } else if (type === "users") {
            id = item.id; // ✅ Utilise l'ID de l'utilisateur
          } else {
            id = item.id || Date.now(); // Fallback
          }

          // ⛔ Vérification de validité de l'ID
          if (!id || id.toString().trim() === "") {
            console.warn(`Item ignoré: ID non trouvé ou invalide pour le type '${type}'.`, item);
            skippedCount++;
            continue; // ⛔ Passe à la suivante
          }

          await set(ref(database, `${type}/${id}`), item);
          importedCount++;

          // -----------------------------------------------------------------
          // ⬆️ FIN MODIFICATION 2 ⬆️
          // -----------------------------------------------------------------


          // 🔄 Progression (second phase: saving -> 40%..100%)
          const savePercent = 40 + Math.round(((i + 1) / data.length) * 60);
          progressBar.style.width = savePercent + "%";
          progressText.textContent = `Importation en cours... ${Math.round(savePercent)}%`;
        }

        // ✅ Terminé
        progressText.textContent = "Importation terminée ✅";
        progressBar.style.width = "100%";
        progressBar.style.background = "linear-gradient(90deg, #28a745, #00d084)";
        await new Promise(r => setTimeout(r, 800));
        overlay.style.display = "none";

        // 📊 Mettre à jour les dépendances
        if (type === "users") await updateGroups(data);
        // Note: updateNombreQuestion se lance (correctement) SEULEMENT si on importe des 'questions'.
        // L'import de 'quizzs' utilise le totalQuestions calculé depuis le fichier.
        if (type === "questions") await updateNombreQuestion(data); 

        showToast(`Importation réussie : ${importedCount} ajoutées, ${skippedCount} ignorées (doublons/ID manquant).`, "success");
        addHistory("Import", type, selectedFile.name);

      } catch (err) {
        overlay.style.display = "none";
        showToast("Erreur lors de l'import : " + err.message, "danger");
        console.error(err);
      }
    };

    // 📂 Lecture du fichier
    if (["xls", "xlsx"].includes(ext)) reader.readAsBinaryString(selectedFile);
    else reader.readAsText(selectedFile);
  });

  // ======== EXPORTATION ========
  exportBtn.addEventListener("click", async () => {
    if (!exportType.value) return showToast("Veuillez sélectionner un type de données à exporter.", "warning");

    const type = exportType.value;
    const format = exportFormat.value;

    try {
      const snapshot = await get(ref(database, type));
      if (!snapshot.exists()) return showToast("Aucune donnée disponible pour ce type.", "info");

      const dataObj = snapshot.val();
      const data = Object.values(dataObj);
      const fileName = `${type}_${new Date().toISOString().split("T")[0]}.${format}`;

      if (format === "json") downloadFile(JSON.stringify(data, null, 2), fileName, "application/json");
      else if (format === "csv") downloadFile(convertToCSV(data), fileName, "text/csv");
      else if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(flattenData(data));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Données");
        XLSX.writeFile(wb, fileName);
      }

      showToast(`Exportation réussie : ${fileName}`, "success");
      addHistory("Export", type, fileName);

    } catch (err) {
      showToast("Erreur lors de l'export : " + err.message, "danger");
    }
  });

  // ======== OUTILS ========
  function parseCSV(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l);
    const headers = lines[0].split(",");
    return lines.slice(1).map(line => {
      const values = line.split(",");
      return headers.reduce((obj, key, i) => ({ ...obj, [key]: values[i] }), {});
    });
  }

  function convertToCSV(data) {
    // Aplatir les données avant de convertir en CSV
    const flatData = flattenData(data);
    if(flatData.length === 0) return ""; // Gère le cas où il n'y a pas de données
    
    const headers = Object.keys(flatData[0]).join(",");
    const rows = flatData.map(obj => 
        Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") // Mettre entre guillemets
    );
    return [headers, ...rows].join("\n");
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function addHistory(action, type, file) {
    const now = new Date().toLocaleString();
    const row = `
      <tr>
        <td>${now}</td>
        <td>${type}</td>
        <td>${action}</td>
        <td>${file}</td>
        <td>Admin</td>
      </tr>`;
    if (importExportHistory.querySelector("td.text-muted")) {
        importExportHistory.innerHTML = row;
    } else {
        importExportHistory.innerHTML += row;
    }
  }

  function showToast(message, type = "info") {
    const toastContainer = document.querySelector(".toast-container");
    const colors = { success: "#4CAF50", danger: "#E53935", warning: "#FBC02D", info: "#2196F3" };
    const toast = document.createElement("div");
    toast.className = "toast-message shadow-lg text-white p-3 mb-2 rounded-4 text-center fw-semibold";
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.style.minWidth = "300px";
    toast.style.maxWidth = "500px";
    toast.style.fontSize = "1rem";
    toast.style.transition = "all 0.4s ease";
    toast.style.opacity = "0";
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "1"; }, 50);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, 3000);
  }

  function flattenData(data) {
    return data.map(item => {
      const flatItem = {};
      for (let key in item) {
        if (typeof item[key] === "object" && item[key] !== null)
          flatItem[key] = JSON.stringify(item[key]); // Convertit les tableaux/objets en JSON string
        else flatItem[key] = item[key];
      }
      return flatItem;
    });
  }

  async function updateGroups(data) {
    // 1️⃣ Mettre à jour / créer les groupes
    for (let student of data) {
      if (!student.group) continue;

      const groupRef = ref(database, `groups/${student.group}`);
      const snapshot = await get(groupRef);

      if (snapshot.exists()) {
        const group = snapshot.val();
        if (!Array.isArray(group.etudiants)) group.etudiants = [];
        if (!group.etudiants.includes(student.id)) group.etudiants.push(student.id);
        group.total_points = (group.total_points || 0) + (student.points || 0);
        await set(groupRef, group);
      } else {
        const newGroup = {
          nom: student.group,
          total_points: student.points || 0,
          etudiants: [student.id] // ✅ tableau d'étudiants
        };
        await set(groupRef, newGroup);
      }
    }

    // 2️⃣ Calculer le classement (rang)
    const groupsSnapshot = await get(ref(database, "groups"));
    if (!groupsSnapshot.exists()) return;

    const groups = groupsSnapshot.val();
    const groupList = Object.values(groups);

    // Trier par total_points décroissant
    groupList.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    // Ajouter le rang à chaque groupe
    for (let i = 0; i < groupList.length; i++) {
      groupList[i].rang = i + 1;
    }

    // Réenregistrer les groupes avec rang
    for (let group of groupList) {
      await set(ref(database, `groups/${group.nom}`), group);
    }
  }

  async function updateNombreQuestion(data) {
    try {
      // 🧠 Dictionnaire : { id_quiz: [id_question1, id_question2, ...] }
      const quizQuestionsMap = {};

      // 1️⃣ Organiser les id_question par id_quiz à partir des nouvelles données importées
      for (const question of data) {
        if (!question.id_quiz || !question.id_question) continue;

        const quizId = question.id_quiz.toString();
        if (!quizQuestionsMap[quizId]) quizQuestionsMap[quizId] = [];
        quizQuestionsMap[quizId].push(question.id_question);
      }

      // 2️⃣ Récupérer tous les quizz existants
      const quizzesRef = ref(database, "quizzes");
      const snapshot = await get(quizzesRef);
      if (!snapshot.exists()) {
        console.warn("Aucun quiz trouvé pour mise à jour du nombre de questions.");
        return;
      }

      const quizzes = snapshot.val();

      // 3️⃣ Parcourir chaque quiz concerné par l’import
      for (const quizId in quizQuestionsMap) {
        const quizRef = ref(database, `quizzes/${quizId}`);
        const quizData = quizzes[quizId];

        if (!quizData) {
          console.warn(`⚠️ Quiz ${quizId} introuvable dans la base.`);
          continue;
        }

        // 🧩 Fusionner les anciens et nouveaux IDs de questions
        const existingIds = Array.isArray(quizData.questionsIds) ? quizData.questionsIds : [];
        const newIds = quizQuestionsMap[quizId];

        // 🔁 Créer un tableau sans doublons
        const mergedIds = Array.from(new Set([...existingIds, ...newIds]));

        // 🧮 Mettre à jour le total
        const totalQuestions = mergedIds.length;

        // 💾 Enregistrer les changements
        await update(quizRef, {
          questionsIds: mergedIds,
          totalQuestions: totalQuestions
        });

        console.log(`✅ Quiz ${quizId} mis à jour (${totalQuestions} questions).`);
      }

      showToast("Mise à jour des quiz terminée ✅", "success");
    } catch (error) {
      console.error("❌ Erreur updateNombreQuestion:", error);
      showToast("Erreur lors de la mise à jour des quiz : " + error.message, "danger");
    }
  }

}); // end DOMContentLoaded