// assets/js/admin/check-auth.js
window.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || currentUser.role !== "admin") {
    // Rediriger vers le login si pas connecté ou pas admin
    window.location.href = "../student/login.html";
  } else {
    console.log("Bienvenue Admin :", currentUser.username);
  }
});
