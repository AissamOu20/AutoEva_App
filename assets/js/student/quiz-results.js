// ===============================
// 📊 quiz-results.js (Version Finale)
// Affiche le résumé et les détails du quiz
// ===============================

// 🔹 Import Firebase Functions
import { database, ref, get } from "../db/firebase-config.js";

// ------------------------------------
// 🚀 Initialization
// ------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("quiz-results.js: DOM loaded.");
    displaySummaryResults();
    displayDetailedResults();
});

// ------------------------------------
// 🛠️ Helper Function: Set Text Content Safely
// ------------------------------------
function setTextContent(id, text) {
    const element = document.getElementById(id);
    if (element) {
        // console.log(`Setting text for #${id}: "${text}"`); // Optional: remove for production
        element.textContent = text;
    } else {
        console.error(`Element with ID #${id} not found for setTextContent.`);
    }
}

// ------------------------------------
// 📊 Display Summary Results (from URL & Firebase)
// ------------------------------------
function displaySummaryResults() {
    console.log("Running displaySummaryResults...");
    try {
        // --- Get Elements ---
        const earnedPointsEl = document.getElementById('earnedPoints');
        const totalPointsEl = document.getElementById('totalPoints');
        const correctCountEl = document.getElementById('correctCount');
        const totalQuestionsEl = document.getElementById('totalQuestions');
        const percentageEl = document.getElementById('percentage');
        const scorePercentageEl = document.getElementById('scorePercentage');
        const scoreCircleEl = document.getElementById('scoreCircle');
        const quizTitleEl = document.getElementById('quizTitle');

        // --- Check Elements ---
        if (!earnedPointsEl || !totalPointsEl || !correctCountEl || !totalQuestionsEl || !percentageEl || !scorePercentageEl || !scoreCircleEl || !quizTitleEl) {
             console.error("One or more summary display elements not found!");
             return;
        }

        // --- Read URL Params ---
        const urlParams = new URLSearchParams(window.location.search);
        const quizId = urlParams.get('quizId');
        const earnedPoints = parseInt(urlParams.get('score')) || 0;
        const totalPoints = parseInt(urlParams.get('total')) || 0;
        const correctCount = parseInt(urlParams.get('correct')) || 0;
        const totalQuestions = parseInt(urlParams.get('qs')) || 0;
        const percentage = (totalPoints > 0) ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        console.log("Summary Params:", { quizId, earnedPoints, totalPoints, correctCount, totalQuestions, percentage });

        // --- Update DOM ---
        setTextContent('scorePercentage', `${percentage}%`);
        setTextContent('earnedPoints', earnedPoints);
        setTextContent('totalPoints', totalPoints);
        setTextContent('correctCount', correctCount);
        setTextContent('totalQuestions', totalQuestions);
        setTextContent('percentage', percentage);

        scoreCircleEl.classList.remove('score-pass', 'score-fail');
        scoreCircleEl.classList.add(percentage >= 50 ? 'score-pass' : 'score-fail');
        console.log("Score circle updated.");

        // --- Fetch Quiz Title ---
        if (quizId) {
            // ⭐️⭐️ VÉRIFIE CE CHEMIN ⭐️⭐️
            const quizRefPath = `quizzes/${quizId}`; // Ou 'quizzes/' ?
            console.log("Fetching title from:", quizRefPath);
            get(ref(database, quizRefPath))
                .then(snapshot => {
                    if (snapshot.exists()) {
                         const titleData = snapshot.val();
                         console.log("Title data:", titleData);
                         setTextContent('quizTitle', titleData.Titre_Quiz || titleData.titre_quiz || "Titre Inconnu");
                    } else {
                         console.warn("Quiz title not found for ID:", quizId, "at path", quizRefPath);
                         setTextContent('quizTitle', "Titre Inconnu (ID introuvable)");
                    }
                }).catch(err => {
                     console.error("Error fetching quiz title:", err);
                     setTextContent('quizTitle', "Erreur chargement titre");
                });
        } else {
            console.warn("No quizId in URL for title.");
            setTextContent('quizTitle', "Quiz Non Spécifié");
        }

    } catch (error) {
        console.error("Error in displaySummaryResults:", error);
    }
    console.log("Finished displaySummaryResults.");
}

