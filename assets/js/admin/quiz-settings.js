// ===============================
// 🔹 quiz-settings.js (Gestion des Quiz et Questions)
// ===============================

// 🔹 Import Firebase
import { database, ref, onValue, set, remove, update, get, query, orderByChild, equalTo, push } from "../db/firebase-config.js";

// ---------------- Variables DOM (Quiz List) ----------------
const quizzesTableBody = document.getElementById("quizzesTable");
const searchQuizInput = document.getElementById("searchQuiz");
const paginationContainer = document.getElementById("quizPagination");
const addQuizBtn = document.getElementById("addQuizBtn");

// ---------------- Variables DOM (Add Quiz Modal) ----------------
const addQuizModalEl = document.getElementById("addQuizModal");
const addQuizModal = addQuizModalEl ? new bootstrap.Modal(addQuizModalEl) : null;
const addQuizForm = document.getElementById("addQuizForm");
const addQuizIdInput = document.getElementById("addQuizId");
const addQuizTitleInput = document.getElementById("addQuizTitle");
const addQuizCategoryInput = document.getElementById("addQuizCategory");
const addQuizLevelInput = document.getElementById("addQuizLevel");
const addQuizVersionInput = document.getElementById("addQuizVersion");

// ---------------- Variables DOM (Edit Quiz Modal) ----------------
const editQuizModalEl = document.getElementById("editQuizModal");
const editQuizModal = editQuizModalEl ? new bootstrap.Modal(editQuizModalEl) : null;
const editQuizForm = document.getElementById("editQuizForm");
const editQuizIdInput = document.getElementById("editQuizId");
const editQuizTitleInput = document.getElementById("editQuizTitle");
const editQuizCategoryInput = document.getElementById("editQuizCategory");
const editQuizLevelInput = document.getElementById("editQuizLevel");
const editQuizVersionInput = document.getElementById("editQuizVersion");

// ---------------- Variables DOM (Manage Questions Modal) ----------------
const questionsModalEl = document.getElementById("questionsModal");
const questionsModal = questionsModalEl ? new bootstrap.Modal(questionsModalEl) : null;
const questionsModalLabel = document.getElementById("questionsModalLabel");
const questionsTableBody = document.getElementById("questionsTable");
const addQuestionFromListBtn = document.getElementById("addQuestionFromListBtn");

// ---------------- Variables DOM (Add/Edit Question Form Modal) ----------------
const questionFormModalEl = document.getElementById("questionFormModal");
const questionFormModal = questionFormModalEl ? new bootstrap.Modal(questionFormModalEl) : null;
const questionForm = document.getElementById("questionForm");
const questionFormModalLabel = document.getElementById("questionFormModalLabel");
const formQuestionIdInput = document.getElementById("formQuestionId");
const formQuizIdInput = document.getElementById("formQuizId");
const formQuestionTextInput = document.getElementById("formQuestionText");
const formQuestionTypeSelect = document.getElementById("formQuestionType");
const formOptionsContainer = document.getElementById("formOptionsContainer");
const formQuestionOptionsInput = document.getElementById("formQuestionOptions");
const formAnswerContainer = document.getElementById("formAnswerContainer");
const formQuestionPointsInput = document.getElementById("formQuestionPoints");

// ---------------- State Variables ----------------
let quizzesData = {};
let quizzesArray = [];
let currentPage = 1;
const pageSize = 30; // Nombre de quiz par page
let currentQuizIdForQuestionModal = null;
let currentFirebaseKeyForQuestionModal = null;
let tempQuestionDataForEdit = null; 
let isInitialized = false; // ✅ Pour l'initialisation unique

