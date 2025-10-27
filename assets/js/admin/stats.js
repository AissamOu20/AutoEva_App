
// ===============================
// 📊 stats.js (Version Améliorée)
// ===============================

import { database, ref, get } from "../db/firebase-config.js";

// DOM Elements pour les stats
const studentCountEl = document.getElementById('studentCount');
const groupCountEl = document.getElementById('groupCount');
const totalAttemptsStatEl = document.getElementById('totalAttemptsStat');
const averageScoreStatEl = document.getElementById('averageScoreStat');
const popularQuizStatEl = document.getElementById('popularQuizStat');
const activeQuizCountEl = document.getElementById('activeQuizCount');
const totalQuestionCountEl = document.getElementById('totalQuestionCount');

// DOM Elements pour les classements
const groupRankingTableBody = document.getElementById('groupRankingTable')?.querySelector('tbody');
const studentRankingTableBody = document.getElementById('studentRankingTable')?.querySelector('tbody');

// DOM Elements pour les graphiques
const groupChartCtx = document.getElementById('groupChart')?.getContext('2d');
const categoryChartCtx = document.getElementById('categoryChart')?.getContext('2d'); // Note: ID changé

// Instances des graphiques (pour pouvoir les détruire/mettre à jour)
let groupChartInstance = null;
let categoryChartInstance = null;

// ===============================
// FONCTION PRINCIPALE : Charger et afficher toutes les stats
// ===============================
async function loadAndDisplayStats() {
    console.log("Chargement des statistiques...");
    // Mettre des placeholders de chargement
    if (studentCountEl) studentCountEl.textContent = '...';
    if (groupCountEl) groupCountEl.textContent = '...';
    if (totalAttemptsStatEl) totalAttemptsStatEl.textContent = '...';
    if (averageScoreStatEl) averageScoreStatEl.textContent = '...%';
    if (popularQuizStatEl) popularQuizStatEl.innerHTML = '<p class="text-center text-muted">Chargement...</p>';
    if (activeQuizCountEl) activeQuizCountEl.textContent = '...';
    if (totalQuestionCountEl) totalQuestionCountEl.textContent = '...';
    if (groupRankingTableBody) groupRankingTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Chargement...</td></tr>';
    if (studentRankingTableBody) studentRankingTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Chargement...</td></tr>';

    try {
        // 1. Récupérer toutes les données nécessaires en parallèle
        const [usersSnap, groupsSnap, quizzesSnap, resultsSnap, questionsSnap] = await Promise.all([
            get(ref(database, 'users')),
            get(ref(database, 'groups')),
            get(ref(database, 'quizzes')), // Attention 'quizzs' vs 'quizzes'
            get(ref(database, 'results')),
            get(ref(database, 'questions'))
        ]);

        const usersData = usersSnap.val() || {};
        const groupsData = groupsSnap.val() || {};
        const quizzesData = quizzesSnap.val() || {};
        const resultsData = resultsSnap.val() || {};
        const questionsData = questionsSnap.val() || {};

        // Filtrer les étudiants
        const studentsArray = Object.values(usersData).filter(u => u.role === 'student');
        const groupsArray = Object.values(groupsData);
        const quizzesArray = Object.values(quizzesData);
        const resultsArray = Object.values(resultsData);
        const questionsArray = Object.values(questionsData);

        // 2. Calculer les statistiques
        const studentCount = studentsArray.length;
        const groupCount = groupsArray.length;
        const totalAttempts = resultsArray.length;
        const activeQuizzes = quizzesArray.filter(q => (q.totalQuestions || 0) > 0);
        const activeQuizCount = activeQuizzes.length;
        const totalQuestionCount = questionsArray.length;

        // Calcul du score moyen
        let totalPercentageSum = 0;
        resultsArray.forEach(result => {
            totalPercentageSum += result.percentage || 0;
        });
        const averageScore = totalAttempts > 0 ? (totalPercentageSum / totalAttempts).toFixed(1) : 0;

        // Trouver le quiz le plus populaire
        const quizAttemptsCount = {};
        resultsArray.forEach(result => {
            quizAttemptsCount[result.quizId] = (quizAttemptsCount[result.quizId] || 0) + 1;
        });
        let mostPopularQuizId = null;
        let maxAttempts = 0;
        for (const quizId in quizAttemptsCount) {
            if (quizAttemptsCount[quizId] > maxAttempts) {
                maxAttempts = quizAttemptsCount[quizId];
                mostPopularQuizId = quizId;
            }
        }
        const popularQuizInfo = mostPopularQuizId ? quizzesData[mostPopularQuizId] : null;

        // Calculer les tentatives par catégorie
        const attemptsPerCategory = {};
        const quizCategoryMap = {}; // Pour éviter de chercher dans quizzesData à chaque fois
        Object.entries(quizzesData).forEach(([id, quiz]) => {
            quizCategoryMap[id] = quiz.categorie || 'Non catégorisé';
        });
        resultsArray.forEach(result => {
            const category = quizCategoryMap[result.quizId] || 'Non catégorisé';
            attemptsPerCategory[category] = (attemptsPerCategory[category] || 0) + 1;
        });


        // 3. Mettre à jour l'interface utilisateur (DOM)
        if (studentCountEl) studentCountEl.textContent = studentCount;
        if (groupCountEl) groupCountEl.textContent = groupCount;
        if (totalAttemptsStatEl) totalAttemptsStatEl.textContent = totalAttempts;
        if (averageScoreStatEl) averageScoreStatEl.textContent = `${averageScore}%`;
        if (activeQuizCountEl) activeQuizCountEl.textContent = activeQuizCount;
        if (totalQuestionCountEl) totalQuestionCountEl.textContent = totalQuestionCount;

        // Afficher le quiz populaire
        if (popularQuizStatEl) {
            if (popularQuizInfo) {
                popularQuizStatEl.innerHTML = `
                    <h5 class="mb-1">${popularQuizInfo.titre_quiz || 'Titre inconnu'}</h5>
                    <p class="text-muted mb-0">(${maxAttempts} tentatives)</p>`;
            } else {
                popularQuizStatEl.innerHTML = '<p class="text-center text-muted">Pas encore de tentatives.</p>';
            }
        }

        // Afficher les classements
        renderGroupRanking(groupsArray);
        renderStudentRanking(studentsArray);

        // Mettre à jour les graphiques
        updateGroupChart(groupsArray);
        updateCategoryChart(attemptsPerCategory);

        console.log("Statistiques chargées et affichées.");

    } catch (error) {
        console.error("Erreur lors du chargement/affichage des stats:", error);
        // Afficher des messages d'erreur dans l'UI
        if (studentCountEl) studentCountEl.textContent = 'Erreur';
        // ... (faire de même pour les autres éléments)
         groupsContainer.innerHTML = '<p class="text-center text-danger">Erreur de chargement des statistiques.</p>'; // Exemple
    }
}

