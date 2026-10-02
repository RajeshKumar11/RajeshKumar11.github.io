(function () {
  const grid = document.getElementById('projects-grid');
  const fallback = document.getElementById('projects-fallback');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let projects = [];
  let currentFilter = 'all';

  function cardHtml(project) {
    const stackTags = project.stack
      .map((tag) => `<span class="stack-tag">${escapeHtml(tag)}</span>`)
      .join('');

    const privateBadge = project.private
      ? '<span class="private-badge">Private</span>'
      : '';

    const titleHtml = (!project.private && project.url)
      ? `<h3><a href="${escapeAttr(project.url)}" target="_blank" rel="noopener">${escapeHtml(project.displayName)}</a></h3>`
      : `<h3>${escapeHtml(project.displayName)}</h3>`;

    const impactHtml = project.impact
      ? `<p class="impact">${escapeHtml(project.impact)}</p>`
      : '';

    const liveLinkHtml = project.liveUrl
      ? `<a class="live-link" href="${escapeAttr(project.liveUrl)}" target="_blank" rel="noopener">Live site &rarr;</a>`
      : '';

    return `
      <div class="project-card" data-visibility="${project.private ? 'private' : 'public'}">
        ${privateBadge}
        ${titleHtml}
        <p>${escapeHtml(project.description)}</p>
        ${impactHtml}
        <div class="stack-tags">${stackTags}</div>
        ${liveLinkHtml}
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  function render() {
    const visible = projects.filter((p) => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'public') return !p.private;
      if (currentFilter === 'private') return p.private;
      return true;
    });
    grid.innerHTML = visible.map(cardHtml).join('');
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  fetch('data/projects.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load projects.json');
      return res.json();
    })
    .then((data) => {
      projects = data;
      render();
    })
    .catch(() => {
      fallback.hidden = false;
    });
})();
