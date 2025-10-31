// ===============================
// 🚀 quiz.js (Handles quiz logic and display)
// ===============================

import { database, ref, get, set, update, query, orderByChild, equalTo, serverTimestamp } from "../db/firebase-config.js";
import { checkAuth } from "../user.js";

// DOM Elements
const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get("id"); // User-defined quiz ID

const quizTitleEl = document.getElementById("quizTitle");
const quizDescEl = document.getElementById("quizDescription");
const progressBar = document.getElementById("progressBar");
const questionsContainer = document.getElementById("questionsContainer");
const submitBtn = document.getElementById("submitQuizBtn");

// State
let questionsArray = []; // Holds all questions for the current quiz
let currentQuestionIndex = 0; // Index of the currently displayed question
let answers = {}; // Stores { questionId: userAnswerValue }
let quizStartTime = Date.now(); // Timestamp when the quiz starts loading

// --- Initialization: Check Auth, Check Daily Limit, Load Quiz ---
document.addEventListener("DOMContentLoaded", async () => {
    const user = await checkAuth(true);
    if (!user) return; // checkAuth handles redirection if not logged in

    if (!quizId) {
        // Display error if quiz ID is missing in URL
        if (questionsContainer) questionsContainer.innerHTML = `<p class="text-center text-danger">Erreur: ID du quiz manquant dans l'URL.</p>`;
        if (submitBtn) submitBtn.style.display = 'none';
        return;
    }

    // --- Check if the user has already taken this specific quiz today ---
    try {
        const hasTakenToday = await checkHasTakenToday(user.id, quizId);

        if (hasTakenToday) {
            // Display message indicating the quiz was already completed today
            if (quizTitleEl) quizTitleEl.textContent = "Déjà complété";
            if (quizDescEl) quizDescEl.textContent = "Vous avez déjà passé ce quiz aujourd'hui.";
            if (questionsContainer) questionsContainer.innerHTML = `
                <div class="alert alert-warning text-center" role="alert">
                    <h4 class="alert-heading">Revenez demain !</h4>
                    <p>Vous ne pouvez passer ce quiz qu'une seule fois par jour.</p>
                     <a href="all-quiz.html" class="btn btn-secondary mt-3">Voir d'autres quiz</a>
                </div>`;
            if (submitBtn) submitBtn.style.display = 'none';
            // Set progress bar to 100%
            if (progressBar) {
                progressBar.style.width = "100%";
                progressBar.textContent = "Complété";
                progressBar.classList.add("bg-success");
                progressBar.setAttribute('aria-valuenow', 100);
            }
            return; // Stop further execution
        }
    } catch (err) {
        // Handle errors during the check (e.g., database connection issue)
        console.error("Erreur vérification date tentative:", err);
        if (questionsContainer) questionsContainer.innerHTML = `<p class="text-center text-danger">Erreur lors de la vérification de l'historique.</p>`;
        if (submitBtn) submitBtn.style.display = 'none';
        return;
    }

    // --- If not taken today, load the quiz data ---
    await loadQuizData();
});