// ---------------- Load Quizzes (Real-time) ----------------
function loadQuizzes() {
  console.log("Mise en place du listener de quiz...");
  const quizRef = ref(database, "quizzes"); 

  onValue(quizRef, (snapshot) => {
    if (snapshot.exists()) {
      quizzesData = snapshot.val();
      // Convertit l'objet en tableau et stocke la clé Firebase
      quizzesArray = Object.entries(quizzesData).map(([key, quiz]) => ({
          ...quiz,
          firebaseId: key // Stocke la clé unique (ex: "-M...abc")
      }));
    } else {
      quizzesData = {};
      quizzesArray = [];
    }
    console.log("Données Quiz mises à jour:", quizzesArray.length, "quiz");
    renderTable(); // Re-dessine la table à chaque mise à jour des données
  }, (error) => {
      console.error("Firebase Error (loadQuizzes):", error);
      if(quizzesTableBody) quizzesTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erreur de chargement.</td></tr>`;
      if(paginationContainer) paginationContainer.innerHTML = "";
  });
}

// ---------------- Render Quiz Table ----------------
function renderTable() {
  if (!quizzesTableBody) {
      console.error("Table body #quizzesTable non trouvé !");
      return;
  }

  const searchTerm = searchQuizInput?.value.toLowerCase() || "";
  let filtered = quizzesArray.filter(q =>
    (q.Titre_Quiz || q.titre_quiz || "").toLowerCase().includes(searchTerm) ||
    (q.Catégorie || q.categorie || "").toLowerCase().includes(searchTerm)
  );
  filtered.sort((a, b) => (a.Titre_Quiz || a.titre_quiz || "").localeCompare(b.Titre_Quiz || b.titre_quiz || ""));

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filtered.slice(start, end);

  quizzesTableBody.innerHTML = ""; 

  if (pageData.length === 0) {
    quizzesTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Aucun quiz trouvé ${searchTerm ? 'pour "' + searchTerm + '"' : ''}</td></tr>`;
  } else {
      pageData.forEach((quiz) => {
        const firebaseKey = quiz.firebaseId; // Clé Firebase
        const quizId = quiz.id_quiz; // ID défini (ex: "ELEC-V1")
        const row = document.createElement("tr");
        row.dataset.quizFirebaseKey = firebaseKey;

        const totalPoints = quiz.totalPoints || 0;
        const totalQuestions = quiz.totalQuestions || (Array.isArray(quiz.questionsIds) ? quiz.questionsIds.length : 0);

        row.innerHTML = `
          <td>${quiz.Titre_Quiz || quiz.titre_quiz || "Sans titre"}</td>
          <td>${totalQuestions}</td>
          <td>${quiz.Catégorie || quiz.categorie || "N/A"}</td>
          <td>${quiz.Niveau || quiz.niveau || "N/A"}</td>
          <td>${quiz.version || "1.0"}</td>
          <td>${totalPoints}</td>
          <td>
            <div class="btn-group" role="group">
              <button class="btn btn-outline-primary btn-sm edit-btn" title="Modifier Quiz"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger btn-sm delete-btn" title="Supprimer Quiz"><i class="bi bi-trash"></i></button>
              <button class="btn btn-outline-success btn-sm manage-btn" title="Gérer Questions"><i class="bi bi-gear"></i></button>
            </div>
          </td>
        `;

        row.querySelector(".edit-btn")?.addEventListener("click", () => openEditQuizModal(firebaseKey, quiz));
        row.querySelector(".delete-btn")?.addEventListener("click", () => deleteQuiz(firebaseKey, quizId));
        row.querySelector(".manage-btn")?.addEventListener("click", () => openQuestionsModal(firebaseKey, quizId, quiz.Titre_Quiz || quiz.titre_quiz));

        quizzesTableBody.appendChild(row);
      });
  }

  renderPagination(totalPages); 
}

// ---------------- Pagination Rendering (Votre code - Inchangé) ----------------
function renderPagination(totalPages) {
    if (!paginationContainer) {
        console.error("Pagination container #quizPagination not found in the DOM!");
        return;
    }
    paginationContainer.innerHTML = "";
    if (totalPages <= 1) return;

    const createPageItem = (pageNumber, text = pageNumber.toString(), isDisabled = false, isActive = false) => {
        const li = document.createElement("li");
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        const a = document.createElement("a");
        a.className = "page-link";
        a.href = "#";
        a.innerHTML = text;
        if (!isDisabled && typeof pageNumber === 'number' && pageNumber > 0) {
            a.addEventListener("click", (e) => {
                e.preventDefault();
                if (currentPage !== pageNumber) {
                    currentPage = pageNumber;
                    renderTable();
                }
            });
        } else if (isDisabled) {
            a.removeAttribute('href');
            a.style.cursor = 'default';
            a.setAttribute('aria-disabled', 'true');
            a.tabIndex = -1;
        }
        li.appendChild(a);
        return li;
    };

    try {
        paginationContainer.appendChild(createPageItem(currentPage - 1, '&laquo;', currentPage === 1));
        const maxPagesToShow = 5;
        let startPage, endPage;
        if (totalPages <= maxPagesToShow + 2) {
            startPage = 1;
            endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor((maxPagesToShow - 1) / 2);
            const maxPagesAfterCurrent = Math.ceil((maxPagesToShow - 1) / 2);
            if (currentPage <= maxPagesBeforeCurrent + 1) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage >= totalPages - maxPagesAfterCurrent) {
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }
        if (startPage > 1) {
            paginationContainer.appendChild(createPageItem(1));
            if (startPage > 2) {
                paginationContainer.appendChild(createPageItem(0, '...', true));
            }
        }
        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPageItem(i, i, false, i === currentPage));
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationContainer.appendChild(createPageItem(0, '...', true));
            }
            paginationContainer.appendChild(createPageItem(totalPages));
        }
        paginationContainer.appendChild(createPageItem(currentPage + 1, '&raquo;', currentPage === totalPages));
    } catch (e) {
        console.error("Error building pagination items:", e);
        paginationContainer.innerHTML = '<li class="page-item disabled"><span class="page-link text-danger">Erreur Pagination</span></li>';
    }
}


