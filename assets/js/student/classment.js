// ===============================
// 🏅 classment.js
// Logic for the full student leaderboard page
// ===============================

import { database, ref, get } from "../db/firebase-config.js";
import { checkAuth } from "../user.js"; // Import checkAuth to get current user

const leaderboardContainer = document.getElementById("leaderboardContainer");
let currentUserId = null; // Variable to store the logged-in user's ID

// ============================
// 🔹 Skeleton Loading
// ============================
function showStudentSkeletons(count = 9) { // Show a few more skeletons for the full page
    if (!leaderboardContainer) return;
    leaderboardContainer.innerHTML = ""; // Clear previous content
    for (let i = 0; i < count; i++) {
        const col = document.createElement("div");
        col.className = "col"; // Use row-cols-* classes defined in HTML
        // Use the structure matching the CSS skeleton styles
        col.innerHTML = `
            <div class="leaderboard-card skeleton-card">
                <div class="rank-badge skeleton"></div>
                <div class="avatar skeleton"></div>
                <div class="name skeleton"></div>
                <div class="details skeleton"></div>
                <div class="points skeleton"></div>
            </div>
        `;
        leaderboardContainer.appendChild(col);
    }
}

// ============================
// 🔹 Initial Load & Auth
// ============================
document.addEventListener("DOMContentLoaded", async () => {
    showStudentSkeletons(9); // Show skeletons first

    // Get current user ID for highlighting
    const currentUser = await checkAuth(true);
    if (currentUser) {
        currentUserId = currentUser.id; // Store the ID
    } else {
         // Redirect to login if not authenticated (optional, depends on page access rules)
         console.warn("User not authenticated, cannot highlight current user.");
         // window.location.href = './login.html';
         // return;
    }

    await loadFullLeaderboard(); // Load the actual data
});

// ============================
// 🔹 Load Full Student Leaderboard
// ============================
async function loadFullLeaderboard() {
    if (!leaderboardContainer) return;

    try {
        const usersRef = ref(database, "users");
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            leaderboardContainer.innerHTML = "<p class='text-center text-muted w-100'>Aucun étudiant trouvé.</p>";
            return;
        }

        const users = Object.values(snapshot.val())
            .filter(u => u.role === "student")
            .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

        leaderboardContainer.innerHTML = ""; // Clear skeletons

        if (users.length === 0) {
             leaderboardContainer.innerHTML = "<p class='text-center text-muted w-100'>Le classement est vide.</p>";
             return;
        }

        users.forEach((user, index) => {
            const rank = index + 1;
            const col = document.createElement("div");
            col.className = "col";

            // Determine classes for styling
            let cardClasses = "leaderboard-card student-card"; // Base classes
            if (rank === 1) cardClasses += " rank-1";
            else if (rank === 2) cardClasses += " rank-2";
            else if (rank === 3) cardClasses += " rank-3";

            // ⭐️ Check if this card belongs to the current user ⭐️
            if (currentUserId && user.id.toString() === currentUserId.toString()) {
                cardClasses += " current-user"; // Add the highlight class
            }

            col.innerHTML = `
                <div class="${cardClasses}"> 
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
            leaderboardContainer.appendChild(col);
        });

    } catch (error) {
        console.error("Erreur chargement classement complet:", error);
        leaderboardContainer.innerHTML = "<p class='text-center text-danger w-100'>Erreur de chargement du classement.</p>";
    }
}