// --- Load Quiz Details and Questions ---
async function loadQuizData() {
    try {
        // Fetch quiz metadata (title, description) using user-defined quizId
        const quizSnap = await get(ref(database, `quizzes/${quizId}`));
        if (!quizSnap.exists()) throw new Error("Quiz introuvable !");

        const quiz = quizSnap.val();
        if (quizTitleEl) quizTitleEl.textContent = quiz.Titre_Quiz || quiz.titre_quiz || "Quiz sans titre";
        if (quizDescEl) quizDescEl.textContent = quiz.competences || "Pas de description.";

        // Fetch questions associated with this quiz using user-defined quizId
        const questionsQuery = query(ref(database, "questions"), orderByChild("id_quiz"), equalTo(quizId));
        const questionsSnap = await get(questionsQuery);

        if (!questionsSnap.exists()) {
             throw new Error("Aucune question trouvée pour ce quiz.");
        }

        // Process and sort questions from the snapshot
        questionsArray = Object.entries(questionsSnap.val())
                               .map(([key, q]) => ({ ...q, firebaseKey: key })) // Include Firebase key
                               .filter(q => q && q.question && q.id_question && q.reponse !== undefined) // Basic validation
                               .sort((a, b) => (a.num_question || 0) - (b.num_question || 0)); // Sort by question number

        if (questionsArray.length === 0) {
             throw new Error("Aucune question valide trouvée après filtrage.");
        }

        // Initialize quiz display
        currentQuestionIndex = 0;
        answers = {}; // Reset answers for this quiz attempt
        displayCurrentQuestion();
        updateProgress();
        quizStartTime = Date.now(); // Start timer when first question is ready

    } catch (err) {
        // Display errors to the user
        console.error("Erreur chargement quiz :", err);
        if (questionsContainer) questionsContainer.innerHTML = `<p class="text-center text-danger">Erreur: ${err.message}</p>`;
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

// --- Check if Quiz Was Taken Today ---
async function checkHasTakenToday(userId, quizIdToCheck) {
    // Reference uses the user-defined quizId to check the specific attempt
    const attemptRef = ref(database, `users/${userId}/quizzes/${quizIdToCheck}`);
    const attemptSnap = await get(attemptRef);

    if (!attemptSnap.exists()) return false; // Never taken

    const lastAttempt = attemptSnap.val();
    const lastAttemptTimestamp = lastAttempt.completedAt;

    if (!lastAttemptTimestamp) return false; // Incomplete data, allow retake

    const lastAttemptDate = new Date(lastAttemptTimestamp);
    const currentDate = new Date();

    // Compare year, month, and day for same-day check
    return lastAttemptDate.getFullYear() === currentDate.getFullYear() &&
           lastAttemptDate.getMonth() === currentDate.getMonth() &&
           lastAttemptDate.getDate() === currentDate.getDate();
}


// --- Display the Current Question Card ---
function displayCurrentQuestion() {
    // Basic state validation
    if (!questionsContainer || currentQuestionIndex >= questionsArray.length || currentQuestionIndex < 0) {
        console.error("Invalid state for displaying question.");
        return;
    }

    questionsContainer.innerHTML = ""; // Clear previous question card
    const q = questionsArray[currentQuestionIndex];
    const index = currentQuestionIndex; // 0-based index
    const questionIdForAnswers = q.id_question; // Formatted ID (e.g., QUIZID-0001) used as key in `answers`

    // Create the card element
    const card = document.createElement("div");
    card.className = "card-question card shadow-sm p-4 active"; // Base classes + animation trigger

    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G']; // Letters for QCM options
    let optionsHTML = ""; // To store HTML for answer options

    // --- Build Options HTML based on question type ---
    switch (q.type?.toLowerCase()) {
        case "qcm":
            if (!Array.isArray(q.options) || q.options.length === 0) {
                optionsHTML = "<p class='text-danger text-center'>Erreur: Options QCM manquantes.</p>"; break;
            }
            // Create a button for each option
            optionsHTML = q.options.map((opt, idx) => `
                <button class="option-btn" data-value="${idx}">
                   <span class="fw-bold me-2">${optionLetters[idx] || idx + 1}.</span> ${opt || ''}
                </button>
            `).join('');
            break;
        case "vrai/faux":
            optionsHTML = `
                <button class="option-btn" data-value="true">Vrai</button>
                <button class="option-btn" data-value="false">Faux</button>`;
            break;
        case "calcul":
            optionsHTML = `<input type="text" class="form-control" id="answer_${questionIdForAnswers}" placeholder="Entrez votre réponse numérique ou textuelle">`;
            break;
        default:
            optionsHTML = `<p class="text-danger text-center">Type '${q.type}' non supporté.</p>`;
    }

    // --- Build Card Inner HTML ---
    card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
             <h5 class="mb-0 text-muted">Question ${index + 1} / ${questionsArray.length}</h5>
             <span class="badge bg-info rounded-pill px-3 py-2">${q.points || 1} point(s)</span>
        </div>
        <p class="lead fs-5 mb-4 text-center">${q.question || 'Question non définie'}</p>
        <div class="options-container mt-4">${optionsHTML}</div>
        <div class="d-flex justify-content-between mt-4 pt-3 border-top">
            <button class="btn btn-secondary btn-prev" ${index === 0 ? 'disabled' : ''}>&laquo; Précédent</button>
            <button class="btn btn-success btn-next">${index === questionsArray.length - 1 ? "Terminer &raquo;" : "Suivant &raquo;"}</button>
        </div>`;

    questionsContainer.appendChild(card); // Add card to the page

    // --- Event Listeners for Interaction ---
    const allOptionButtons = card.querySelectorAll(".option-btn");
    const inputField = card.querySelector(`input[type="text"]`);

    // Add click listeners to option buttons (QCM, Vrai/Faux)
    allOptionButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Update the central 'answers' state
            answers[questionIdForAnswers] = btn.dataset.value;

            // Update UI: mark clicked as selected, others as inactive
            allOptionButtons.forEach(b => {
                b.classList.remove("selected", "option-inactive"); // Reset first
                if (b !== btn) b.classList.add("option-inactive"); // Make others inactive
            });
            btn.classList.add("selected"); // Highlight clicked button
        });
    });

    // Add input listener for 'Calcul' type questions
    if (inputField) {
        inputField.addEventListener("input", e => {
            answers[questionIdForAnswers] = e.target.value.trim();
        });
    }

    // --- Restore previous state if user navigates back/forth ---
    const previousAnswer = answers[questionIdForAnswers];
    if (previousAnswer !== undefined) {
        if (q.type?.toLowerCase() === 'calcul' && inputField) {
            inputField.value = previousAnswer; // Restore input value
        } else {
            // Restore button states (selected or inactive)
            allOptionButtons.forEach(btn => {
                if (btn.dataset.value === previousAnswer) {
                    btn.classList.add("selected");
                } else {
                    btn.classList.add("option-inactive");
                }
            });
        }
    } else {
         // If no previous answer, ensure all buttons are active
         allOptionButtons.forEach(btn => btn.classList.remove("selected", "option-inactive"));
    }

    // --- Navigation Button Listeners ---
    card.querySelector(".btn-next")?.addEventListener("click", () => {
        if (index < questionsArray.length - 1) { // If not the last question
            currentQuestionIndex++;
            displayCurrentQuestion(); // Show next question
            updateProgress();
        } else {
            submitBtn?.click(); // Trigger submit on last question
        }
    });
    card.querySelector(".btn-prev")?.addEventListener("click", () => {
        if (index > 0) { // If not the first question
            currentQuestionIndex--;
            displayCurrentQuestion(); // Show previous question
            updateProgress();
        }
    });
}


// --- Update Progress Bar ---
function updateProgress() {
    if (!progressBar) return;
    const percent = Math.round(((currentQuestionIndex + 1) / questionsArray.length) * 100);
    progressBar.style.width = percent + "%";
    progressBar.setAttribute('aria-valuenow', percent);
}


// --- Submit Quiz, Calculate Score, Save Result ---
submitBtn?.addEventListener("click", async () => {
    if (!questionsArray || questionsArray.length === 0) {
        showBasicAlert("Aucune question à soumettre.", "warning"); return;
    }

    // Check for unanswered questions
    const unansweredCount = questionsArray.filter(q => answers[q.id_question] === undefined || answers[q.id_question] === "").length;
    if (unansweredCount > 0) {
        if (!confirm(`Vous n'avez pas répondu à ${unansweredCount} question(s). Soumettre quand même ?`)) {
             return; // Stop if user cancels
        }
    }

    // Show loading state on button
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Correction...`;

    try {
        const scoreResult = calculateScore(); // Calculate score based on `answers`
        await saveQuizResult(scoreResult);    // Save result to Firebase

        // Store detailed results in sessionStorage for the results page
        sessionStorage.setItem("latestQuizDetails", JSON.stringify(scoreResult.details));

        // Redirect to the results page with summary info in URL
        window.location.href = `quiz-results.html?quizId=${quizId}&score=${scoreResult.points}&total=${scoreResult.totalPoints}&correct=${scoreResult.correctAnswers}&qs=${scoreResult.totalQuestions}`;

    } catch (error) {
        console.error("Erreur soumission:", error);
        showBasicAlert(`Erreur lors de la soumission: ${error.message}`, "danger");
        // Restore button on error
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>Terminer le Quiz`;
    }
});