// ---------------- Add Quiz (Using Modal) ----------------
function openAddQuizModal() {
    if (!addQuizModal) return alert("Modal d'ajout de quiz introuvable.");
    addQuizForm.reset();
    addQuizIdInput.disabled = false;
    addQuizModal.show();
}

async function saveNewQuiz(event) {
    event.preventDefault();
    if (!addQuizModal) return;
    const quizId = addQuizIdInput.value.trim();
    const titre = addQuizTitleInput.value.trim();
    const categorie = addQuizCategoryInput.value.trim();
    const niveau = addQuizLevelInput.value.trim();
    const version = addQuizVersionInput.value.trim() || "1.0";
    if (!quizId || !titre) { alert("ID et Titre obligatoires."); return; }

    // Utilise l'ID comme clé
    const newQuizRef = ref(database, "quizzes/" + quizId); 
    try {
        const snapshot = await get(newQuizRef);
        if (snapshot.exists()) { alert(`ID "${quizId}" existe déjà.`); return; }
        const newQuizData = { 
            id_quiz: quizId, 
            Titre_Quiz: titre, 
            Catégorie: categorie, 
            Niveau: niveau, 
            version: version, 
            totalPoints: 0, 
            totalQuestions: 0, 
            questionsIds: [] 
        };
        await set(newQuizRef, newQuizData);
        addQuizModal.hide();
        showToast("Quiz ajouté!", "success");
    } catch (error) { console.error("Erreur ajout quiz:", error); alert("Erreur ajout quiz."); }
}

// ---------------- Edit Quiz (Using Modal) ----------------
function openEditQuizModal(firebaseKey, quiz) {
    if (!editQuizModal) return;
    editQuizForm.reset();
    // Utilise la clé Firebase (l'ID du quiz ne peut pas être modifié)
    editQuizIdInput.value = firebaseKey; 
    editQuizTitleInput.value = quiz.Titre_Quiz || quiz.titre_quiz || "";
    editQuizCategoryInput.value = quiz.Catégorie || quiz.categorie || "";
    editQuizLevelInput.value = quiz.Niveau || quiz.niveau || "";
    editQuizVersionInput.value = quiz.version || "1.0";
    editQuizModal.show();
}

