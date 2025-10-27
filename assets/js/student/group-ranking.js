// ===============================
// 🏅 group-ranking.js
// Logic for displaying ranking within a specific group
// ===============================

import { database, ref, get, query, orderByChild, equalTo } from "../db/firebase-config.js"; // Adjusted path
import { checkAuth } from "../user.js"; // Adjusted path

// DOM Elements
const groupNameDisplay = document.getElementById("groupNameDisplay");
const groupRankingTableBody = document.getElementById("groupRankingTableBody");

let currentUserId = null; // Store logged-in user's ID

// ============================
// Initialization
// ============================
document.addEventListener("DOMContentLoaded", async () => {
    // Show initial loading state (using placeholders in HTML)
    console.log("Group Ranking Page Loaded");

    // Get current user for highlighting
    try {
        const currentUser = await checkAuth(true); // Ensure logged in
        if (currentUser) {
            currentUserId = currentUser.id;
        } else {
             // Redirect or handle unauthenticated access if needed
             window.location.href = '/student/login.html';
             return;
        }
    } catch (error) {
         console.error("Auth check failed:", error);
         if (groupRankingTableBody) groupRankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erreur d'authentification.</td></tr>`;
         return;
    }


    // Get group name from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const groupName = urlParams.get('group');

    if (!groupName) {
        if (groupNameDisplay) groupNameDisplay.textContent = "Groupe Non Spécifié";
        if (groupRankingTableBody) groupRankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Aucun nom de groupe fourni dans l'URL.</td></tr>`;
        return;
    }

    if (groupNameDisplay) groupNameDisplay.textContent = decodeURIComponent(groupName); // Display decoded group name

    await loadGroupRanking(groupName);
});

// ============================
// Load and Display Group Ranking
// ============================
async function loadGroupRanking(groupName) {
    if (!groupRankingTableBody) return;
    groupRankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted placeholder-glow"><span class="placeholder col-6"></span></td></tr>`; // Loading state

    try {
        // Query users specifically for the target group
        const usersQuery = query(ref(database, "users"), orderByChild("group"), equalTo(groupName));
        const snapshot = await get(usersQuery);

        if (!snapshot.exists()) {
            groupRankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aucun étudiant trouvé dans le groupe "${groupName}".</td></tr>`;
            return;
        }

        // Filter for students (just in case), sort by points
        const groupMembers = Object.values(snapshot.val())
            .filter(u => u.role === "student") // Ensure they are students
            .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)); // Sort by points descending

        groupRankingTableBody.innerHTML = ""; // Clear loading/previous rows

        if (groupMembers.length === 0) {
            groupRankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aucun étudiant classé dans ce groupe.</td></tr>`;
            return;
        }

        // Generate table rows
        groupMembers.forEach((student, index) => {
            const rank = index + 1;
            const row = document.createElement("tr");

            // Check if this row is the current user
            const isCurrentUser = (currentUserId && student.id.toString() === currentUserId.toString());
            if (isCurrentUser) {
                row.classList.add("current-user-row"); // Add highlight class
            }

            row.innerHTML = `
                <td class="text-center rank-col">${rank}</td>
                <td class="avatar-col text-center">
                    <img src="${student.avatar || '/assets/img/user.png'}" class="avatar" alt="Avatar">
                </td>
                <td>${student.nom || ''} ${student.prenom || ''}</td>
                <td class="text-end points-col">${student.totalPoints || 0}</td>
            `;
            groupRankingTableBody.appendChild(row);
        });

    } catch (error) {
        console.error(`Erreur chargement classement pour groupe "${groupName}":`, error);
        groupRankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erreur de chargement du classement.</td></tr>`;
    }
}