// ===============================
// FONCTIONS D'AFFICHAGE (TABLEAUX)
// ===============================
function renderGroupRanking(groups) {
    if (!groupRankingTableBody) return;
    // Trier par rang (déjà fait dans groupsData si `updateGroups` est exécuté) ou par points
    groups.sort((a, b) => (a.rang || 999) - (b.rang || 999) || (b.total_points || 0) - (a.total_points || 0));
    
    groupRankingTableBody.innerHTML = ""; // Vider
    groups.slice(0, 10).forEach((group, index) => { // Limiter aux 10 premiers
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${group.rang || (index + 1)}</td>
            <td>${group.nom || 'N/A'}</td>
            <td>${group.total_points || 0}</td>
            <td>${(group.etudiants || []).length}</td>
        `;
        groupRankingTableBody.appendChild(row);
    });
     if (groups.length === 0) {
        groupRankingTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun groupe.</td></tr>';
    }
}

function renderStudentRanking(students) {
    if (!studentRankingTableBody) return;
    // Trier par points décroissants
    students.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    studentRankingTableBody.innerHTML = ""; // Vider
    students.slice(0, 10).forEach((student, index) => { // Limiter aux 10 premiers
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${student.nom || ''} ${student.prenom || ''}</td>
            <td>${student.totalPoints || 0}</td>
            <td>${student.group || 'N/A'}</td>
        `;
        studentRankingTableBody.appendChild(row);
    });
     if (students.length === 0) {
        studentRankingTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun étudiant.</td></tr>';
    }
}

// ===============================
// FONCTIONS D'AFFICHAGE (GRAPHIQUES)
// ===============================
function updateGroupChart(groups) {
    if (!groupChartCtx) return;

    // Trier les groupes par points pour le graphique
    groups.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    const labels = groups.map(g => g.nom);
    const dataPoints = groups.map(g => g.total_points || 0);

    // Détruire l'ancien graphique s'il existe
    if (groupChartInstance) {
        groupChartInstance.destroy();
    }

    // Créer le nouveau graphique
    groupChartInstance = new Chart(groupChartCtx, {
        type: 'bar', // ou 'doughnut', 'pie'
        data: {
            labels: labels,
            datasets: [{
                label: 'Total des Points',
                data: dataPoints,
                backgroundColor: generateColors(groups.length), // Générer des couleurs
                borderColor: generateColors(groups.length, true), // Couleurs de bordure
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false // Masquer la légende si beaucoup de groupes
                }
            }
        }
    });
}

function updateCategoryChart(attemptsPerCategory) {
    if (!categoryChartCtx) return;

    const labels = Object.keys(attemptsPerCategory);
    const dataCounts = Object.values(attemptsPerCategory);

    // Détruire l'ancien graphique
    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    // Créer le nouveau graphique
    categoryChartInstance = new Chart(categoryChartCtx, {
        type: 'doughnut', // ou 'pie', 'bar'
        data: {
            labels: labels,
            datasets: [{
                label: 'Tentatives',
                data: dataCounts,
                backgroundColor: generateColors(labels.length),
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
             plugins: {
                legend: {
                    position: 'top', // Ou 'bottom', 'left', 'right'
                },
                 title: {
                    display: true,
                    text: 'Répartition des tentatives par catégorie'
                }
            }
        }
    });
}

// ===============================
// UTILITAIRES
// ===============================
// Génère un tableau de couleurs pour les graphiques
function generateColors(count, border = false) {
    const colors = [
        'rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)', 'rgba(83, 102, 255, 0.8)', 'rgba(40, 159, 64, 0.8)',
        'rgba(210, 99, 132, 0.8)'
    ];
     const borderColors = [
        'rgba(54, 162, 235, 1)','rgba(255, 99, 132, 1)','rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)',
        'rgba(199, 199, 199, 1)','rgba(83, 102, 255, 1)','rgba(40, 159, 64, 1)',
        'rgba(210, 99, 132, 1)'
    ];

    const palette = border ? borderColors : colors;
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(palette[i % palette.length]); // Boucle sur la palette si besoin
    }
    return result;
}


// ===============================
// DÉMARRAGE : Lancer le chargement au chargement de la page
// ===============================
document.addEventListener('DOMContentLoaded', loadAndDisplayStats);

// Optionnel: Recharger les stats périodiquement (si on n'utilise pas onValue)
// setInterval(loadAndDisplayStats, 60000); // Toutes les minutes