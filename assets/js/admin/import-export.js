// ===============================
// 📦 importExport.js
// ===============================

// ✅ Import Firebase (Realtime Database)
import { database, ref, get, set, update, push } from "../db/firebase-config.js";
// (On suppose que XLSX et bootstrap sont chargés globalement ou via d'autres scripts)

// ------------------------------------
// 🔹 FONCTION D'INITIALISATION (Exportée)
// ------------------------------------
/**
 * Initialise la section Import/Export.
 * (Appelée par dashboard.js)
 * @param {Object} user L'objet utilisateur admin (pour l'historique)
 */
export function initImportExport(user) {
    console.log("Initialisation du module Import/Export...");

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

    // ======== Loader Overlay (créé/vérifié dynamiquement) ========
    let overlay = document.getElementById("importOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
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
    }
    
    // ======== Variables ========
    let selectedFile = null;
    let bcryptInstance = null; // Stocke l'instance bcrypt

    // ======== Util: charger bcryptjs dynamiquement (une seule fois) ========
    async function getBcrypt() {
        if (bcryptInstance) return bcryptInstance; // Déjà chargé
        if (window.dcodeIO && window.dcodeIO.bcrypt) {
            bcryptInstance = window.dcodeIO.bcrypt;
            return bcryptInstance;
        }
        
        return new Promise((resolve, reject) => {
            const url = "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";
            const s = document.createElement("script");
            s.src = url;
            s.onload = () => {
            if (window.dcodeIO && window.dcodeIO.bcrypt) {
                bcryptInstance = window.dcodeIO.bcrypt;
                resolve(bcryptInstance);
            } else {
                reject(new Error("bcrypt chargé mais introuvable (dcodeIO.bcrypt)."));
            }
            };
            s.onerror = (e) => reject(new Error("Échec chargement bcryptjs : " + e.message));
            document.head.appendChild(s);
        });
    }

    // ======== Gestion Fichiers (Drag/Drop/Select) ========
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

    // ======== Écouteurs d'événements ========
    chooseFileBtn.addEventListener("click", () => importFile.click());

    clearFileBtn.addEventListener("click", () => {
        selectedFile = null;
        importFile.value = "";
        fileNameDisplay.innerText = "Glissez votre fichier ici ou cliquez pour le sélectionner";
        showToast("Fichier réinitialisé", "warning");
    });

    importFile.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));

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

    // ======== Écouteur Principal: CONFIRMATION IMPORTATION ========
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
                // 🧠 Lecture du fichier
                if (ext === "json") {
                    data = JSON.parse(e.target.result);
                } else if (["xls", "xlsx"].includes(ext)) {
                    // Assurez-vous que XLSX est chargé globalement
                    if (typeof XLSX === 'undefined') throw new Error("La librairie XLSX n'est pas chargée.");
                    const wb = XLSX.read(e.target.result, { type: "binary" });
                    const sheetName = wb.SheetNames[0];
                    data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
                } else if (ext === "csv") {
                    data = parseCSV(e.target.result);
                } else {
                    throw new Error("Format non pris en charge");
                }
                
                // 🔍 Vérification des colonnes
                const expectedColumnsMap = {
                    questions: ["id_question", "id_quiz", "question", "type", "options", "reponse", "points"],
                    users: ["id", "username", "nom", "prenom", "group", "role", "password"], // 'password' est clé
                    quizzes: ["id_quiz", "titre_quiz", "categorie", "niveau", "questionsIds"]
                };
                const expectedColumns = expectedColumnsMap[type] || [];
                
                if (data.length === 0) {
                    return showToast("Le fichier est vide.", "danger");
                }

                const columns = Object.keys(data[0] || {});
                const missing = expectedColumns.filter(c => !columns.includes(c));
                
                if (missing.length > 0) {
                    showToast(`Avertissement: Colonnes manquantes : ${missing.join(", ")}`, "warning");
                    const criticalMissing = (type === "quizzes" && !columns.includes("id_quiz")) ||
                                            (type === "users" && !columns.includes("id")) ||
                                            (type === "questions" && !columns.includes("id_question"));
                    if (criticalMissing) {
                        return showToast(`Erreur: Colonne ID critique manquante.`, "danger");
                    }
                }

                // 🧱 Loader
                overlay.style.display = "flex";
                const progressBar = document.getElementById("progressBar");
                const progressText = document.getElementById("progressText");
                progressBar.style.width = "0%";
                progressText.textContent = "Importation en cours... 0%";

                // ⚙️ Récupération données existantes (pour 'questions')
                let compteur = 1;
                let existingQuestions = {};
                if (type === "questions") {
                    const snapshot = await get(ref(database, "questions"));
                    if (snapshot.exists()) {
                        existingQuestions = snapshot.val();
                        // Utiliser push() key est mieux, mais on suit votre logique de compteur
                        const ids = Object.keys(existingQuestions).map(id => parseInt(id.replace('q_','')));
                        if (ids.length > 0) compteur = Math.max(...ids.filter(Number.isFinite)) + 1;
                    }
                }
            
                // ===== Hachage des mots de passe (si type="users") =====
                if (type === "users") {
                    try {
                        const bcrypt = await getBcrypt(); // Utilise la fonction wrapper
                        for (let i = 0; i < data.length; i++) {
                            const user = data[i];
                            if (!user.password && user.motdepasse) user.password = user.motdepasse; // Alias
                            
                            if (user.password && user.password.toString().trim() !== "") {
                                const pwStr = user.password.toString();
                                // Ne hache que si ce n'est pas déjà un hash bcrypt
                                if (!/^\$2[abyx]\$/.test(pwStr)) { 
                                    progressText.textContent = `Hachage des mots de passe... ${i + 1}/${data.length}`;
                                    try {
                                        user.password = await bcrypt.hash(pwStr, 10);
                                    } catch (hashErr) {
                                        console.error("Erreur hash:", hashErr);
                                        user.password = ""; // Sécurité: ne pas importer un mdp clair échoué
                                    }
                                }
                            }
                            const hashPercent = Math.round(((i + 1) / data.length) * 40); // 0% -> 40%
                            progressBar.style.width = hashPercent + "%";
                        }
                    } catch (bcryptErr) {
                        console.error("Impossible de charger bcrypt :", bcryptErr);
                        overlay.style.display = "none";
                        return showToast("Erreur: impossible de charger bcrypt pour hachage.", "danger");
                    }
                }

                // 📥 Importation des données
                let importedCount = 0;
                let skippedCount = 0;

                for (let i = 0; i < data.length; i++) {
                    const item = data[i];

                    // Nettoyage et calculs
                    (expectedColumns).forEach(key => {
                        if (item[key] === undefined || item[key] === null) item[key] = "";
                    });
                    
                    // --- Nettoyage des types (tableaux, booléens) ---
                    for (let key in item) {
                        if (typeof item[key] === "string" && item[key].trim().startsWith("[") && item[key].trim().endsWith("]")) {
                            try { item[key] = JSON.parse(item[key]); } catch {}
                        }
                        if (key === "isActive") {
                            item[key] = (item[key] === true || item[key] === "true" || item[key] === 1 || item[key] === "1" || item[key] === "active");
                        }
                    }

                    // --- Calcul totalQuestions (si quizzes) ---
                    if (type === "quizzes") {
                        if (Array.isArray(item.questionsIds)) {
                            item.totalQuestions = item.questionsIds.length;
                        } else {
                            item.totalQuestions = 0;
                            if (item.questionsIds === "") item.questionsIds = [];
                        }
                    }
                    
                    // --- Vérification doublons (si questions) ---
                    if (type === "questions") {
                        const exists = Object.values(existingQuestions).some(q =>
                            q.id_question === item.id_question || (item.question && q.question && q.question.trim() === item.question.trim())
                        );
                        if (exists) {
                            skippedCount++;
                            continue; // ⛔ Doublon
                        }
                    }

                    // --- Logique d'enregistrement de l'ID ---
                    let id;
                    if (type === "questions") {
                        // Préférer l'ID du fichier s'il est unique, sinon le compteur
                        const fileQId = item.id_question;
                        if(fileQId && !existingQuestions[fileQId]) {
                             id = fileQId;
                             existingQuestions[fileQId] = item; // Ajoute au cache
                        } else {
                             id = `q_${compteur}`; // Préfixe pour éviter collisions
                             item.id_question = id; // Met à jour l'item
                             compteur++;
                        }
                    } else if (type === "quizzes") {
                        id = item.id_quiz || item.quiz_id;
                    } else if (type === "users") {
                        id = item.id;
                    } else {
                        id = item.id || push(ref(database, type)).key; // Fallback sécurisé
                    }

                    if (!id || id.toString().trim() === "") {
                        console.warn(`Item ignoré: ID non trouvé ou invalide pour le type '${type}'.`, item);
                        skippedCount++;
                        continue; // ⛔ ID Manquant
                    }
                    
                    // 🗂️ Enregistrement Firebase
                    await set(ref(database, `${type}/${id}`), item);
                    importedCount++;

                    // 🔄 Progression (40% -> 100%)
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
                if (type === "questions") await updateNombreQuestion(data); 

                showToast(`Importation réussie : ${importedCount} ajoutées, ${skippedCount} ignorées.`, "success");
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

    // ======== Écouteur Principal: EXPORTATION ========
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

            if (format === "json") {
                downloadFile(JSON.stringify(data, null, 2), fileName, "application/json");
            } else if (format === "csv") {
                downloadFile(convertToCSV(data), fileName, "text/csv");
            } else if (format === "xlsx") {
                if (typeof XLSX === 'undefined') throw new Error("La librairie XLSX n'est pas chargée.");
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

    // ======== OUTILS (Fonctions imbriquées) ========
    
    function parseCSV(text) {
        const lines = text.split("\n").map(l => l.trim()).filter(l => l);
        if(lines.length < 2) return [];
        const headers = lines[0].split(",").map(h => h.trim());
        return lines.slice(1).map(line => {
            // Gère les virgules dans les champs entre guillemets (basique)
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return headers.reduce((obj, key, i) => {
                let val = (values[i] || "").trim();
                // Nettoie les guillemets
                if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
                obj[key] = val;
                return obj;
            }, {});
        });
    }

    function convertToCSV(data) {
        const flatData = flattenData(data);
        if(flatData.length === 0) return "";
        
        const headers = Object.keys(flatData[0]).join(",");
        const rows = flatData.map(obj => 
            Object.values(obj).map(val => {
                let str = String(val).replace(/"/g, '""'); // Échappe les guillemets
                if (str.includes(',')) str = `"${str}"`; // Met entre guillemets si contient une virgule
                return str;
            }).join(",")
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
        const now = new Date().toLocaleString('fr-FR');
        const row = `
        <tr>
            <td>${now}</td>
            <td>${type}</td>
            <td>${action}</td>
            <td>${file}</td>
            <td>${user.username || 'Admin'}</td> 
        </tr>`;
        if (importExportHistory.querySelector("td[colspan='5']")) {
            importExportHistory.innerHTML = row;
        } else {
            importExportHistory.insertAdjacentHTML('afterbegin', row); // Ajoute en haut
        }
    }

    // (Votre fonction showToast est déjà définie dans le HTML, 
    // mais la redéfinir ici est plus robuste si elle n'est pas globale)
    function showToast(message, type = "info") {
        // Simple fallback au cas où le toast global n'existe pas
        console.log(`[${type}] ${message}`);
        // Idéalement, utilisez votre 'showAlerts' importé s'il est standardisé
        // showAlert(message, type);
        
        // --- Utilisation de votre code de Toast (adapté) ---
        let toastContainer = document.querySelector(".toast-container.position-fixed");
        if (!toastContainer) {
             toastContainer = document.createElement('div');
             toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
             toastContainer.style.zIndex = "2100"; // Au-dessus du loader
             document.body.appendChild(toastContainer);
        }
        
        const colors = { success: "#4CAF50", danger: "#E53935", warning: "#FBC02D", info: "#2196F3" };
        const toast = document.createElement("div");
        toast.className = "toast-message shadow-lg text-white p-3 mb-2 rounded-4 text-center fw-semibold show";
        toast.style.backgroundColor = colors[type] || colors.info;
        toast.style.transition = "opacity 0.4s ease";
        toast.style.opacity = "1";
        toast.innerText = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => { 
            toast.style.opacity = "0"; 
            setTimeout(() => toast.remove(), 400); 
        }, 3000);
    }

    function flattenData(data) {
        return data.map(item => {
            const flatItem = {};
            for (let key in item) {
                if (typeof item[key] === "object" && item[key] !== null) {
                    flatItem[key] = JSON.stringify(item[key]);
                } else {
                    flatItem[key] = item[key];
                }
            }
            return flatItem;
        });
    }

    async function updateGroups(data) {
        // 1️⃣ Mettre à jour / créer les groupes
        const groupsRef = ref(database, "groups");
        const groupsSnapshot = await get(groupsRef);
        const groups = groupsSnapshot.exists() ? groupsSnapshot.val() : {};

        for (let student of data) {
            if (!student.group) continue;
            
            const groupName = student.group;
            if (!groups[groupName]) {
                // Créer un nouveau groupe s'il n'existe pas
                groups[groupName] = {
                    nom: groupName,
                    total_points: 0,
                    etudiants: []
                };
            }
            
            // Mettre à jour les infos du groupe
            if (!Array.isArray(groups[groupName].etudiants)) groups[groupName].etudiants = [];
            if (!groups[groupName].etudiants.includes(student.id)) {
                groups[groupName].etudiants.push(student.id);
            }
            // (Note: La logique de points est mieux gérée par un recalcul total)
        }

        // 2️⃣ Recalculer les points et le classement (plus fiable)
        const usersSnapshot = await get(ref(database, "users"));
        if (!usersSnapshot.exists()) return; // Ne peut pas calculer sans utilisateurs
        
        const allUsers = usersSnapshot.val();
        
        // Réinitialiser les points/étudiants avant de recalculer
        for (let groupName in groups) {
            groups[groupName].total_points = 0;
            groups[groupName].etudiants = [];
        }

        // Recalculer
        for (let userId in allUsers) {
            const user = allUsers[userId];
            if (user.role === 'student' && user.group && groups[user.group]) {
                groups[user.group].total_points += (user.totalPoints || 0);
                groups[user.group].etudiants.push(user.id);
            }
        }
        
        const groupList = Object.values(groups);
        groupList.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

        // Appliquer le rang
        groupList.forEach((group, index) => {
            groups[group.nom].rang = index + 1;
        });

        // 💾 Enregistrer tous les groupes mis à jour
        await set(groupsRef, groups);
    }

    async function updateNombreQuestion(data) {
        try {
            const quizQuestionsMap = {};

            // 1️⃣ Organiser les id_question par id_quiz (nouvelles données)
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
                console.warn("Aucun quiz trouvé pour mise à jour.");
                return;
            }
            const quizzes = snapshot.val();
            const updates = {}; // Pour mise à jour groupée

            // 3️⃣ Parcourir chaque quiz concerné
            for (const quizId in quizQuestionsMap) {
                const quizData = quizzes[quizId];
                if (!quizData) {
                    console.warn(`⚠️ Quiz ${quizId} introuvable dans la base.`);
                    continue;
                }

                // 🧩 Fusionner les IDs (anciens + nouveaux)
                const existingIds = Array.isArray(quizData.questionsIds) ? quizData.questionsIds : [];
                const newIds = quizQuestionsMap[quizId];
                const mergedIds = Array.from(new Set([...existingIds, ...newIds]));
                const totalQuestions = mergedIds.length;

                // 💾 Préparer les changements
                updates[`quizzes/${quizId}/questionsIds`] = mergedIds;
                updates[`quizzes/${quizId}/totalQuestions`] = totalQuestions;
                
                console.log(`✅ Quiz ${quizId} préparé (${totalQuestions} questions).`);
            }

            // 4. Appliquer toutes les mises à jour en une fois
            if(Object.keys(updates).length > 0) {
                 await update(ref(database), updates);
                 showToast("Mise à jour des quiz terminée ✅", "success");
            }

        } catch (error) {
            console.error("❌ Erreur updateNombreQuestion:", error);
            showToast("Erreur lors de la mise à jour des quiz : " + error.message, "danger");
        }
    }

} // ====== Fin de initImportExport ======