// ✅ NEW CODE
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("navbar");
  
  // This path works from any page (e.g., /index.html or /student/login.html)
  // It assumes your component is at /AutoEva_App/components/navbar-public.html
  const response = await fetch("/AutoEva_App/components/navbar-public.html"); 
  
  if (response.ok) {
    container.innerHTML = await response.text();
  } else {
    console.error("Failed to load navbar component.");
  }
});