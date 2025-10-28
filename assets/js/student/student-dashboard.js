// ===============================
// 🚀 student-dashboard.js (Highlight User & Group Button)
// ===============================

import { database, ref, get } from "../db/firebase-config.js";
import { checkAuth } from "../user.js";

// DOM Containers
const studentLeaderboardContainer = document.getElementById("leaderboardContainer");
const groupLeaderboardContainer = document.getElementById("groupsLeaderboard");
const usernameDisplayWelcome = document.getElementById("usernameDisplayWelcome");
let currentUserId = null; // Variable for logged-in user's ID

// ============================
// Skeleton Loading (Unchanged)
// ============================
function showSkeletons(container, count = 10, type = 'student') {
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const col = document.createElement("div");
        col.className = "col";
        col.innerHTML = `
            <div class="leaderboard-card skeleton-card">
                <div class="rank-badge skeleton"></div>
                <div class="avatar skeleton"></div>
                <div class="name skeleton"></div>
                <div class="details skeleton"></div>
                <div class="points skeleton"></div>
            </div>
        `;
        container.appendChild(col);
    }
}

// ============================
// Auth Check & Initial Load
// ============================
document.addEventListener("DOMContentLoaded", async () => {
    showSkeletons(studentLeaderboardContainer, 10);
    showSkeletons(groupLeaderboardContainer, 6);

    const currentUser = await checkAuth(true);
    if (!currentUser) {
        window.location.href = "./login.html"; return;
    }
    currentUserId = currentUser.id; // Store current user ID

    if (usernameDisplayWelcome) {
        usernameDisplayWelcome.textContent = currentUser.prenom || currentUser.username || "Utilisateur";
    }

    await loadStudentLeaderboard();
    await loadGroupLeaderboard();
});

// ============================
// Load Student Leaderboard (Top 6 + Highlight)
// ============================
async function loadStudentLeaderboard() {
    if (!studentLeaderboardContainer) return;
    try {
        const usersRef = ref(database, "users");
        const snapshot = await get(usersRef);
        if (!snapshot.exists()) { studentLeaderboardContainer.innerHTML = "<p>Aucun étudiant.</p>"; return; }

        const users = Object.values(snapshot.val())
            .filter(u => u.role === "student")
            .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

        studentLeaderboardContainer.innerHTML = "";
        const topStudents = users.slice(0, 10);

        if (topStudents.length === 0) { studentLeaderboardContainer.innerHTML = "<p>Classement vide.</p>"; /* Handle removing button */ return; }

        topStudents.forEach((user, index) => {
            const rank = index + 1;
            const col = document.createElement("div");
            col.className = "col";

            let rankClass = `rank-${rank}`;
            if (rank > 3) rankClass = '';

            // ⭐️ Check if current user ⭐️
            let currentUserClass = (currentUserId && user.id.toString() === currentUserId.toString()) ? " current-user" : "";

            col.innerHTML = `
               
                <div class="leaderboard-card student-card ${rankClass}${currentUserClass}">
                    <span class="rank-badge">${rank}</span>
                    <img src="${user.avatar || '../assets/img/user.png'}" class="avatar" alt="Avatar">
                    <div class="name">${user.nom || ''} ${user.prenom || ''}</div>
                    <div class="details">Groupe: ${user.group || "N/A"}</div>
                    <div class="points">
                        <i class="bi bi-star-fill text-success"></i> ${user.totalPoints || 0} pts
                    </div>
                     <a href="./profile.html?id=${user.id}" class="btn btn-sm btn-outline-secondary mt-2 stretched-link">Voir Profil</a>
                </div>
            `;
            studentLeaderboardContainer.appendChild(col);
        });

        // Add/Remove "Voir plus" button
        const parent = studentLeaderboardContainer.parentNode;
        const existingButton = parent?.querySelector('.see-more-students');
        if (existingButton) existingButton.remove();
        if (users.length > 6 && parent) {
            const seeMoreWrapper = document.createElement("div");
            seeMoreWrapper.className = "w-100 text-center mt-4 see-more-students";
            seeMoreWrapper.innerHTML = `<a href="classment.html" class="btn btn-outline-primary rounded-pill px-4">Voir le classement complet</a>`;
            parent.appendChild(seeMoreWrapper);
        }

    } catch (error) { /* Error handling... */ console.error(error); studentLeaderboardContainer.innerHTML = "<p>Erreur chargement.</p>"; }
}

// ============================
// Load Group Leaderboard (Top 6 + Button)
// ============================
async function loadGroupLeaderboard() {
    if (!groupLeaderboardContainer) return;
    try {
        const groupsRef = ref(database, "groups");
        const snapshot = await get(groupsRef);
        if (!snapshot.exists()) { groupLeaderboardContainer.innerHTML = "<p>Aucun groupe.</p>"; return; }

        const groups = Object.values(snapshot.val())
            .sort((a, b) => (a.rang || 999) - (b.rang || 999));

        groupLeaderboardContainer.innerHTML = "";
        const topGroups = groups.slice(0, 6);

         if (topGroups.length === 0) { groupLeaderboardContainer.innerHTML = "<p>Aucun groupe classé.</p>"; /* Handle removing button */ return; }

        topGroups.forEach((group) => {
            const rank = group.rang || '-';
            const studentCount = (group.etudiants || []).length;
            const totalPoints = group.total_points || 0;
            const groupNameEncoded = encodeURIComponent(group.nom || ''); // Encode for URL

            const col = document.createElement("div");
            col.className = "col";

            let rankClass = `rank-${rank}`;
            if (rank > 3 || typeof rank !== 'number') rankClass = '';

            col.innerHTML = `
                <div class="leaderboard-card group-card ${rankClass}">
                    <span class="rank-badge">${rank}</span>
                    <div class="name mt-3">${group.nom || 'Groupe Inconnu'}</div>
                    <div class="details"> ${studentCount} Étudiant(s)</div>
                    <div class="points">
                         <i class="bi bi-trophy-fill text-warning"></i> ${totalPoints} pts Total
                    </div>
                    <a href="group-ranking.html?group=${groupNameEncoded}" class="btn btn-sm btn-outline-info mt-3 btn-group-details">
                        Voir classement du groupe
                    </a>
                </div>
            `;
            groupLeaderboardContainer.appendChild(col);
        });

        // Add/Remove "Voir plus" button
        const parent = groupLeaderboardContainer.parentNode;
        const existingButton = parent?.querySelector('.see-more-groups');
        if (existingButton) existingButton.remove();
        if (groups.length > 8 && parent) {
            const seeMoreWrapper = document.createElement("div");
            seeMoreWrapper.className = "w-100 text-center mt-4 see-more-groups";
            seeMoreWrapper.innerHTML = `<a href="groups-ranking.html" class="btn btn-outline-primary rounded-pill px-4">Voir tous les groupes</a>`;
            parent.appendChild(seeMoreWrapper);
        }

    } catch (error) { /* Error handling... */ console.error(error); groupLeaderboardContainer.innerHTML = "<p>Erreur chargement groupes.</p>"; }
}