// --- Calculate Score ---
function calculateScore() {
    let correctCount = 0;
    let totalPointsPossible = 0;
    let earnedPoints = 0;
    const detailedResults = []; // Array to store detailed result for each question

    questionsArray.forEach((question, index) => {
        const questionId = question.id_question;
        const userAnswer = answers[questionId];
        const correctAnswer = question.reponse; // Answer from DB (index for QCM, boolean for V/F, string/number for Calcul)
        const points = parseInt(question.points) || 1;

        totalPointsPossible += points;
        let isCorrect = false;

        // Compare user answer with correct answer based on type
        switch (question.type?.toLowerCase()) {
            case "qcm": // DB stores 0-based index
                isCorrect = (parseInt(userAnswer, 10) === correctAnswer);
                break;
            case "vrai/faux": // DB stores boolean
                isCorrect = (userAnswer === String(correctAnswer).toLowerCase());
                break;
            case "calcul": // DB stores string or number
                 const userAnswerCleaned = String(userAnswer || '').trim();
                 const correctAnswerCleaned = String(correctAnswer || '').trim();
                 const userNum = parseFloat(userAnswerCleaned);
                 const correctNum = parseFloat(correctAnswerCleaned);
                 if (!isNaN(userNum) && !isNaN(correctNum)) {
                     isCorrect = Math.abs(userNum - correctNum) < 0.001; // Tolerance for floats
                 } else {
                     isCorrect = userAnswerCleaned.toLowerCase() === correctAnswerCleaned.toLowerCase(); // Case-insensitive string compare
                 }
                break;
            default: console.warn(`Type inconnu '${question.type}' pour correction.`);
        }

        if (isCorrect) {
            correctCount++;
            earnedPoints += points;
        }

        // Add details for the results page
        detailedResults.push({
            questionText: question.question,
            questionNumber: index + 1,
            userAnswer: userAnswer ?? "Non répondu",
            correctAnswer: correctAnswer, // Store the raw correct answer from DB
            isCorrect: isCorrect,
            points: points,
            earnedPoints: isCorrect ? points : 0,
            options: question.options // Include options for context on results page
        });
    });

    // Calculate final percentage
    const percentage = totalPointsPossible > 0 ? (earnedPoints / totalPointsPossible) * 100 : 0;

    // Return structured result object
    return {
        correctAnswers: correctCount,
        totalQuestions: questionsArray.length,
        points: earnedPoints,
        totalPoints: totalPointsPossible,
        percentage: parseFloat(percentage.toFixed(2)), // Round to 2 decimals
        details: detailedResults // Include detailed breakdown
    };
}


