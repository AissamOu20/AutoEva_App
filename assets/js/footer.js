// footer.js
document.addEventListener("DOMContentLoaded", () => {
  const footerContainer = document.getElementById("footer");
  if (!footerContainer) return;

  fetch('../components/footer.html')
    .then(response => response.text())
    .then(data => {
      footerContainer.innerHTML = data;
    })
    .catch(err => console.error("Erreur chargement footer :", err));
});