async function saveQuizChanges(event) {
    event.preventDefault();
    if (!editQuizModal) return;
    const firebaseKey = editQuizIdInput.value; // Clé Firebase
    const updatedData = { 
        Titre_Quiz: editQuizTitleInput.value.trim(), 
        Catégorie: editQuizCategoryInput.value.trim(), 
        Niveau: editQuizLevelInput.value.trim(), 
        version: editQuizVersionInput.value.trim() 
    };
    if (!firebaseKey || !updatedData.Titre_Quiz) { alert("ID/Titre manquant."); return; }
    try {
        await update(ref(database, `quizzes/${firebaseKey}`), updatedData);
        editQuizModal.hide();
        showToast("Quiz mis à jour!", "success");
    } catch (error) { console.error("Erreur sauvegarde quiz:", error); alert("Erreur mise à jour."); }
}

// ---------------- Delete Quiz ----------------
async function deleteQuiz(firebaseKey, quizId) {
    if (confirm(`Supprimer ce quiz (${quizId}) ET toutes ses questions associées ?`)) {
        try {
            const updates = {};
            // 1. Supprimer le quiz
            updates[`quizzes/${firebaseKey}`] = null;
            
            // 2. Trouver et supprimer les questions associées
            const questionsQuery = query(ref(database, "questions"), orderByChild("id_quiz"), equalTo(quizId));
            const questionsSnapshot = await get(questionsQuery);
            if (questionsSnapshot.exists()) {
                questionsSnapshot.forEach((snap) => { 
                    updates[`questions/${snap.key}`] = null; 
                });
            }
            
            // 3. Exécuter la suppression groupée
            await update(ref(database), updates);
            showToast("Quiz et ses questions supprimés.", "success");
            // onValue s'occupera de rafraîchir la table
        } catch (error) { console.error("Erreur suppression quiz:", error); alert("Erreur suppression."); }
    }
}

// ---------------- Manage Questions Modal ----------------
async function openQuestionsModal(firebaseKey, quizId, quizTitle) {
    if (!questionsModal) return;
    currentQuizIdForQuestionModal = quizId;
    currentFirebaseKeyForQuestionModal = firebaseKey;
    questionsModalLabel.textContent = `Questions : ${quizTitle || 'N/A'} (ID: ${quizId})`;
    questionsTableBody.innerHTML = '<tr><td colspan="7">Chargement...</td></tr>';
    questionsModal.show();
    try {
        const questionsQuery = query(ref(database, "questions"), orderByChild("id_quiz"), equalTo(quizId));
        const snapshot = await get(questionsQuery);
        questionsTableBody.innerHTML = ""; // Clear
        if (!snapshot.exists()) {
            questionsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Aucune question.</td></tr>`;
        } else {
            let idx = 0;
            snapshot.forEach((child) => {
                const key = child.key; // Clé Firebase de la question
                const q = child.val(); 
                idx++;
                
                let opts = '-'; 
                if (q.type === 'QCM' && Array.isArray(q.options)) { 
                    opts = q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("<br>"); 
                }
                let ans = q.reponse ?? 'N/A'; 
                if (q.type === 'QCM' && typeof q.reponse === 'number' && Array.isArray(q.options) && q.reponse < q.options.length) { 
                    ans = `${String.fromCharCode(65 + q.reponse)} (${q.options[q.reponse]})`; 
                } else if (q.type === 'Vrai/Faux') { 
                    ans = q.reponse ? 'Vrai' : 'Faux'; 
                }
                
                const row = document.createElement("tr");
                row.innerHTML = `<td>${idx}</td><td class="text-start">${q.question || 'N/A'}</td><td>${q.type || 'N/A'}</td><td class="text-start" style="max-width: 250px; white-space: normal;">${opts}</td><td>${ans}</td><td>${q.points || 0}</td><td><button class="btn btn-sm btn-outline-warning edit-question-btn" title="Modifier"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger delete-question-btn" title="Supprimer"><i class="bi bi-trash"></i></button></td>`;
                questionsTableBody.appendChild(row);
                
                row.querySelector(".edit-question-btn").addEventListener("click", () => openQuestionForm(q, quizId, true, key));
                row.querySelector(".delete-question-btn").addEventListener("click", async () => { 
                    if (confirm("Supprimer cette question ?")) { 
                        // Doit aussi mettre à jour le quiz (totalQuestions, questionsIds)
                        await deleteQuestionAndUpdateQuiz(firebaseKey, quizId, key); 
                        // Re-ouvre le modal pour rafraîchir la liste
                        openQuestionsModal(firebaseKey, quizId, quizTitle); 
                    } 
                });
            });
        }
    } catch(e){ console.error(e); questionsTableBody.innerHTML = `<tr><td colspan="7" class="text-danger">Erreur.</td></tr>`; }
}