// --- Save Quiz Result to Firebase ---
async function saveQuizResult(scoreData) {
    const user = await checkAuth(true); // 'user' contient { id, username, group, ... }
    if (!user) throw new Error("Utilisateur non authentifié.");

    // 1. Save detailed result to '/results/' collection (unique entry per attempt)
    const resultId = `${user.id}_${quizId}_${Date.now()}`;
    const quizRef = ref(database, `quizzes/${quizId}`);
    const quizSnap = await get(quizRef);
    const quizTitle = quizSnap.exists() ? (quizSnap.val().Titre_Quiz || quizSnap.val().titre_quiz) : "Inconnu";

    const resultData = {
        resultId: resultId, userId: user.id, username: user.username, quizId: quizId,
        quizTitle: quizTitle, score: scoreData.points, totalPointsPossible: scoreData.totalPoints,
        percentage: scoreData.percentage, correctAnswersCount: scoreData.correctAnswers,
        totalQuestions: scoreData.totalQuestions, completedAt: serverTimestamp(),
        timeSpentSeconds: Math.round((Date.now() - quizStartTime) / 1000)
    };
    await set(ref(database, `results/${resultId}`), resultData);
    console.log("Résultat sauvegardé dans /results/ ID:", resultId);

    // 2. Update/Overwrite user's latest attempt for THIS quiz in '/users/{uid}/quizzes/{quizId}'
    const userQuizAttemptRef = ref(database, `users/${user.id}/quizzes/${quizId}`);
    await set(userQuizAttemptRef, {
        quizId: quizId, quizTitle: quizTitle, score: scoreData.points,
        totalPointsPossible: scoreData.totalPoints, percentage: scoreData.percentage,
        completedAt: serverTimestamp() // Use server time for consistency
    });
    console.log(`Tentative pour quiz ${quizId} MAJ pour user ${user.id}.`);

    // 3. Recalculate and update the user's overall total points
    await updateUserTotalPoints(user.id);
    
    // ==============================================================
    // ⭐️ NOUVELLE ÉTAPE 4: Mettre à jour le total et LE RANG du groupe
    // ==============================================================
    // (Nous n'avons plus besoin de 'userGroup' car la fonction recalcule tout)
    await recalculateGroupScoresAndRanks();
    
    return resultId;
}