// ------------------------------------
// 📄 Display Detailed Results (from sessionStorage - FULL VERSION)
// ------------------------------------
function displayDetailedResults() {
    console.log("Running displayDetailedResults...");
    const detailedResultsContainer = document.getElementById('detailedResults');
    if (!detailedResultsContainer) {
        console.error("Element #detailedResults NOT FOUND!");
        return;
    }

    // Initial loading state
    detailedResultsContainer.innerHTML = `<div class="text-center text-muted p-5"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div> Chargement...</div>`;

    const detailsJson = sessionStorage.getItem("latestQuizDetails");
    console.log("Raw details JSON:", detailsJson ? detailsJson.substring(0, 100) + "..." : "null");

    if (!detailsJson) {
        detailedResultsContainer.innerHTML = `<p class="text-center text-muted">Détails des réponses non disponibles.</p>`;
        return;
    }

    try {
        const detailsArray = JSON.parse(detailsJson);
        console.log("Parsed detailsArray:", detailsArray);

        detailedResultsContainer.innerHTML = ""; // Clear loading message

        if (!Array.isArray(detailsArray) || detailsArray.length === 0) {
             detailedResultsContainer.innerHTML = `<p class="text-center text-muted">Aucun détail à afficher.</p>`;
             return;
        }

        // --- Loop through details and build HTML ---
        detailsArray.forEach((item, index) => {
            console.log(`Processing item ${index}:`, item);

            const resultItem = document.createElement('div');
            const itemClass = item.isCorrect ? 'correct-answer' : 'incorrect-answer';
            const iconClass = item.isCorrect ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
            resultItem.className = `result-item ${itemClass} mb-3`; // Classes defined in quiz-results.css

            // Safely determine question type based on correctAnswer format
            let qType = 'calcul'; // Default
            if (item.correctAnswer !== undefined) {
                if (typeof item.correctAnswer === 'number' && Array.isArray(item.options)) {
                    qType = 'qcm';
                } else if (typeof item.correctAnswer === 'boolean') {
                    qType = 'vrai/faux';
                }
            }

            // --- Format User Answer ---
            let userAnswerDisplay = item.userAnswer ?? "Non répondu";
            try {
                if (qType === 'qcm' && Array.isArray(item.options) && item.userAnswer !== "Non répondu") {
                    const userAnswerIndex = parseInt(item.userAnswer);
                    if (userAnswerIndex >= 0 && userAnswerIndex < item.options.length) {
                        const letter = String.fromCharCode(65 + userAnswerIndex);
                        userAnswerDisplay = `${letter}. ${item.options[userAnswerIndex]}`;
                    } else { userAnswerDisplay = `Réponse invalide: ${item.userAnswer}`; }
                } else if (qType === 'vrai/faux') {
                     userAnswerDisplay = item.userAnswer === 'true' ? 'Vrai' : item.userAnswer === 'false' ? 'Faux' : "Non répondu";
                }
                // For 'calcul', keep userAnswerDisplay as is
            } catch (formatError) { console.error(`Error formatting user answer ${index}:`, formatError); }

            // --- Format Correct Answer (only if incorrect) ---
            let correctAnswerDisplay = "";
            if (!item.isCorrect) {
                 let correctText = item.correctAnswer ?? 'N/A'; // Use ?? for null/undefined
                 try {
                     if (qType === 'qcm' && Array.isArray(item.options) && item.correctAnswer >= 0 && item.correctAnswer < item.options.length) {
                         const correctLetter = String.fromCharCode(65 + item.correctAnswer);
                         correctText = `${correctLetter}. ${item.options[item.correctAnswer]}`;
                     } else if (qType === 'vrai/faux') {
                          correctText = item.correctAnswer ? 'Vrai' : 'Faux';
                     }
                 } catch (formatError) { console.error(`Error formatting correct answer ${index}:`, formatError); }
                 correctAnswerDisplay = `<span class="correct-answer-text"><strong>Réponse correcte :</strong> ${correctText}</span>`;
            }

            // --- Build Inner HTML ---
            resultItem.innerHTML = `
                <p class="mb-1"><strong>Question ${item.questionNumber || (index + 1)}:</strong> ${item.questionText || '?'}</p>
                <span class="user-answer">Votre réponse : ${userAnswerDisplay}</span>
                ${correctAnswerDisplay}
                <i class="bi ${iconClass} result-icon"></i>
            `;

            detailedResultsContainer.appendChild(resultItem);
            console.log(`Appended item ${index}`);

        }); // End forEach

        // sessionStorage.removeItem("latestQuizDetails"); // Uncomment in production

    } catch (e) {
        console.error("ERREUR displaying details:", e);
        detailedResultsContainer.innerHTML = `<p class="text-center text-danger">Erreur: ${e.message}</p>`;
    }
    console.log("Finished displayDetailedResults.");
}