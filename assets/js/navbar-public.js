document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("navbar");
  
  // Make sure this path is correct relative to your index.html
  const response = await fetch("./components/navbar-public.html"); 
  
  if (response.ok) {
    container.innerHTML = await response.text();
  } else {
    console.error("Failed to load navbar component:", response.status);
  }
});