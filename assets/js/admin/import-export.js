// ===============================
// 📦 importExport.js
// ===============================

// ✅ Import Firebase (Realtime Database)
// ⭐️ AJOUTÉ: serverTimestamp pour l'historique
import { database, ref, get, set, update, push, serverTimestamp, query, onValue, orderByChild, limitToLast } from "../db/firebase-config.js";
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

    // ⭐️ NOUVEAU: Chargement de l'historique depuis Firebase
    if (importExportHistory) {
        loadHistory();
    }
    
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
                    users: ["id", "username", "nom", "prenom", "group", "role", "password"],
                    // ⭐️ CORRIGÉ: Colonnes cohérentes avec quiz-settings.js
                    quizzes: ["id_quiz", "titre_quiz", "categorie", "niveau", "version" ]
                };
                const expectedColumns = expectedColumnsMap[type] || [];
                
                if (data.length === 0) {
                    return showToast("Le fichier est vide.", "danger");
                }

                const columns = Object.keys(data[0] || {});
                const missing = expectedColumns.filter(c => !columns.includes(c));
                
                // =================================================================
                // ⭐️ MODIFIÉ: L'importation est bloquée si UNE SEULE colonne est manquante
                // =================================================================
                if (missing.length > 0) {
                    // Fini l'avertissement, c'est une erreur bloquante.
                    console.error("Importation bloquée. Colonnes manquantes:", missing);
                    return showToast(`Erreur: Importation bloquée. Colonnes manquantes : ${missing.join(", ")}`, "danger");
                    
                    // L'ancienne logique de "criticalMissing" est supprimée
                }
                // =================================================================
                // ⭐️ FIN DE LA MODIFICATION
                // =================================================================

                // 🧱 Loader
                overlay.style.display = "flex";
                const progressBar = document.getElementById("progressBar");
                const progressText = document.getElementById("progressText");
                progressBar.style.width = "0%";
                progressText.textContent = "Importation en cours... 0%";

                // ⚙️ Récupération données existantes (pour 'questions' ET 'quizzes')
                let existingQuestions = {};
                let existingQuizzes = {}; 

                if (type === "questions") {
                    const snapshot = await get(ref(database, "questions"));
                    if (snapshot.exists()) {
                        existingQuestions = snapshot.val();
                    }
                }
                if (type === "quizzes") {
                    const snapshot = await get(ref(database, "quizzes"));
                    if (snapshot.exists()) {
                        existingQuizzes = snapshot.val();
                    }
                }
            
                // ===== Hachage des mots de passe (si type="users") =====
                if (type === "users") {
                    // ... (Logique de hachage inchangée) ...
                    try {
                        const bcrypt = await getBcrypt(); 
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

                // 📥 Préparation de l'importation
                const updates = {}; 
                let importedCount = 0;
                let skippedCount = 0;

                for (let i = 0; i < data.length; i++) {
                    const item = data[i];

                    // Nettoyage et calculs
                    // ⭐️ Note: Ce 'forEach' n'est plus nécessaire car on a déjà validé
                    // que toutes les colonnes sont présentes. On le garde pour
                    // initialiser les valeurs 'undefined' ou 'null' en ""
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
                        // Le totalPoints sera calculé par updateNombreQuestion après l'import
                    }
                    
                    // --- Logique d'enregistrement de l'ID ---
                    let id; // La clé du document
                    let path; // Le chemin dans la DB

                    if (type === "questions") {
                        // (Logique de push() ID inchangée)
                        const exists = Object.values(existingQuestions).some(q =>
                            q.id_question === item.id_question || (item.question && q.question && q.question.trim() === item.question.trim())
                        );
                        if (exists) {
                            skippedCount++;
                            continue; // ⛔ Doublon Question
                        }
                        
                        id = push(ref(database, "questions")).key;
                        path = `questions/${id}`;
                        existingQuestions[id] = item; 
                    
                    } else if (type === "quizzes") {
                        id = item.id_quiz || item.quiz_id;
                        if (!id || id.toString().trim() === "") {
                            console.warn(`Item quiz ignoré: ID non trouvé.`, item);
                            skippedCount++;
                            continue; // ⛔ ID Manquant
                        }

                        // (Logique de non-écrasement des doublons inchangée)
                        if (existingQuizzes[id]) {
                            console.warn(`Quiz ignoré (doublon): ${id}`);
                            skippedCount++;
                            continue; // ⛔ Doublon Quiz
                        }
                        
                        path = `quizzes/${id}`;
                    
                    } else if (type === "users") {
                        id = item.id;
                         if (!id || id.toString().trim() === "") {
                            console.warn(`Item user ignoré: ID non trouvé.`, item);
                            skippedCount++;
                            continue; // ⛔ ID Manquant
                        }
                        path = `users/${id}`;
                    
                    } else {
                        skippedCount++;
                        continue;
                    }
                    
                    updates[path] = item; 
                    importedCount++;

                    // 🔄 Progression (40% -> 100%)
                    const savePercent = 40 + Math.round(((i + 1) / data.length) * 60);
                    progressBar.style.width = savePercent + "%";
                    progressText.textContent = `Importation en cours... ${Math.round(savePercent)}%`;
                }
                
                // 📥 Importation des données (en une seule fois)
                if (Object.keys(updates).length > 0) {
                    progressText.textContent = "Finalisation...";
                    progressBar.style.width = "95%";
                    await update(ref(database), updates); 
                } else {
                    progressText.textContent = "Aucune nouvelle donnée à importer.";
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
                await addHistory("Import", type, selectedFile.name);

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
        // ... (Logique d'exportation inchangée) ...
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
            await addHistory("Export", type, fileName);
        } catch (err) {
            showToast("Erreur lors de l'export : " + err.message, "danger");
        }
    });

    // ======== OUTILS (Fonctions imbriquées) ========
    
    // (Fonction loadHistory inchangée)
    function loadHistory() {
        const historyRef = query(ref(database, 'importExportHistory'), orderByChild('timestamp'), limitToLast(50));
        onValue(historyRef, (snapshot) => {
            if (!importExportHistory) return;
            importExportHistory.innerHTML = ""; 
            if (!snapshot.exists()) {
                importExportHistory.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Aucun historique.</td></tr>`;
                return;
            }
            const rows = [];
            snapshot.forEach((child) => {
                const data = child.val();
                const date = data.timestamp ? new Date(data.timestamp).toLocaleString('fr-FR') : 'Date inconnue';
                const row = `
                <tr>
                    <td>${date}</td>
                    <td>${data.type || 'N/A'}</td>
                    <td>${data.action || 'N/A'}</td>
                    <td>${data.file || 'N/A'}</td>
                    <td>${data.user || 'N/A'}</td> 
                </tr>`;
                rows.push(row); 
            });
            importExportHistory.innerHTML = rows.reverse().join('');
        });
    }
    
    // (Fonction addHistory inchangée)
    async function addHistory(action, type, file) {
        try {
            const historyRef = ref(database, 'importExportHistory');
            const newHistoryEntry = {
                action: action,
                type: type,
                file: file,
                user: user.username || 'Admin',
                timestamp: serverTimestamp() 
            };
            await push(historyRef, newHistoryEntry); 
        } catch (error) {
            console.error("Erreur sauvegarde historique:", error);
            showToast("Erreur sauvegarde historique", "danger");
        }
    }

    // (Fonction parseCSV inchangée)
    function parseCSV(text) {
        const lines = text.split("\n").map(l => l.trim()).filter(l => l);
        if(lines.length < 2) return [];
        const headers = lines[0].split(",").map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return headers.reduce((obj, key, i) => {
                let val = (values[i] || "").trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
                obj[key] = val;
                return obj;
            }, {});
        });
    }

    // (Fonction convertToCSV inchangée)
    function convertToCSV(data) {
        const flatData = flattenData(data);
        if(flatData.length === 0) return "";
        const headers = Object.keys(flatData[0]).join(",");
        const rows = flatData.map(obj => 
            Object.values(obj).map(val => {
                let str = String(val).replace(/"/g, '""');
                if (str.includes(',')) str = `"${str}"`;
                return str;
            }).join(",")
        );
        return [headers, ...rows].join("\n");
    }

    // (Fonction downloadFile inchangée)
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // (Fonction showToast inchangée)
    function showToast(message, type = "info") {
        console.log(`[${type}] ${message}`);
        let toastContainer = document.querySelector(".toast-container.position-fixed");
        if (!toastContainer) {
             toastContainer = document.createElement('div');
             toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
             toastContainer.style.zIndex = "2100"; 
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

    // (Fonction flattenData inchangée)
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

    // (Fonction updateGroups inchangée)
    async function updateGroups(data) {
        const groupsRef = ref(database, "groups");
        const groupsSnapshot = await get(groupsRef);
        const groups = groupsSnapshot.exists() ? groupsSnapshot.val() : {};
        for (let student of data) {
            if (!student.group) continue;
            const groupName = student.group;
            if (!groups[groupName]) {
                groups[groupName] = { nom: groupName, total_points: 0, etudiants: [] };
            }
            if (!Array.isArray(groups[groupName].etudiants)) groups[groupName].etudiants = [];
            if (!groups[groupName].etudiants.includes(student.id)) {
                groups[groupName].etudiants.push(student.id);
            }
        }
        const usersSnapshot = await get(ref(database, "users"));
        if (!usersSnapshot.exists()) return; 
        const allUsers = usersSnapshot.val();
        for (let groupName in groups) {
            groups[groupName].total_points = 0;
            groups[groupName].etudiants = [];
        }
        for (let userId in allUsers) {
            const user = allUsers[userId];
            if (user.role === 'student' && user.group && groups[user.group]) {
                groups[user.group].total_points += (user.totalPoints || 0);
                groups[user.group].etudiants.push(user.id);
            }
        }
        const groupList = Object.values(groups);
        groupList.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
        groupList.forEach((group, index) => {
            groups[group.nom].rang = index + 1;
        });
        await set(groupsRef, groups);
    }

    // (Fonction updateNombreQuestion inchangée)
    async function updateNombreQuestion(data) {
        try {
            const quizIdsToUpdate = new Set();
            for (const question of data) {
                if (question.id_quiz) {
                    quizIdsToUpdate.add(question.id_quiz.toString());
                }
            }
            if (quizIdsToUpdate.size === 0) {
                console.log("updateNombreQuestion: Aucune question importée, pas de recalcul.");
                return;
            }
            const quizzesRef = ref(database, "quizzes");
            const questionsRef = ref(database, "questions");
            const [quizzesSnapshot, questionsSnapshot] = await Promise.all([
                get(quizzesRef),
                get(questionsRef)
            ]);
            if (!quizzesSnapshot.exists() || !questionsSnapshot.exists()) {
                console.warn("Quizzes ou Questions introuvables. Recalcul annulé.");
                return;
            }
            const allQuizzes = quizzesSnapshot.val();
            const allQuestions = questionsSnapshot.val();
            const updates = {}; 
            for (const quizId of quizIdsToUpdate) {
                if (!allQuizzes[quizId]) {
                    console.warn(`⚠️ Quiz ${quizId} introuvable lors du recalcul.`);
                    continue;
                }
                let totalPoints = 0;
                let totalQuestions = 0;
                const questionsIds = [];
                for (const questionKey in allQuestions) { 
                    const q = allQuestions[questionKey];
                    if (q.id_quiz === quizId) {
                        totalPoints += Number(q.points) || 0;
                        totalQuestions++;
                        if (q.id_question) { 
                            questionsIds.push(q.id_question);
                        }
                    }
                }
                updates[`quizzes/${quizId}/totalPoints`] = totalPoints;
                updates[`quizzes/${quizId}/totalQuestions`] = totalQuestions;
                updates[`quizzes/${quizId}/questionsIds`] = questionsIds; 
                console.log(`✅ Quiz ${quizId} recalculé: ${totalQuestions} Qs, ${totalPoints} Pts.`);
            }
            if(Object.keys(updates).length > 0) {
                 await update(ref(database), updates);
                 showToast("Mise à jour des quiz (points/comptes) terminée ✅", "success");
            }
        } catch (error) {
            console.error("❌ Erreur updateNombreQuestion:", error);
            showToast("Erreur lors de la mise à jour des quiz : " + error.message, "danger");
        }
    }
    
} // ====== Fin de initImportExport ======