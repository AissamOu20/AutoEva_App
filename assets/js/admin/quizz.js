// ===============================
// 🔹 quizz.js (MODIFIED - Pagination Fix)
// ===============================

// 🔹 Import Firebase
import { database, ref, onValue, set, remove, update, get, query, orderByChild, equalTo, push } from "../db/firebase-config.js";

// ---------------- Variables DOM (Quiz List) ----------------
const quizzesTableBody = document.getElementById("quizzesTable");
const searchQuizInput = document.getElementById("searchQuiz");
const paginationContainer = document.getElementById("quizPagination"); // Target for pagination LIs
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
const pageSize = 30;
let currentQuizIdForQuestionModal = null;
let currentFirebaseKeyForQuestionModal = null;
let tempQuestionDataForEdit = null; // Temp storage for editing question data

// ---------------- Load Quizzes (Real-time) ----------------
function loadQuizzes() {
  console.log("Setting up quiz listener...");
  const quizRef = ref(database, "quizzes"); // Path: 'quizzes'

  onValue(quizRef, (snapshot) => {
    if (snapshot.exists()) {
      quizzesData = snapshot.val();
      quizzesArray = Object.entries(quizzesData).map(([key, quiz]) => ({
          ...quiz,
          firebaseId: key
      }));
    } else {
      quizzesData = {};
      quizzesArray = [];
    }
    console.log("Quiz data updated:", quizzesArray.length, "quizzes");
    renderTable(); // Render table after data update
  }, (error) => {
      console.error("Firebase Error (loadQuizzes):", error);
      if(quizzesTableBody) quizzesTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erreur de chargement.</td></tr>`;
      if(paginationContainer) paginationContainer.innerHTML = ""; // Clear pagination on error
  });
}

// ---------------- Render Quiz Table ----------------
function renderTable() {
  // Ensure table body exists
  if (!quizzesTableBody) {
      console.error("Table body #quizzesTable not found!");
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
  currentPage = Math.max(1, Math.min(currentPage, totalPages || 1)); // Ensure valid page, default to 1 if 0 pages
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filtered.slice(start, end);

  quizzesTableBody.innerHTML = ""; // Clear previous rows

  if (pageData.length === 0) {
    quizzesTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Aucun quiz trouvé ${searchTerm ? 'pour "' + searchTerm + '"' : ''}</td></tr>`;
  } else {
      pageData.forEach((quiz) => {
        const firebaseKey = quiz.firebaseId;
        const quizId = quiz.id_quiz;
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

  renderPagination(totalPages); // Render pagination after table
}

// ---------------- Pagination Rendering (CORRECTED + Robust) ----------------
function renderPagination(totalPages) {
    // 1. Check if the container element exists
    if (!paginationContainer) {
        console.error("Pagination container #quizPagination not found in the DOM!");
        return;
    }

    paginationContainer.innerHTML = ""; // Clear existing pagination items
    if (totalPages <= 1) return; // No pagination needed if 1 page or less

    // 2. Helper function to create each page item (<li><a>...</a></li>)
    const createPageItem = (pageNumber, text = pageNumber.toString(), isDisabled = false, isActive = false) => {
        const li = document.createElement("li");
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;

        const a = document.createElement("a");
        a.className = "page-link";
        a.href = "#";
        // Use innerHTML safely for entities like &laquo; and numbers/text
        a.innerHTML = text;

        if (!isDisabled && typeof pageNumber === 'number' && pageNumber > 0) {
            // Add click listener only for valid, clickable page numbers
            a.addEventListener("click", (e) => {
                e.preventDefault();
                if (currentPage !== pageNumber) { // Avoid re-rendering if clicking the active page
                    currentPage = pageNumber;
                    renderTable(); // Re-render the table for the new page
                }
            });
        } else if (isDisabled) {
            // Make disabled items visually non-interactive
            a.removeAttribute('href');
            a.style.cursor = 'default';
            a.setAttribute('aria-disabled', 'true');
            a.tabIndex = -1; // Remove from tab navigation
        }
        li.appendChild(a);
        return li; // Return the created <li> element
    };

    // 3. Build and append pagination items (wrapped in try-catch for safety)
    try {
        // Previous Button ('&laquo;' is the left arrow)
        paginationContainer.appendChild(createPageItem(currentPage - 1, '&laquo;', currentPage === 1));

        // Page Numbers (with ellipsis logic)
        const maxPagesToShow = 5; // Adjust how many page numbers are visible
        let startPage, endPage;

        if (totalPages <= maxPagesToShow + 2) { // Show all pages if total is small
            startPage = 1;
            endPage = totalPages;
        } else {
            // Calculate start/end pages for ellipsis
            const maxPagesBeforeCurrent = Math.floor((maxPagesToShow - 1) / 2);
            const maxPagesAfterCurrent = Math.ceil((maxPagesToShow - 1) / 2);

            if (currentPage <= maxPagesBeforeCurrent + 1) { // Near the beginning
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage >= totalPages - maxPagesAfterCurrent) { // Near the end
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else { // In the middle
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        // Add first page & potentially leading ellipsis ('...')
        if (startPage > 1) {
            paginationContainer.appendChild(createPageItem(1)); // Always show page 1
            if (startPage > 2) {
                // Pass 0 as pageNumber for ellipsis, making it disabled
                paginationContainer.appendChild(createPageItem(0, '...', true));
            }
        }

        // Add the calculated range of page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPageItem(i, i, false, i === currentPage));
        }

        // Add last page & potentially trailing ellipsis ('...')
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                // Pass 0 as pageNumber for ellipsis
                paginationContainer.appendChild(createPageItem(0, '...', true));
            }
            paginationContainer.appendChild(createPageItem(totalPages)); // Always show last page
        }

        // Next Button ('&raquo;' is the right arrow)
        paginationContainer.appendChild(createPageItem(currentPage + 1, '&raquo;', currentPage === totalPages));

    } catch (e) {
        // Log error if appending fails (e.g., if createPageItem returns non-Node)
        console.error("Error building pagination items:", e);
        paginationContainer.innerHTML = '<li class="page-item disabled"><span class="page-link text-danger">Erreur Pagination</span></li>';
    }
}


// ---------------- Add Quiz (Using Modal) ----------------
function openAddQuizModal() {
    // ... (Code de openAddQuizModal - INCHANGÉ) ...
    if (!addQuizModal) return alert("Modal d'ajout de quiz introuvable.");
    addQuizForm.reset();
    addQuizIdInput.disabled = false;
    addQuizModal.show();
}

async function saveNewQuiz(event) {
    // ... (Code de saveNewQuiz - INCHANGÉ) ...
    event.preventDefault();
    if (!addQuizModal) return;
    const quizId = addQuizIdInput.value.trim();
    const titre = addQuizTitleInput.value.trim();
    const categorie = addQuizCategoryInput.value.trim();
    const niveau = addQuizLevelInput.value.trim();
    const version = addQuizVersionInput.value.trim() || "1.0";
    if (!quizId || !titre) { alert("ID et Titre obligatoires."); return; }

    const newQuizRef = ref(database, "quizzes/" + quizId);
    try {
        const snapshot = await get(newQuizRef);
        if (snapshot.exists()) { alert(`ID "${quizId}" existe déjà.`); return; }
        const newQuizData = { id_quiz: quizId, Titre_Quiz: titre, Catégorie: categorie, Niveau: niveau, version: version, totalPoints: 0, totalQuestions: 0, questionsIds: [] };
        await set(newQuizRef, newQuizData);
        addQuizModal.hide();
        showToast("Quiz ajouté!", "success");
    } catch (error) { console.error("Erreur ajout quiz:", error); alert("Erreur ajout quiz."); }
}

// ---------------- Edit Quiz (Using Modal) ----------------
function openEditQuizModal(firebaseKey, quiz) {
    // ... (Code de openEditQuizModal - INCHANGÉ) ...
    if (!editQuizModal) return;
    editQuizForm.reset();
    editQuizIdInput.value = firebaseKey;
    editQuizTitleInput.value = quiz.Titre_Quiz || quiz.titre_quiz || "";
    editQuizCategoryInput.value = quiz.Catégorie || quiz.categorie || "";
    editQuizLevelInput.value = quiz.Niveau || quiz.niveau || "";
    editQuizVersionInput.value = quiz.version || "1.0";
    editQuizModal.show();
}

async function saveQuizChanges(event) {
    // ... (Code de saveQuizChanges - INCHANGÉ) ...
    event.preventDefault();
    if (!editQuizModal) return;
    const firebaseKey = editQuizIdInput.value;
    const updatedData = { Titre_Quiz: editQuizTitleInput.value.trim(), Catégorie: editQuizCategoryInput.value.trim(), Niveau: editQuizLevelInput.value.trim(), version: editQuizVersionInput.value.trim() };
    if (!firebaseKey || !updatedData.Titre_Quiz) { alert("ID/Titre manquant."); return; }
    try {
        await update(ref(database, `quizzes/${firebaseKey}`), updatedData);
        editQuizModal.hide();
        showToast("Quiz mis à jour!", "success");
    } catch (error) { console.error("Erreur sauvegarde quiz:", error); alert("Erreur mise à jour."); }
}

// ---------------- Delete Quiz (Inchangé) ----------------
async function deleteQuiz(firebaseKey, quizId) {
    // ... (Code de deleteQuiz - INCHANGÉ) ...
    if (confirm(`Supprimer ce quiz (${quizId}) ET ses questions ?`)) {
        try {
            const updates = {};
            updates[`quizzes/${firebaseKey}`] = null;
            const questionsQuery = query(ref(database, "questions"), orderByChild("id_quiz"), equalTo(quizId));
            const questionsSnapshot = await get(questionsQuery);
            if (questionsSnapshot.exists()) {
                questionsSnapshot.forEach((snap) => { updates[`questions/${snap.key}`] = null; });
            }
            await update(ref(database), updates);
            showToast("Quiz supprimé.", "success");
        } catch (error) { console.error("Erreur suppression quiz:", error); alert("Erreur suppression."); }
    }
}

// ---------------- Manage Questions Modal (Inchangé) ----------------
async function openQuestionsModal(firebaseKey, quizId, quizTitle) {
    // ... (Code de openQuestionsModal - INCHANGÉ) ...
    if (!questionsModal) return;
    currentQuizIdForQuestionModal = quizId;
    currentFirebaseKeyForQuestionModal = firebaseKey;
    questionsModalLabel.textContent = `Questions : ${quizTitle || 'N/A'} (ID: ${quizId})`;
    questionsTableBody.innerHTML = '<tr><td colspan="7">Chargement...</td></tr>';
    questionsModal.show();
    try {
        const questionsQuery = query(ref(database, "questions"), orderByChild("id_quiz"), equalTo(quizId));
        const snapshot = await get(questionsQuery);
        questionsTableBody.innerHTML = ""; // Clear loading/previous
        if (!snapshot.exists()) {
            questionsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Aucune question.</td></tr>`;
        } else {
            let idx = 0;
            snapshot.forEach((child) => {
                const key = child.key; const q = child.val(); idx++;
                // Formatting options/answer... (unchanged)
                let opts = '-'; if (q.type === 'QCM' && Array.isArray(q.options)) { opts = q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("<br>"); }
                let ans = q.reponse ?? 'N/A'; if (q.type === 'QCM' && typeof q.reponse === 'number' && Array.isArray(q.options) && q.reponse < q.options.length) { ans = `${String.fromCharCode(65 + q.reponse)} (${q.options[q.reponse]})`; } else if (q.type === 'Vrai/Faux') { ans = q.reponse ? 'Vrai' : 'Faux'; }
                const row = document.createElement("tr");
                row.innerHTML = `<td>${idx}</td><td class="text-start">${q.question || 'N/A'}</td><td>${q.type || 'N/A'}</td><td class="text-start" style="max-width: 250px; white-space: normal;">${opts}</td><td>${ans}</td><td>${q.points || 0}</td><td><button class="btn btn-sm btn-outline-warning edit-question-btn" title="Modifier"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger delete-question-btn" title="Supprimer"><i class="bi bi-trash"></i></button></td>`;
                questionsTableBody.appendChild(row);
                row.querySelector(".edit-question-btn").addEventListener("click", () => openQuestionForm(q, quizId, true, key));
                row.querySelector(".delete-question-btn").addEventListener("click", async () => { if (confirm("Supprimer?")) { await deleteQuestionAndUpdateQuiz(firebaseKey, quizId, key); openQuestionsModal(firebaseKey, quizId, quizTitle); } });
            });
        }
    } catch(e){ console.error(e); questionsTableBody.innerHTML = `<tr><td colspan="7" class="text-danger">Erreur.</td></tr>`; }
}


// ---------------- Add/Edit Question Form (Using Static Modal - Inchangé) ----------------
function openQuestionForm(questionData, quizId, isEdit, questionKey = null) {
    // ... (Code de openQuestionForm - INCHANGÉ) ...
     if (!questionFormModal) return;
    questionForm.reset();
    questionFormModalLabel.textContent = isEdit ? `Modifier question` : `Ajouter question (${quizId})`;
    formQuizIdInput.value = quizId;
    formQuestionIdInput.value = isEdit ? questionKey : "";
    tempQuestionDataForEdit = isEdit ? questionData : null;
    if (isEdit && questionData) { /* Populate */ formQuestionTextInput.value = questionData.question || ""; formQuestionTypeSelect.value = questionData.type || "QCM"; formQuestionPointsInput.value = questionData.points || 1; }
    else { /* Defaults */ formQuestionTypeSelect.value = "QCM"; formQuestionPointsInput.value = 1; }
    updateQuestionFormUI();
    questionFormModal.show();
}

function updateQuestionFormUI() {
    // ... (Code de updateQuestionFormUI - INCHANGÉ) ...
     const type = formQuestionTypeSelect.value;
    const isEdit = !!formQuestionIdInput.value;
    const questionData = tempQuestionDataForEdit;
    formAnswerContainer.innerHTML = `<label for="formQuestionAnswer" class="form-label">Réponse Correcte</label>`;
    if (type === "QCM") {
        formOptionsContainer.style.display = "block"; formQuestionOptionsInput.required = true;
        formQuestionOptionsInput.value = (isEdit && questionData?.options) ? questionData.options.join(", ") : "";
        let ansLetter = ''; if (isEdit && questionData && typeof questionData.reponse === 'number') ansLetter = String.fromCharCode(65 + questionData.reponse);
        formAnswerContainer.innerHTML += `<input type="text" id="formQuestionAnswer" class="form-control" placeholder="Lettre (A, B...)" value="${ansLetter}" required pattern="[A-Za-z]" title="Entrez une lettre (A, B...)">`;
    } else if (type === "Vrai/Faux") {
        formOptionsContainer.style.display = "none"; formQuestionOptionsInput.required = false; formQuestionOptionsInput.value = "";
        const isTrue = (isEdit && questionData && (questionData.reponse === true || String(questionData.reponse).toLowerCase() === 'true'));
        formAnswerContainer.innerHTML += `<select id="formQuestionAnswer" class="form-select" required><option value="true" ${isTrue ? 'selected' : ''}>Vrai</option><option value="false" ${!isTrue ? 'selected' : ''}>Faux</option></select>`;
    } else {
        formOptionsContainer.style.display = "none"; formQuestionOptionsInput.required = false; formQuestionOptionsInput.value = "";
        formAnswerContainer.innerHTML += `<input type="text" id="formQuestionAnswer" class="form-control" value="${(isEdit && questionData) ? (questionData.reponse ?? '') : ''}" required>`;
    }
}

// ---------------- Save Question (Handles Add/Edit, New ID logic, QCM Answer - Inchangé) ----------------
async function saveQuestion(event) {
    // ... (Code de saveQuestion - INCHANGÉ) ...
    event.preventDefault();
    const questionKey = formQuestionIdInput.value;
    const quizId = formQuizIdInput.value;
    const isEdit = !!questionKey;
    const type = formQuestionTypeSelect.value;
    const answerEl = formAnswerContainer.querySelector("#formQuestionAnswer");
    if (!quizId || !answerEl) { alert("Erreur interne."); return; }
    const payload = { id_quiz: quizId, question: formQuestionTextInput.value.trim(), type: type, options: [], reponse: null, points: parseInt(formQuestionPointsInput.value) || 1, id_question: "" };
    // Populate options/reponse based on type... (unchanged logic for QCM index, V/F boolean)
    if (type === "QCM") { payload.options = formQuestionOptionsInput.value.split(',').map(o=>o.trim()).filter(o=>o); if(payload.options.length<2){alert("Min 2 options");return;} const letter=answerEl.value.trim().toUpperCase(); const idx=letter.charCodeAt(0)-65; if(idx<0||idx>=payload.options.length){alert(`Réponse '${letter}' invalide.`);return;} payload.reponse = idx; }
    else if (type === "Vrai/Faux") { payload.options = ["Vrai", "Faux"]; payload.reponse = (answerEl.value === "true"); }
    else { payload.reponse = answerEl.value.trim(); if (!payload.reponse) { alert("Réponse requise."); return; } }
    try {
        let path, msg, finalKey = questionKey;
        if (isEdit) { path = `questions/${questionKey}`; payload.id_question = tempQuestionDataForEdit?.id_question || `${quizId}-ERR`; await update(ref(database, path), payload); msg = "Modifiée!"; }
        else { const qSnap = await get(ref(database,"questions")); const maxId = Object.keys(qSnap.val()||{}).reduce((m,k)=>Math.max(m,parseInt(k)||0),0); const newNumKey=maxId+1; finalKey=newNumKey.toString(); path=`questions/${finalKey}`; const quizQSnap=await get(query(ref(database,'questions'),orderByChild('id_quiz'),equalTo(quizId))); const qNum=quizQSnap.exists()?quizQSnap.size:0; payload.id_question=`${quizId}-${(qNum+1).toString().padStart(4,'0')}`; await set(ref(database,path),payload); msg="Ajoutée!"; await addQuestionIdToQuiz(currentFirebaseKeyForQuestionModal, finalKey, payload.id_question); }
        questionFormModal.hide();
        showToast(`Question ${msg}`, "success");
        const title = questionsModalLabel.textContent.replace(/^Questions : /,'').replace(/ \(ID: .*\)$/,'');
        openQuestionsModal(currentFirebaseKeyForQuestionModal, quizId, title); // Refresh list
    } catch(e){ console.error(e); alert(`Erreur: ${e.message}`); }
}


// ---------------- Helper Functions (Inchangées) ----------------
async function deleteQuestionAndUpdateQuiz(firebaseQuizKey, quizId, questionKey) {
    // ... (Code de deleteQuestionAndUpdateQuiz - INCHANGÉ) ...
    try { const up={}; up[`questions/${questionKey}`]=null; const qSnap=await get(ref(database,`questions/${questionKey}`)); const idVal=qSnap.val()?.id_question; const quizRef=ref(database,`quizzes/${firebaseQuizKey}`); const quizSnap=await get(quizRef); if(quizSnap.exists()){ const d=quizSnap.val(); const c=d.totalQuestions||0; let ids=Array.isArray(d.questionsIds)?d.questionsIds:[]; up[`quizzes/${firebaseQuizKey}/totalQuestions`]=Math.max(0,c-1); if(idVal){ids=ids.filter(id=>id!==idVal);} up[`quizzes/${firebaseQuizKey}/questionsIds`]=ids; } await update(ref(database),up); showToast("Question supprimée.", "success"); } catch(e){ console.error(e); alert("Erreur suppression."); }
}

async function addQuestionIdToQuiz(firebaseQuizKey, newQuestionFirebaseKey, newIdQuestionFormatted) {
    // ... (Code de addQuestionIdToQuiz - INCHANGÉ) ...
     const quizRef = ref(database, `quizzes/${firebaseQuizKey}`); try { const snap = await get(quizRef); if(snap.exists()){ const d=snap.val(); const c=d.totalQuestions||0; const ids=Array.isArray(d.questionsIds)?d.questionsIds:[]; if(newIdQuestionFormatted&&!ids.includes(newIdQuestionFormatted)){ids.push(newIdQuestionFormatted);} await update(quizRef,{totalQuestions:c+1,questionsIds:ids}); } } catch(e){ console.error(e); }
}

// ---------------- Search Listener (Inchangé) ----------------
searchQuizInput?.addEventListener("input", () => { currentPage = 1; renderTable(); });

// ---------------- Event Listeners for Modals (Inchangés) ----------------
addQuizBtn?.addEventListener("click", openAddQuizModal);
addQuizForm?.addEventListener("submit", saveNewQuiz);
editQuizForm?.addEventListener("submit", saveQuizChanges);
addQuestionFromListBtn?.addEventListener("click", () => openQuestionForm(null, currentQuizIdForQuestionModal, false));
questionForm?.addEventListener("submit", saveQuestion);
formQuestionTypeSelect?.addEventListener("change", updateQuestionFormUI);
questionFormModalEl?.addEventListener('hidden.bs.modal', () => { tempQuestionDataForEdit = null; });
questionsModalEl?.addEventListener('hidden.bs.modal', () => { currentQuizIdForQuestionModal = null; currentFirebaseKeyForQuestionModal = null; });

// ---------------- Simple Toast Function (Inchangé) ----------------
function showToast(message, type = "info") {
    // ... (Code de showToast - INCHANGÉ) ...
    const cont = document.querySelector(".toast-container.position-fixed.top-0"); if (!cont) return; const el=document.createElement("div"); el.className=`toast align-items-center text-bg-${type} border-0 show`; el.role="alert"; el.ariaLive="assertive"; el.ariaAtomic="true"; el.innerHTML=`<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`; cont.appendChild(el); const t=new bootstrap.Toast(el,{delay:3000}); t.show(); el.addEventListener('hidden.bs.toast',()=>el.remove());
}

// ---------------- Initialization ----------------
loadQuizzes(); // Start