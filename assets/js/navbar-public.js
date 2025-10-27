document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("navbar");
  const response = await fetch("/components/navbar-public.html");
  container.innerHTML = await response.text();
});