// ---------------- Add/Edit Question Form ----------------
function openQuestionForm(questionData, quizId, isEdit, questionKey = null) {
     if (!questionFormModal) return;
    questionForm.reset();
    questionFormModalLabel.textContent = isEdit ? `Modifier question` : `Ajouter question (${quizId})`;
    formQuizIdInput.value = quizId;
    formQuestionIdInput.value = isEdit ? questionKey : ""; // Clé Firebase de la question
    tempQuestionDataForEdit = isEdit ? questionData : null; 
    
    if (isEdit && questionData) { 
        formQuestionTextInput.value = questionData.question || ""; 
        formQuestionTypeSelect.value = questionData.type || "QCM"; 
        formQuestionPointsInput.value = questionData.points || 1; 
    } else { 
        formQuestionTypeSelect.value = "QCM"; 
        formQuestionPointsInput.value = 1; 
    }
    
    updateQuestionFormUI();
    questionFormModal.show();
}

function updateQuestionFormUI() {
     const type = formQuestionTypeSelect.value;
    const isEdit = !!formQuestionIdInput.value;
    const questionData = tempQuestionDataForEdit;
    
    formAnswerContainer.innerHTML = `<label for="formQuestionAnswer" class="form-label">Réponse Correcte</label>`;
    
    if (type === "QCM") {
        formOptionsContainer.style.display = "block"; 
        formQuestionOptionsInput.required = true;
        formQuestionOptionsInput.value = (isEdit && questionData?.options) ? questionData.options.join(", ") : "";
        let ansLetter = ''; 
        if (isEdit && questionData && typeof questionData.reponse === 'number') {
            ansLetter = String.fromCharCode(65 + questionData.reponse);
        }
        formAnswerContainer.innerHTML += `<input type="text" id="formQuestionAnswer" class="form-control" placeholder="Lettre (A, B...)" value="${ansLetter}" required pattern="[A-Za-z]" title="Entrez une lettre (A, B...)">`;
    } else if (type === "Vrai/Faux") {
        formOptionsContainer.style.display = "none"; 
        formQuestionOptionsInput.required = false; 
        formQuestionOptionsInput.value = "";
        const isTrue = (isEdit && questionData && (questionData.reponse === true || String(questionData.reponse).toLowerCase() === 'true'));
        formAnswerContainer.innerHTML += `<select id="formQuestionAnswer" class="form-select" required><option value="true" ${isTrue ? 'selected' : ''}>Vrai</option><option value="false" ${!isTrue ? 'selected' : ''}>Faux</option></select>`;
    } else { // Calcul ou autre
        formOptionsContainer.style.display = "none"; 
        formQuestionOptionsInput.required = false; 
        formQuestionOptionsInput.value = "";
        formAnswerContainer.innerHTML += `<input type="text" id="formQuestionAnswer" class="form-control" value="${(isEdit && questionData) ? (questionData.reponse ?? '') : ''}" required>`;
    }
}

