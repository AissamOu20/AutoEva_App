// ===============================
// 🔒 change-password.js (Improved Fluidity)
// ===============================

import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { database } from "../db/firebase-config.js";
import { checkAuth } from "../user.js"; // Assuming checkAuth handles redirection if not logged in

// --- DOM Elements ---
const form = document.getElementById("changePasswordForm");
const oldPasswordInput = document.getElementById("oldPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const showPasswordCheck = document.getElementById("showPasswordCheck");
const errorMsgEl = document.getElementById("errorMsg");
const successMsgEl = document.getElementById("successMsg");
const submitButton = form.querySelector('button[type="submit"]');
const buttonText = document.getElementById("updateButtonText");
const buttonSpinner = document.getElementById("updateSpinner");
const toastContainer = document.getElementById("toastContainer"); // For general toasts

// --- Utility Functions ---

// Show/hide spinner and disable/enable button
function setLoadingState(isLoading) {
    if (!submitButton || !buttonText || !buttonSpinner) return;
    if (isLoading) {
        buttonText.textContent = "Mise à jour..."; // Change text
        buttonSpinner.style.display = "inline-block"; // Show spinner
        submitButton.disabled = true; // Disable button
    } else {
        buttonText.textContent = "Mettre à jour"; // Restore text
        buttonSpinner.style.display = "none"; // Hide spinner
        submitButton.disabled = false; // Enable button
    }
}

// Display messages within the form
function showFormMessage(element, message, isError = true) {
    if (!element) return;
    element.textContent = message;
    element.style.display = message ? "block" : "none"; // Show if message exists
    // Clear the other message type
    const otherElement = isError ? successMsgEl : errorMsgEl;
    if (otherElement) otherElement.style.display = "none";
}

// Simple Toast Notification (Bootstrap 5)
function showToast(message, type = "info") {
    if (!toastContainer) return; // Need the container from HTML
    const toastEl = document.createElement("div");
    // Use Bootstrap background color classes
    const bgClass = type === 'danger' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
    toastEl.className = `toast align-items-center text-bg-${bgClass} border-0 show`; // Add 'show' class
    toastEl.role = "alert";
    toastEl.ariaLive = "assertive";
    toastEl.ariaAtomic = "true";
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    toastContainer.appendChild(toastEl);
    // Initialize Bootstrap toast
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 }); // Autohide after 3 seconds
    toast.show();
    // Remove the element from DOM after it's hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// Dynamically load bcryptjs
async function loadBcrypt() {
    if (window.dcodeIO && window.dcodeIO.bcrypt) return window.dcodeIO.bcrypt;
    // Check if script already loading/loaded
    let script = document.querySelector('script[src*="bcrypt.min.js"]');
    if (script && !window.dcodeIO?.bcrypt) { // Script tag exists but lib not ready
        console.log("bcrypt script tag found, waiting for load...");
        return new Promise((resolve, reject) => { // Wait for it
            const timeout = setTimeout(() => reject("Timeout waiting for bcrypt"), 5000);
            const interval = setInterval(() => {
                if (window.dcodeIO && window.dcodeIO.bcrypt) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    console.log("bcrypt loaded after wait.");
                    resolve(window.dcodeIO.bcrypt);
                }
            }, 100);
        });
    } else if (!script) { // Script tag doesn't exist, load it
        console.log("Loading bcrypt script...");
        return new Promise((resolve, reject) => {
            script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";
            script.async = true;
            script.onload = () => {
                if (window.dcodeIO && window.dcodeIO.bcrypt) {
                    console.log("bcrypt loaded successfully.");
                    resolve(window.dcodeIO.bcrypt);
                } else {
                    reject("bcrypt loaded but not found (dcodeIO.bcrypt).");
                }
            };
            script.onerror = (e) => reject("Failed to load bcryptjs: " + (e.message || 'Unknown error'));
            document.head.appendChild(script);
        });
    } else { // Already loaded
         return window.dcodeIO.bcrypt;
    }
}


// --- Event Listeners ---

// Show/hide password fields
if (showPasswordCheck) {
    showPasswordCheck.addEventListener("change", () => {
        const type = showPasswordCheck.checked ? "text" : "password";
        if (oldPasswordInput) oldPasswordInput.type = type;
        if (newPasswordInput) newPasswordInput.type = type;
        if (confirmPasswordInput) confirmPasswordInput.type = type;
    });
}

// Form Submission
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // Prevent page reload
        setLoadingState(true); // Show spinner, disable button
        showFormMessage(errorMsgEl, ""); // Clear previous errors

        let bcrypt;
        let currentUser;

        try {
            // 1. Get Current User & Load bcrypt
            currentUser = await checkAuth(true); // Ensure user is logged in
            if (!currentUser || !currentUser.id) {
                throw new Error("Utilisateur non authentifié.");
            }
            bcrypt = await loadBcrypt();

            // 2. Get User Data & Verify Old Password
            const userRef = ref(database, `users/${currentUser.id}`);
            const snapshot = await get(userRef);
            if (!snapshot.exists()) {
                throw new Error("Utilisateur introuvable dans la base de données.");
            }
            const userData = snapshot.val();
            if (!userData.password) {
                 throw new Error("Impossible de vérifier l'ancien mot de passe (données manquantes).");
            }
            const isOldPasswordCorrect = await bcrypt.compare(oldPasswordInput.value, userData.password);
            if (!isOldPasswordCorrect) {
                throw new Error("Ancien mot de passe incorrect.");
            }

            // 3. Validate New Passwords
            const newPass = newPasswordInput.value;
            const confirmPass = confirmPasswordInput.value;
            if (!newPass || newPass.length < 6) { // Add basic length check
                 throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
            }
            if (newPass !== confirmPass) {
                throw new Error("Les nouveaux mots de passe ne correspondent pas.");
            }
            // Optional: Check if new password is the same as the old one
            if (oldPasswordInput.value === newPass) {
                 throw new Error("Le nouveau mot de passe doit être différent de l'ancien.");
            }


            // 4. Hash New Password
            const hashedNewPassword = await bcrypt.hash(newPass, 10); // 10 salt rounds

            // 5. Update Password in Firebase
            await update(userRef, { password: hashedNewPassword });

            // 6. Success Feedback & Redirect
            showFormMessage(successMsgEl, "Mot de passe mis à jour avec succès ! Redirection...", false);
            form.reset(); // Clear the form
            showPasswordCheck.checked = false; // Uncheck show password
             if (oldPasswordInput) oldPasswordInput.type = "password"; // Reset type just in case
             if (newPasswordInput) newPasswordInput.type = "password";
             if (confirmPasswordInput) confirmPasswordInput.type = "password";


            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = "/student/dashboard.html"; // Redirect to dashboard
            }, 2000); // 2 seconds delay

        } catch (err) {
            console.error("Erreur changement mot de passe:", err);
            showFormMessage(errorMsgEl, err.message || "Une erreur est survenue.", true); // Show error in form
            setLoadingState(false); // Re-enable button on error
        }
        // No finally block needed for setLoadingState(false) because success leads to redirect
    });
} else {
    console.error("Formulaire #changePasswordForm introuvable !");
}