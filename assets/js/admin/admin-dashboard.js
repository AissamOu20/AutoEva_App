
  // Sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar a[data-section]');
    const sections = document.querySelectorAll('.section');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.dataset.section;
        sections.forEach(sec => sec.style.display = 'none');
        document.getElementById(target).style.display = 'block';
        sidebarLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    // Collapse sidebar
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseBtn');
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      collapseBtn.querySelector('i').classList.toggle('bi-chevron-right');
      collapseBtn.querySelector('i').classList.toggle('bi-chevron-left');
    });