// ---------------- Save Question (Add/Edit) ----------------
async function saveQuestion(event) {
    event.preventDefault();
    const questionKey = formQuestionIdInput.value; // Clé Firebase (vide si ajout)
    const quizId = formQuizIdInput.value; // ID du quiz (ex: "ELEC-V1")
    const isEdit = !!questionKey;
    const type = formQuestionTypeSelect.value;
    const answerEl = formAnswerContainer.querySelector("#formQuestionAnswer");
    
    if (!quizId || !answerEl) { alert("Erreur interne."); return; }
    
    const payload = { 
        id_quiz: quizId, 
        question: formQuestionTextInput.value.trim(), 
        type: type, 
        options: [], 
        reponse: null, 
        points: parseInt(formQuestionPointsInput.value) || 1, 
        id_question: "" // Sera généré
    };

    // Logique de peuplement (inchangée)
    if (type === "QCM") { 
        payload.options = formQuestionOptionsInput.value.split(',').map(o=>o.trim()).filter(o=>o); 
        if(payload.options.length<2){alert("Min 2 options");return;} 
        const letter=answerEl.value.trim().toUpperCase(); 
        const idx=letter.charCodeAt(0)-65; 
        if(idx<0||idx>=payload.options.length){alert(`Réponse '${letter}' invalide.`);return;} 
        payload.reponse = idx; 
    } else if (type === "Vrai/Faux") { 
        payload.options = ["Vrai", "Faux"]; 
        payload.reponse = (answerEl.value === "true"); 
    } else { 
        payload.reponse = answerEl.value.trim(); 
        if (!payload.reponse) { alert("Réponse requise."); return; } 
    }
    
    try {
        let path, msg, finalKey = questionKey;
        
        if (isEdit) { 
            path = `questions/${questionKey}`; 
            // Conserve l'id_question original
            payload.id_question = tempQuestionDataForEdit?.id_question || `${quizId}-ERR`; 
            await update(ref(database, path), payload); 
            msg = "Modifiée!"; 
        } else { 
            // ❗️ Logique d'ID améliorée : Utiliser push() pour la clé Firebase
            const newQuestionRef = push(ref(database, "questions")); // Génère une clé unique
            finalKey = newQuestionRef.key; // Clé Firebase
            path = `questions/${finalKey}`;
            
            // Générer l'id_question formaté (ex: "ELEC-V1-0005")
            const quizQSnap = await get(query(ref(database,'questions'), orderByChild('id_quiz'), equalTo(quizId)));
            const qNum = quizQSnap.exists() ? quizQSnap.size : 0;
            payload.id_question = `${quizId}-${(qNum + 1).toString().padStart(4,'0')}`; 
            
            await set(newQuestionRef, payload); 
            msg = "Ajoutée!";
            // Mettre à jour le quiz (total, ids)
            await addQuestionIdToQuiz(currentFirebaseKeyForQuestionModal, payload.id_question, payload.points); 
        }
        
        questionFormModal.hide();
        showToast(`Question ${msg}`, "success");
        const title = questionsModalLabel.textContent.replace(/^Questions : /,'').replace(/ \(ID: .*\)$/,'');
        // Rafraîchir la liste des questions
        openQuestionsModal(currentFirebaseKeyForQuestionModal, quizId, title); 
    } catch(e){ console.error(e); alert(`Erreur: ${e.message}`); }
}


// ---------------- Helper: deleteQuestionAndUpdateQuiz ----------------
async function deleteQuestionAndUpdateQuiz(firebaseQuizKey, quizId, questionKey) {
    try { 
        const updates = {};
        // 1. Marquer la question pour suppression
        updates[`questions/${questionKey}`] = null; 
        
        // 2. Récupérer les infos de la question (pour son id_question et points)
        const qSnap = await get(ref(database,`questions/${questionKey}`));
        const questionData = qSnap.val();
        const idVal = questionData?.id_question;
        const points = questionData?.points || 0;
        
        // 3. Mettre à jour le quiz parent
        const quizRef = ref(database,`quizzes/${firebaseQuizKey}`); 
        const quizSnap = await get(quizRef); 
        if(quizSnap.exists()){ 
            const d = quizSnap.val(); 
            const c = d.totalQuestions || 0; 
            const p = d.totalPoints || 0;
            let ids = Array.isArray(d.questionsIds) ? d.questionsIds : []; 
            
            updates[`quizzes/${firebaseQuizKey}/totalQuestions`] = Math.max(0, c - 1);
            updates[`quizzes/${firebaseQuizKey}/totalPoints`] = Math.max(0, p - points); // ✅ Met à jour les points
            if(idVal){ ids = ids.filter(id => id !== idVal); } // Retire l'id_question
            updates[`quizzes/${firebaseQuizKey}/questionsIds`] = ids; 
        } 
        
        // 4. Exécuter la suppression groupée
        await update(ref(database), updates); 
        showToast("Question supprimée.", "success"); 
    } catch(e){ console.error(e); alert("Erreur suppression."); }
}