// --- Update User's Total Points (Recalculates from all attempts) ---
async function updateUserTotalPoints(userId) {
    try {
        const userRef = ref(database, `users/${userId}`);
        const userQuizzesRef = ref(database, `users/${userId}/quizzes`); // Path to all quiz attempts
        const quizzesSnap = await get(userQuizzesRef);

        let newTotalPoints = 0;
        if (quizzesSnap.exists()) {
            const allQuizAttempts = quizzesSnap.val();
            // Sum scores from all saved attempts
            for (const qId in allQuizAttempts) {
                if (allQuizAttempts[qId]?.score !== undefined) { // Check if score exists
                    newTotalPoints += Number(allQuizAttempts[qId].score) || 0;
                }
            }
        }

        // Update totalPoints and timestamp on the user's root object
        await update(userRef, {
            totalPoints: newTotalPoints,
            lastQuizCompletedTimestamp: serverTimestamp()
        });
        console.log(`User ${userId} total points recalculés: ${newTotalPoints}`);

        // Update localStorage if it's the current user
        const storedUser = JSON.parse(localStorage.getItem("currentUser") || '{}');
        if (storedUser?.id === userId) {
             storedUser.totalPoints = newTotalPoints;
             localStorage.setItem("currentUser", JSON.stringify(storedUser));
        }
    } catch (error) {
        console.error(`Erreur recalcul total points pour ${userId}:`, error);
        // Log error but don't block execution
    }
}

// ====================================================================
// ⭐️ NOUVELLE FONCTION: Recalculer les scores ET RANGS de TOUS les groupes
// (Copie de la logique de student-settings.js pour la cohérence)
// ====================================================================
/**
 * Recalcule les scores totaux ET les rangs de TOUS les groupes.
 * Appelé après qu'un utilisateur a terminé un quiz.
 */
async function recalculateGroupScoresAndRanks() {
    console.log("Recalcul des scores et rangs des groupes...");
    try {
        const groupsSnap = await get(ref(database, "groups"));
        const usersSnap = await get(ref(database, "users"));

        if (!usersSnap.exists()) {
            console.warn("Recalcul des rangs annulé : aucun utilisateur trouvé.");
            return;
        }

        const allUsers = usersSnap.val();
        const existingGroups = groupsSnap.val() || {};
        
        // 1. Réinitialiser les points et les listes d'étudiants de tous les groupes
        // (Nécessaire si un étudiant a changé de groupe ou pour recalculer à partir de zéro)
        for (let groupName in existingGroups) {
            existingGroups[groupName].total_points = 0;
            existingGroups[groupName].etudiants = []; 
        }

        // 2. Calculer les points en lisant tous les utilisateurs
        for (let userId in allUsers) {
            const user = allUsers[userId];
            if (user.role === 'student' && (user.group || user.Groupe)) {
                const groupName = user.group || user.Groupe;
                
                // S'assurer que le groupe existe
                if (!existingGroups[groupName]) {
                     existingGroups[groupName] = { nom: groupName, total_points: 0, etudiants: [] };
                }
                
                // On additionne le totalPoints (qui vient d'être mis à jour) de l'étudiant
                existingGroups[groupName].total_points += (user.totalPoints || 0);
                existingGroups[groupName].etudiants.push(user.id);
            }
        }

        // 3. Convertir en tableau, trier et assigner les rangs
        const groupList = Object.values(existingGroups);
        groupList.sort((a, b) => (b.total_points || 0) - (a.total_points || 0)); // Tri descendant

        const updates = {};
        groupList.forEach((group, index) => {
            const groupName = group.nom;
            // Prépare la mise à jour pour ce groupe
            updates[`groups/${groupName}/total_points`] = group.total_points;
            updates[`groups/${groupName}/rang`] = index + 1; // Le rang est 1-indexé
            updates[`groups/${groupName}/etudiants`] = group.etudiants; // Maintient la liste des étudiants à jour
        });

        // 4. Appliquer la mise à jour groupée
        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
            console.log("Classement (rangs) des groupes mis à jour.");
        }

    } catch (error) {
        console.error("Erreur lors du recalcul des rangs de groupe:", error);
    }
}


// --- Basic Alert Function ---
function showBasicAlert(message, type = "info") {
    // Uses the browser's default alert
    console.log(`ALERT [${type}]: ${message}`);
    alert(message);
    // You could replace this with a Bootstrap Toast or other notification library
}