// ---------------- Helper: addQuestionIdToQuiz ----------------
async function addQuestionIdToQuiz(firebaseQuizKey, newIdQuestionFormatted, newPoints) {
     const quizRef = ref(database, `quizzes/${firebaseQuizKey}`); 
     try { 
         const snap = await get(quizRef); 
         if(snap.exists()){ 
             const d = snap.val(); 
             const c = d.totalQuestions || 0; 
             const p = d.totalPoints || 0;
             const ids = Array.isArray(d.questionsIds) ? d.questionsIds : []; 
             
             if(newIdQuestionFormatted && !ids.includes(newIdQuestionFormatted)){
                 ids.push(newIdQuestionFormatted);
             } 
             
             await update(quizRef, {
                 totalQuestions: c + 1, 
                 totalPoints: p + (newPoints || 0), // ✅ Met à jour les points
                 questionsIds: ids
             }); 
         } 
     } catch(e){ console.error(e); }
}

// ---------------- Simple Toast Function ----------------
function showToast(message, type = "info") {
    // (Utilise le toast de 'alerts.js' ou un toast local)
    // S'assurer que le conteneur existe (sinon le créer)
    let toastContainer = document.querySelector(".toast-container.position-fixed.top-0.end-0.p-3");
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
        toastContainer.style.zIndex = "1100";
        document.body.appendChild(toastContainer);
    }
    const el=document.createElement("div"); 
    el.className=`toast align-items-center text-bg-${type} border-0 show`; 
    el.role="alert"; el.ariaLive="assertive"; el.ariaAtomic="true"; 
    el.innerHTML=`<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`; 
    toastContainer.appendChild(el); 
    const t=new bootstrap.Toast(el,{delay:3000}); 
    t.show(); 
    el.addEventListener('hidden.bs.toast',()=>el.remove());
}

// ===============================
// 🚀 POINT D'ENTRÉE (EXPORTÉ)
// ===============================

/**
 * Initialise la section de gestion des Quiz.
 * (Appelée par dashboard.js)
 * @param {Object} user L'objet utilisateur admin (au cas où)
 */
export function initQuizSettings(user) {
    if (isInitialized) return; // Ne s'exécute qu'une fois
    console.log("Initialisation du module Quiz...");

    // 1. Attacher les écouteurs d'événements
    searchQuizInput?.addEventListener("input", () => { currentPage = 1; renderTable(); });
    addQuizBtn?.addEventListener("click", openAddQuizModal);
    addQuizForm?.addEventListener("submit", saveNewQuiz);
    editQuizForm?.addEventListener("submit", saveQuizChanges);
    addQuestionFromListBtn?.addEventListener("click", () => openQuestionForm(null, currentQuizIdForQuestionModal, false));
    questionForm?.addEventListener("submit", saveQuestion);
    formQuestionTypeSelect?.addEventListener("change", updateQuestionFormUI);
    
    // Listeners pour nettoyer les variables d'état quand les modaux se ferment
    questionFormModalEl?.addEventListener('hidden.bs.modal', () => { tempQuestionDataForEdit = null; });
    questionsModalEl?.addEventListener('hidden.bs.modal', () => { 
        currentQuizIdForQuestionModal = null; 
        currentFirebaseKeyForQuestionModal = null; 
    });

    // 2. Démarrer le chargement des données
    loadQuizzes(); // Attache le listener onValue

    isInitialized = true;
}