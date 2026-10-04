/**
 * admin/admin.js
 * Devnith Portfolio CMS Dashboard Controller
 * Full modern CMS logic: Authentication, Security, Projects, Sections, Media & Inquiries
 */

const AdminApp = (() => {

  // ── State ────────────────────────────────────────────────────
  let token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token') || null;
  let currentUser = null;
  let projects = [];
  let images = [];
  let siteData = {};
  let processData = {};
  let imagePickerTarget = null;
  let deleteCallback = null;
  let currentPage = 'dashboard';

  // ── API Fetch Helper ─────────────────────────────────────────
  async function apiFetch(path, method = 'GET', body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) {
      opts.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body !== null) {
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(path, opts);
    if (!r.ok) {
      if (r.status === 401 && path === '/api/auth/me') {
        // Session expired or invalid on auth check
        token = null;
        localStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_token');
        showLoginScreen('Session expired. Please sign in again.');
      }
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(err.error || 'API error');
    }
    return r.json();
  }

  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 3200);
  }

  function $(id) { return document.getElementById(id); }

  // ── Authentication & Session ──────────────────────────────────
  function initAuth() {
    const loginForm = $('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async e => {
        if (e && e.preventDefault) e.preventDefault();
        const username = $('loginUsername').value.trim();
        const password = $('loginPassword').value;
        const errEl = $('loginError');
        const btn = $('loginBtn');

        errEl.textContent = '';
        btn.innerHTML = '<span>Signing in…</span>';
        btn.disabled = true;

        try {
          const res = await apiFetch('/api/auth/login', 'POST', { username, password });
          token = res.token;
          currentUser = res.user;
          localStorage.setItem('admin_token', token);
          sessionStorage.setItem('admin_token', token);
          showToast(`Welcome back, ${res.user.name || 'Admin'}!`);
          showDashboard(res.user);
        } catch (err) {
          errEl.textContent = err.message || 'Invalid username or password.';
          btn.innerHTML = '<span>Sign In to CMS</span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
          btn.disabled = false;
        }
      });
    }

    const eyeBtn = $('eyeBtn');
    if (eyeBtn) {
      eyeBtn.addEventListener('click', () => {
        const inp = $('loginPassword');
        inp.type = inp.type === 'password' ? 'text' : 'password';
      });
    }

    const logoutBtn = $('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/auth/logout', 'POST');
        } catch (_) {}
        token = null;
        currentUser = null;
        localStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_token');
        showLoginScreen();
        showToast('Signed out successfully.');
      });
    }
  }

  async function checkSession() {
    if (!token) {
      showLoginScreen();
      return;
    }
    try {
      const res = await apiFetch('/api/auth/me');
      currentUser = res.user;
      showDashboard(res.user);
    } catch (_) {
      token = null;
      localStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_token');
      showLoginScreen();
    }
  }

  function showLoginScreen(message = '') {
    $('dashboard').style.display = 'none';
    $('loginScreen').style.display = 'flex';
    const btn = $('loginBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Sign In to CMS</span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
    }
    if (message) {
      $('loginError').textContent = message;
    }
  }

  function showDashboard(user) {
    $('loginScreen').style.display = 'none';
    $('dashboard').style.display = 'flex';
    if (user) {
      const roleEl = $('adminUserRole');
      if (roleEl) roleEl.textContent = user.username ? `@${user.username}` : 'Administrator';
      const avatarEl = $('userAvatar');
      if (avatarEl) avatarEl.textContent = (user.name || 'DK').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }
    loadAll();
  }

  // ── Navigation ────────────────────────────────────────────────
  function initNav() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        switchPage(item.dataset.page);
        if (window.innerWidth < 768) {
          $('sidebar').classList.remove('open');
        }
      });
    });

    const toggle = $('sidebarToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        $('sidebar').classList.toggle('open');
      });
    }
  }

  function switchPage(pageName) {
    currentPage = pageName;
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageName);
    });
    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === `page-${pageName}`);
    });

    const titles = {
      dashboard: 'Dashboard Overview',
      home: 'Home Section CMS',
      about: 'About Me',
      expertise: 'Expertise & Skills',
      projects: 'Projects Manager',
      process: 'Work Process Methodology',
      posts: 'Posts & Articles',
      pages: 'Custom Pages',
      media: 'Media Library',
      contact: 'Contact & Inquiries',
      settings: 'Site Settings',
      security: 'Admin & Security'
    };
    $('topbarTitle').textContent = titles[pageName] || 'Dashboard';

    if (pageName === 'contact') loadContacts();
    if (pageName === 'security') loadAuditLogs();
    if (pageName === 'process') loadProcess();
  }

  // ── Data Loaders ──────────────────────────────────────────────
  async function loadAll() {
    try {
      await Promise.all([
        loadStats(),
        loadProjects(),
        loadSiteData(),
        loadImages()
      ]);
    } catch (err) {
      console.error('Load error:', err);
    }
  }

  async function loadStats() {
    try {
      const stats = await apiFetch('/api/admin/dashboard-stats');
      $('ov-projects').textContent = stats.projects;
      $('ov-images').textContent = stats.images;
      $('ov-contacts').textContent = stats.contacts;
      $('ov-skills').textContent = siteData.skills ? siteData.skills.length : 4;
      $('projectsCount').textContent = stats.projects;

      const inqBadge = $('inquiriesCount');
      if (inqBadge) {
        if (stats.unreadContacts > 0) {
          inqBadge.style.display = 'inline-flex';
          inqBadge.textContent = stats.unreadContacts;
        } else {
          inqBadge.style.display = 'none';
        }
      }
    } catch (e) {
      console.warn('Stats fetch warning:', e.message);
    }
  }

  async function loadProjects() {
    try {
      projects = await apiFetch('/api/projects');
      renderProjects();
      renderRecentProjects();
      renderHomeFeaturedProjects();
      $('projectsCount').textContent = projects.length;
    } catch (err) {
      showToast('Error loading projects', 'error');
    }
  }

  function renderProjects() {
    const grid = $('projectsGrid');
    if (!grid) return;
    if (!projects || projects.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">No projects yet. Click "Add New Project" to create your first one.</div>';
      return;
    }

    grid.innerHTML = projects.map(p => `
      <div class="project-admin-card" data-id="${p.id}">
        <div class="project-admin-thumb-wrap">
          <img src="${p.image || 'assets/images/devnith-cyber.jpg'}" alt="${p.title}" class="project-admin-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 60\'><rect fill=\'%23111827\' width=\'100\' height=\'60\'/></svg>'">
          ${p.badge ? `<span class="badge ${p.badgeType || 'green'}">${p.badge}</span>` : ''}
        </div>
        <div class="project-admin-body">
          <div class="project-admin-cat">${p.categoryLabel || p.category}</div>
          <div class="project-admin-title">${p.title}</div>
          <p class="project-admin-desc">${p.description || ''}</p>
          <div class="project-admin-tags">
            ${(p.tags || []).map(t => `<span class="tag-pill">${t}</span>`).join('')}
          </div>
          <div class="project-admin-actions">
            <button class="btn-icon edit" onclick="AdminApp.editProject('${p.id}')" title="Edit Project">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit
            </button>
            <button class="btn-icon delete" onclick="AdminApp.deleteProject('${p.id}')" title="Delete Project">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderRecentProjects() {
    const list = $('recentProjects');
    if (!list) return;
    const recents = (projects || []).slice(-3).reverse();
    if (recents.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No projects yet.</p>';
      return;
    }
    list.innerHTML = recents.map(p => `
      <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);">
        <img src="${p.image || ''}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;" onerror="this.style.display='none'">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:0.9rem; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.title}</div>
          <div style="font-size:0.75rem; color:var(--cyan);">${p.categoryLabel || p.category}</div>
        </div>
        <button class="btn-ghost-sm" onclick="AdminApp.editProject('${p.id}')">Edit</button>
      </div>
    `).join('');
  }

  // ── Site & Sections Data ──────────────────────────────────────
  async function loadSiteData() {
    try {
      siteData = await apiFetch('/api/site');
      populateForms();
    } catch (e) {
      console.warn('Site data fetch:', e.message);
    }
  }

  function updateImagePreview(inputId) {
    const input = $(inputId);
    const preview = $(inputId + '-preview');
    if (input && preview) {
      preview.src = input.value || 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 60\'><rect fill=\'%23111827\' width=\'100\' height=\'60\'/></svg>';
    }
  }

  function populateForms() {
    if (!siteData) return;

    // ── Populate Complete Home Editor ─────────────────────────
    populateHomeEditor();

    // About Page (standalone)
    if ($('about-name')) $('about-name').value = siteData.name || '';
    if ($('about-title')) $('about-title').value = siteData.title || '';
    if ($('about-location')) $('about-location').value = siteData.location || '';
    if ($('about-email')) $('about-email').value = siteData.email || '';
    if ($('about-phone')) $('about-phone').value = siteData.phone || '';
    if ($('about-availability')) $('about-availability').value = siteData.availability || '';
    if ($('about-bio')) $('about-bio').value = siteData.bio || '';

    // Settings Page (standalone)
    if (siteData.social) {
      if ($('setting-linkedin')) $('setting-linkedin').value = siteData.social.linkedin || '';
      if ($('setting-facebook')) $('setting-facebook').value = siteData.social.facebook || '';
      if ($('setting-instagram')) $('setting-instagram').value = siteData.social.instagram || '';
      if ($('setting-whatsapp')) $('setting-whatsapp').value = siteData.social.whatsapp || '';
    }
    if (siteData.testimonial) {
      if ($('setting-testimonialQuote')) $('setting-testimonialQuote').value = siteData.testimonial.quote || '';
      if ($('setting-testimonialAuthor')) $('setting-testimonialAuthor').value = siteData.testimonial.author || '';
    }

    renderSkills();
  }

  function populateHomeEditor() {
    if (!siteData) return;

    // 1. Hero Section
    if ($('home-tagline')) $('home-tagline').value = siteData.heroTagline || siteData.title || '';
    if ($('home-headline')) $('home-headline').value = siteData.heroHeading || siteData.tagline || '';
    if ($('home-subtext')) $('home-subtext').value = siteData.heroSubtitle || siteData.bio || '';
    if ($('home-heroPortrait')) $('home-heroPortrait').value = siteData.heroPortrait || 'assets/images/devnith-cyber.jpg';
    if ($('home-realPortrait')) $('home-realPortrait').value = siteData.realPortrait || 'assets/images/devnith.jpg';
    updateImagePreview('home-heroPortrait');
    updateImagePreview('home-realPortrait');

    if (siteData.heroStats) {
      if ($('home-stat1')) $('home-stat1').value = siteData.heroStats.experience || '4+';
      if ($('home-stat2')) $('home-stat2').value = siteData.heroStats.projects || '20+';
      if ($('home-stat3')) $('home-stat3').value = siteData.heroStats.platforms || '20+';
    }
    if ($('home-primaryBtnText')) $('home-primaryBtnText').value = (siteData.heroPrimaryBtn && siteData.heroPrimaryBtn.text) || 'View My Work';
    if ($('home-primaryBtnUrl')) $('home-primaryBtnUrl').value = (siteData.heroPrimaryBtn && siteData.heroPrimaryBtn.url) || '#projects';
    if ($('home-secondaryBtnText')) $('home-secondaryBtnText').value = (siteData.heroSecondaryBtn && siteData.heroSecondaryBtn.text) || "Let's Talk";
    if ($('home-secondaryBtnUrl')) $('home-secondaryBtnUrl').value = (siteData.heroSecondaryBtn && siteData.heroSecondaryBtn.url) || '#contact';

    // 2. About / Intro Section
    if ($('home-aboutTagline')) $('home-aboutTagline').value = siteData.aboutTagline || 'PROFILE';
    if ($('home-aboutHeading')) $('home-aboutHeading').value = siteData.aboutHeading || 'About Me';
    if ($('home-aboutName')) $('home-aboutName').value = siteData.name || '';
    if ($('home-aboutTitle')) $('home-aboutTitle').value = siteData.title || '';
    if ($('home-aboutLocation')) $('home-aboutLocation').value = siteData.location || '';
    if ($('home-aboutEmail')) $('home-aboutEmail').value = siteData.email || '';
    if ($('home-aboutPhone')) $('home-aboutPhone').value = siteData.phone || '';
    if ($('home-aboutAvailability')) $('home-aboutAvailability').value = siteData.availability || '';
    if ($('home-aboutBio')) $('home-aboutBio').value = siteData.bio || '';

    // 3. Expertise Section
    if ($('home-expertiseTagline')) $('home-expertiseTagline').value = siteData.expertiseTagline || 'PROFICIENCY';
    if ($('home-expertiseHeading')) $('home-expertiseHeading').value = siteData.expertiseHeading || 'My Expertise';
    if ($('home-coreStack')) $('home-coreStack').value = Array.isArray(siteData.coreStack) ? siteData.coreStack.join(', ') : '';
    renderHomeSkills();

    // 4. Featured Projects Section
    if ($('home-projectsTagline')) $('home-projectsTagline').value = siteData.projectsTagline || 'Portfolio';
    if ($('home-projectsTitle')) $('home-projectsTitle').value = siteData.projectsTitle || 'Selected Work';
    if ($('home-projectsSubtitle')) $('home-projectsSubtitle').value = siteData.projectsSubtitle || '';
    renderHomeFeaturedProjects();

    // 5. Work Process Section
    if ($('home-processTagline')) $('home-processTagline').value = siteData.processTagline || 'Methodology';
    if ($('home-processTitle')) $('home-processTitle').value = siteData.processTitle || 'My Work Process';
    if ($('home-processSubtitle')) $('home-processSubtitle').value = siteData.processSubtitle || '';
    renderHomeProcessSteps();

    // 6. Contact & CTA Section
    if ($('home-contactTagline')) $('home-contactTagline').value = siteData.contactTagline || 'Available For Hire';
    if ($('home-contactTitle')) $('home-contactTitle').value = siteData.contactTitle || "Let's Build Something Great";
    if ($('home-contactSubtitle')) $('home-contactSubtitle').value = siteData.contactSubtitle || '';
    if ($('home-contactAvailability')) $('home-contactAvailability').value = siteData.contactAvailability || 'Open to new opportunities';
    if (siteData.social) {
      if ($('home-linkedin')) $('home-linkedin').value = siteData.social.linkedin || '';
      if ($('home-facebook')) $('home-facebook').value = siteData.social.facebook || '';
      if ($('home-instagram')) $('home-instagram').value = siteData.social.instagram || '';
      if ($('home-whatsapp')) $('home-whatsapp').value = siteData.social.whatsapp || '';
    }
  }

  function renderHomeSkills() {
    const list = $('homeSkillsList');
    if (!list) return;
    const skills = siteData.skills || [];
    list.innerHTML = skills.map((s, idx) => `
      <div class="skill-edit-row" data-idx="${idx}" style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
        <input type="text" class="field-input home-skill-name" value="${s.name}" placeholder="Skill Name" style="flex:2;">
        <input type="text" class="field-input home-skill-details" value="${s.details}" placeholder="Details (e.g. React, Node.js)" style="flex:3;">
        <input type="number" class="field-input home-skill-perc" value="${s.percentage}" min="0" max="100" style="width:80px;" title="Proficiency %">
        <button type="button" class="btn-icon delete" onclick="AdminApp.removeHomeSkill(${idx})" title="Remove skill">✕</button>
      </div>
    `).join('');
  }

  function renderHomeFeaturedProjects() {
    const list = $('homeFeaturedProjectsList');
    if (!list) return;
    if (!projects || projects.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; padding:10px 0;">No projects found. Click "+ Add New Project" to create one.</p>';
      return;
    }
    list.innerHTML = projects.map(p => {
      const isFeatured = p.featured !== false;
      return `
        <div class="featured-proj-card ${isFeatured ? 'is-featured' : ''}" data-id="${p.id}">
          <img src="${p.image || 'assets/images/devnith-cyber.jpg'}" class="featured-proj-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 60\'><rect fill=\'%23111827\' width=\'100\' height=\'60\'/></svg>'">
          <div class="featured-proj-details">
            <div class="featured-proj-title">${p.title}</div>
            <div class="featured-proj-cat">${p.categoryLabel || p.category}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
              <label class="featured-toggle-label">
                <input type="checkbox" class="featured-checkbox" ${isFeatured ? 'checked' : ''} onchange="AdminApp.toggleFeaturedProject('${p.id}', this.checked)">
                Featured
              </label>
              <button type="button" class="btn-ghost-sm" onclick="AdminApp.editProject('${p.id}')" style="font-size:0.75rem; padding:3px 8px;">Edit Details</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderHomeProcessSteps() {
    const container = $('homeProcessStepsList');
    if (!container) return;
    const steps = (processData && processData.steps && processData.steps.length > 0)
      ? processData.steps
      : [
        { num: '01', icon: '🔍', title: 'Discover', desc: 'Requirements gathering, project scope, and target audience analysis.' },
        { num: '02', icon: '📐', title: 'Architecture', desc: 'Tech stack selection, database schemas, and systems design.' },
        { num: '03', icon: '</>', title: 'Development', desc: 'Clean full-stack coding, API integration, and responsive UI build.' },
        { num: '04', icon: '📡', title: 'Streaming Setup', desc: 'Server infrastructure, broadcast engine tuning, and RTMP ingest.' },
        { num: '05', icon: '🛡️', title: 'Testing', desc: 'Performance profiling, security auditing, and cross-browser QA.' },
        { num: '06', icon: '🚀', title: 'Deploy', desc: 'Production launch, CDN caching, and 24/7 telemetry monitoring.' }
      ];

    container.innerHTML = steps.map((st, i) => `
      <div class="glass-panel" style="padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span class="badge cyan">Step ${st.num || String(i+1).padStart(2, '0')}</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.75rem; color:var(--text-muted);">Icon:</span>
            <input type="text" class="field-input home-step-icon" value="${st.icon || '✦'}" style="width:48px; text-align:center; padding:4px;">
          </div>
        </div>
        <div class="field-group" style="margin-bottom:8px;">
          <label class="field-label">Title</label>
          <input type="text" class="field-input home-step-title" value="${st.title || ''}">
        </div>
        <div class="field-group">
          <label class="field-label">Description</label>
          <textarea class="field-textarea home-step-desc" rows="2">${st.desc || ''}</textarea>
        </div>
      </div>
    `).join('');
  }

  function renderSkills() {
    const list = $('skillsEditorList');
    if (!list) return;
    const skills = siteData.skills || [];
    list.innerHTML = skills.map((s, idx) => `
      <div class="skill-edit-row" data-idx="${idx}" style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
        <input type="text" class="field-input skill-name" value="${s.name}" placeholder="Skill Name" style="flex:2;">
        <input type="text" class="field-input skill-details" value="${s.details}" placeholder="Details (e.g. React, Node.js)" style="flex:3;">
        <input type="number" class="field-input skill-perc" value="${s.percentage}" min="0" max="100" style="width:80px;">
        <button type="button" class="btn-icon delete" onclick="AdminApp.removeSkill(${idx})">✕</button>
      </div>
    `).join('');
  }

  async function loadProcess() {
    try {
      processData = await apiFetch('/api/sections/process');
      renderHomeProcessSteps();
      const container = $('processStepsList');
      if (!container || !processData.steps) return;
      container.innerHTML = processData.steps.map((st, i) => `
        <div class="glass-panel" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span class="badge cyan">Step ${st.num}</span>
            <input type="text" class="field-input step-icon" value="${st.icon}" style="width:50px; text-align:center;">
          </div>
          <div class="field-group" style="margin-bottom:8px;">
            <label class="field-label">Title</label>
            <input type="text" class="field-input step-title" value="${st.title}">
          </div>
          <div class="field-group">
            <label class="field-label">Description</label>
            <textarea class="field-textarea step-desc" rows="2">${st.desc}</textarea>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.warn('Process fetch error:', e.message);
    }
  }

  async function loadContacts() {
    const container = $('contactsContainer');
    if (!container) return;
    try {
      const contacts = await apiFetch('/api/admin/contacts');
      if (!contacts || contacts.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); padding:20px 0;">No inquiries received yet.</p>';
        return;
      }
      container.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid var(--border); color:var(--text-muted);">
              <th style="padding:12px 8px;">Date</th>
              <th style="padding:12px 8px;">Sender</th>
              <th style="padding:12px 8px;">Email</th>
              <th style="padding:12px 8px;">Subject</th>
              <th style="padding:12px 8px;">Message</th>
              <th style="padding:12px 8px;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${contacts.map(c => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 8px; color:var(--text-muted); font-size:0.8rem; white-space:nowrap;">${new Date(c.createdAt || Date.now()).toLocaleDateString()}</td>
                <td style="padding:10px 8px; font-weight:600; color:#fff;">${c.name}</td>
                <td style="padding:10px 8px;"><a href="mailto:${c.email}" style="color:var(--cyan);">${c.email}</a></td>
                <td style="padding:10px 8px;">${c.subject || '—'}</td>
                <td style="padding:10px 8px; max-width:300px; color:var(--text-sub); overflow:hidden; text-overflow:ellipsis;">${c.message}</td>
                <td style="padding:10px 8px;">
                  <button class="btn-icon delete" onclick="AdminApp.deleteContact('${c.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      container.innerHTML = `<p style="color:var(--red);">Failed to load inquiries: ${e.message}</p>`;
    }
  }

  async function loadAuditLogs() {
    const container = $('auditLogsContainer');
    if (!container) return;
    try {
      const logs = await apiFetch('/api/admin/audit-logs');
      if (!logs || logs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">No security events recorded.</p>';
        return;
      }
      container.innerHTML = logs.map(l => `
        <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
          <span><strong style="color:var(--cyan);">${l.action}</strong> ${l.attemptedUser ? `[user: ${l.attemptedUser}]` : ''} ${l.filename ? `[file: ${l.filename}]` : ''}</span>
          <span style="color:var(--text-muted); font-size:0.75rem;">${new Date(l.timestamp).toLocaleTimeString()}</span>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<p style="color:var(--red);">Error loading audit logs: ${e.message}</p>`;
    }
  }

  // ── Images & Media Library ────────────────────────────────────
  async function loadImages() {
    try {
      images = await apiFetch('/api/images');
      renderImages();
    } catch (_) {}
  }

  function renderImages() {
    const grid = $('imagesGrid');
    if (!grid) return;
    grid.innerHTML = (images || []).map(img => `
      <div class="image-card">
        <img src="${img.url}" alt="${img.name}" loading="lazy">
        <div class="image-card-footer">
          <span class="img-name" title="${img.name}">${img.name}</span>
          <button class="btn-icon delete" onclick="AdminApp.deleteImage('${img.name}')" title="Delete image">✕</button>
        </div>
      </div>
    `).join('');
  }

  function initMediaUpload() {
    const input = $('imgUploadInput');
    const dropZone = $('dropZone');
    if (!input || !dropZone) return;

    input.addEventListener('change', () => handleUpload(input.files));

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      handleUpload(e.dataTransfer.files);
    });
  }

  async function handleUpload(files) {
    if (!files || files.length === 0) return;
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file, file.name);

      const r = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      if (r.ok) {
        showToast(`Uploaded ${file.name}`);
      } else {
        showToast(`Failed to upload ${file.name}`, 'error');
      }
    }
    loadImages();
  }

  // ── Form Save Listeners ───────────────────────────────────────
  function initSaveHandlers() {
    // Save Home — Full CMS multi-section aggregator
    async function saveHomeContent() {
      const btnTop = $('saveHomeBtn');
      const btnBottom = $('saveHomeBtnBottom');
      const prevHtml = btnTop ? btnTop.innerHTML : '';
      if (btnTop) { btnTop.innerHTML = '<span>Saving...</span>'; btnTop.disabled = true; }
      if (btnBottom) { btnBottom.innerHTML = '<span>Saving...</span>'; btnBottom.disabled = true; }

      // 1. Gather skills from Home editor
      const homeSkills = [];
      document.querySelectorAll('#homeSkillsList .skill-edit-row').forEach(row => {
        const name = (row.querySelector('.home-skill-name') || {}).value;
        const details = (row.querySelector('.home-skill-details') || {}).value;
        const percentage = parseInt((row.querySelector('.home-skill-perc') || {}).value, 10) || 80;
        if (name && name.trim()) homeSkills.push({ name: name.trim(), details: (details || '').trim(), percentage });
      });

      // 2. Gather process steps
      const homeProcessSteps = [];
      document.querySelectorAll('#homeProcessStepsList .glass-panel').forEach((p, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const icon = (p.querySelector('.home-step-icon') || {}).value || '✦';
        const title = (p.querySelector('.home-step-title') || {}).value || '';
        const desc = (p.querySelector('.home-step-desc') || {}).value || '';
        homeProcessSteps.push({ num, icon, title, desc });
      });

      // 3. Gather featured projects
      const updatedProjects = (projects || []).map(p => {
        const checkbox = document.querySelector(`.featured-proj-card[data-id="${p.id}"] .featured-checkbox`);
        const isFeatured = checkbox ? checkbox.checked : (p.featured !== false);
        return { ...p, featured: isFeatured };
      });

      // 4. Construct complete home payload
      const homePayload = {
        // Hero
        heroTagline: $('home-tagline') ? $('home-tagline').value : siteData.heroTagline,
        heroHeading: $('home-headline') ? $('home-headline').value : siteData.heroHeading,
        heroSubtitle: $('home-subtext') ? $('home-subtext').value : siteData.heroSubtitle,
        heroPortrait: $('home-heroPortrait') ? $('home-heroPortrait').value : siteData.heroPortrait,
        realPortrait: $('home-realPortrait') ? $('home-realPortrait').value : siteData.realPortrait,
        heroPrimaryBtn: {
          text: $('home-primaryBtnText') ? $('home-primaryBtnText').value : 'View My Work',
          url: $('home-primaryBtnUrl') ? $('home-primaryBtnUrl').value : '#projects'
        },
        heroSecondaryBtn: {
          text: $('home-secondaryBtnText') ? $('home-secondaryBtnText').value : "Let's Talk",
          url: $('home-secondaryBtnUrl') ? $('home-secondaryBtnUrl').value : '#contact'
        },
        heroStats: {
          experience: $('home-stat1') ? $('home-stat1').value : '4+',
          projects: $('home-stat2') ? $('home-stat2').value : '20+',
          platforms: $('home-stat3') ? $('home-stat3').value : '20+'
        },
        // About
        aboutTagline: $('home-aboutTagline') ? $('home-aboutTagline').value : 'PROFILE',
        aboutHeading: $('home-aboutHeading') ? $('home-aboutHeading').value : 'About Me',
        name: $('home-aboutName') ? $('home-aboutName').value : siteData.name,
        title: $('home-aboutTitle') ? $('home-aboutTitle').value : siteData.title,
        location: $('home-aboutLocation') ? $('home-aboutLocation').value : siteData.location,
        email: $('home-aboutEmail') ? $('home-aboutEmail').value : siteData.email,
        phone: $('home-aboutPhone') ? $('home-aboutPhone').value : siteData.phone,
        availability: $('home-aboutAvailability') ? $('home-aboutAvailability').value : siteData.availability,
        bio: $('home-aboutBio') ? $('home-aboutBio').value : siteData.bio,
        // Expertise
        expertiseTagline: $('home-expertiseTagline') ? $('home-expertiseTagline').value : 'PROFICIENCY',
        expertiseHeading: $('home-expertiseHeading') ? $('home-expertiseHeading').value : 'My Expertise',
        skills: homeSkills.length > 0 ? homeSkills : (siteData.skills || []),
        coreStack: $('home-coreStack') ? $('home-coreStack').value.split(',').map(s => s.trim()).filter(Boolean) : (siteData.coreStack || []),
        // Featured Projects
        projectsTagline: $('home-projectsTagline') ? $('home-projectsTagline').value : 'Portfolio',
        projectsTitle: $('home-projectsTitle') ? $('home-projectsTitle').value : 'Selected Work',
        projectsSubtitle: $('home-projectsSubtitle') ? $('home-projectsSubtitle').value : '',
        projects: updatedProjects,
        // Work Process
        processTagline: $('home-processTagline') ? $('home-processTagline').value : 'Methodology',
        processTitle: $('home-processTitle') ? $('home-processTitle').value : 'My Work Process',
        processSubtitle: $('home-processSubtitle') ? $('home-processSubtitle').value : '',
        processSteps: homeProcessSteps,
        // Contact
        contactTagline: $('home-contactTagline') ? $('home-contactTagline').value : 'Available For Hire',
        contactTitle: $('home-contactTitle') ? $('home-contactTitle').value : "Let's Build Something Great",
        contactSubtitle: $('home-contactSubtitle') ? $('home-contactSubtitle').value : '',
        contactAvailability: $('home-contactAvailability') ? $('home-contactAvailability').value : '',
        social: {
          linkedin: $('home-linkedin') ? $('home-linkedin').value : (siteData.social && siteData.social.linkedin),
          facebook: $('home-facebook') ? $('home-facebook').value : (siteData.social && siteData.social.facebook),
          instagram: $('home-instagram') ? $('home-instagram').value : (siteData.social && siteData.social.instagram),
          whatsapp: $('home-whatsapp') ? $('home-whatsapp').value : (siteData.social && siteData.social.whatsapp)
        }
      };

      try {
        const res = await apiFetch('/api/home', 'PUT', homePayload);
        showToast(res.message || 'Home page CMS content saved successfully!');
        siteData = { ...siteData, ...homePayload };
        projects = updatedProjects;
        loadStats();
      } catch (err) {
        showToast(err.message || 'Failed to save Home content', 'error');
      } finally {
        if (btnTop) { btnTop.innerHTML = prevHtml || '<span>Save Changes</span>'; btnTop.disabled = false; }
        if (btnBottom) { btnBottom.innerHTML = prevHtml || '<span>Save Changes</span>'; btnBottom.disabled = false; }
      }
    }

    if ($('saveHomeBtn')) $('saveHomeBtn').addEventListener('click', saveHomeContent);
    if ($('saveHomeBtnBottom')) $('saveHomeBtnBottom').addEventListener('click', saveHomeContent);

    // Add Skill in Home Editor
    const homeAddSkillBtn = $('homeAddSkillBtn');
    if (homeAddSkillBtn) {
      homeAddSkillBtn.addEventListener('click', () => {
        if (!siteData.skills) siteData.skills = [];
        siteData.skills.push({ name: 'New Skill', details: 'Technologies', percentage: 85 });
        renderHomeSkills();
      });
    }

    // Save About
    const saveAboutBtn = $('saveAboutBtn');
    if (saveAboutBtn) {
      saveAboutBtn.addEventListener('click', async () => {
        siteData.name = $('about-name').value;
        siteData.title = $('about-title').value;
        siteData.location = $('about-location').value;
        siteData.email = $('about-email').value;
        siteData.phone = $('about-phone').value;
        siteData.availability = $('about-availability').value;
        siteData.bio = $('about-bio').value;
        await saveSiteData('About section saved successfully!');
      });
    }

    // Save Expertise
    const saveExpertiseBtn = $('saveExpertiseBtn');
    if (saveExpertiseBtn) {
      saveExpertiseBtn.addEventListener('click', async () => {
        const rows = document.querySelectorAll('.skill-edit-row');
        const updatedSkills = [];
        rows.forEach(r => {
          const name = r.querySelector('.skill-name').value.trim();
          const details = r.querySelector('.skill-details').value.trim();
          const percentage = parseInt(r.querySelector('.skill-perc').value, 10) || 80;
          if (name) updatedSkills.push({ name, details, percentage });
        });
        siteData.skills = updatedSkills;
        await saveSiteData('Expertise saved successfully!');
      });
    }

    const addSkillBtn = $('addSkillBtn');
    if (addSkillBtn) {
      addSkillBtn.addEventListener('click', () => {
        if (!siteData.skills) siteData.skills = [];
        siteData.skills.push({ name: 'New Skill', details: 'Technologies', percentage: 85 });
        renderSkills();
      });
    }

    // Save Settings
    const saveSettingsBtn = $('saveSettingsBtn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', async () => {
        siteData.social = {
          linkedin: $('setting-linkedin').value,
          facebook: $('setting-facebook').value,
          instagram: $('setting-instagram').value,
          whatsapp: $('setting-whatsapp').value
        };
        siteData.testimonial = {
          quote: $('setting-testimonialQuote').value,
          author: $('setting-testimonialAuthor').value
        };
        await saveSiteData('Site settings updated successfully!');
      });
    }

    // Save Process
    const saveProcessBtn = $('saveProcessBtn');
    if (saveProcessBtn) {
      saveProcessBtn.addEventListener('click', async () => {
        const panels = document.querySelectorAll('#processStepsList .glass-panel');
        const updatedSteps = [];
        panels.forEach((p, idx) => {
          const num = String(idx + 1).padStart(2, '0');
          const icon = p.querySelector('.step-icon').value;
          const title = p.querySelector('.step-title').value;
          const desc = p.querySelector('.step-desc').value;
          updatedSteps.push({ num, icon, title, desc });
        });
        processData.steps = updatedSteps;
        try {
          await apiFetch('/api/sections/process', 'PUT', processData);
          showToast('Work process steps saved!');
        } catch (e) {
          showToast('Failed to save process: ' + e.message, 'error');
        }
      });
    }

    // Change Password Form
    const cpForm = $('changePasswordForm');
    if (cpForm) {
      cpForm.addEventListener('submit', async e => {
        e.preventDefault();
        const currentPassword = $('secCurrentPassword').value;
        const newPassword = $('secNewPassword').value;
        const confirmPassword = $('secConfirmPassword').value;
        const status = $('changePasswordStatus');

        if (newPassword !== confirmPassword) {
          status.style.color = 'var(--red)';
          status.textContent = 'New passwords do not match.';
          return;
        }

        try {
          await apiFetch('/api/auth/change-password', 'POST', { currentPassword, newPassword });
          status.style.color = 'var(--green)';
          status.textContent = '✓ Password updated successfully!';
          cpForm.reset();
          showToast('Password changed successfully!');
        } catch (err) {
          status.style.color = 'var(--red)';
          status.textContent = err.message || 'Failed to update password.';
        }
      });
    }
  }

  async function saveSiteData(msg = 'Saved!') {
    try {
      await apiFetch('/api/site', 'PUT', siteData);
      showToast(msg);
      loadStats();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    }
  }

  // ── Project Modal Logic ───────────────────────────────────────
  function initProjectModal() {
    $('addProjectBtn').addEventListener('click', () => openProjectModal());
    $('modalClose').addEventListener('click', closeProjectModal);
    $('modalCancel').addEventListener('click', closeProjectModal);

    $('modalSave').addEventListener('click', async () => {
      const id = $('modal-id').value;
      const title = $('modal-title').value.trim();
      if (!title) {
        showToast('Project title is required', 'error');
        return;
      }

      const projData = {
        title,
        category: $('modal-category').value,
        categoryLabel: $('modal-categoryLabel').value.trim(),
        description: $('modal-description').value.trim(),
        detailHtml: $('modal-detailHtml').value.trim(),
        image: $('modal-image').value.trim(),
        liveUrl: $('modal-liveUrl').value.trim(),
        badge: $('modal-badge').value.trim(),
        badgeType: $('modal-badgeType').value,
        status: $('modal-status').value.trim(),
        featured: $('modal-featured').value === 'true',
        tags: $('modal-tags').value.split(',').map(t => t.trim()).filter(Boolean)
      };

      try {
        if (id) {
          await apiFetch(`/api/projects/${encodeURIComponent(id)}`, 'PUT', projData);
          showToast('Project updated successfully!');
        } else {
          await apiFetch('/api/projects', 'POST', projData);
          showToast('Project created successfully!');
        }
        closeProjectModal();
        loadProjects();
        loadStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('confirmCancel').addEventListener('click', () => {
      $('confirmModal').style.display = 'none';
      deleteCallback = null;
    });

    $('confirmOk').addEventListener('click', async () => {
      if (deleteCallback) await deleteCallback();
      $('confirmModal').style.display = 'none';
      deleteCallback = null;
    });
  }

  function openProjectModal(proj = null) {
    $('modalTitle').textContent = proj ? 'Edit Project' : 'Add New Project';
    $('modal-id').value = proj ? proj.id : '';
    $('modal-title').value = proj ? proj.title : '';
    $('modal-category').value = proj ? proj.category : 'web';
    $('modal-categoryLabel').value = proj ? (proj.categoryLabel || '') : '';
    $('modal-description').value = proj ? (proj.description || '') : '';
    $('modal-detailHtml').value = proj ? (proj.detailHtml || '') : '';
    $('modal-image').value = proj ? (proj.image || '') : '';
    $('modal-liveUrl').value = proj ? (proj.liveUrl || '') : '';
    $('modal-badge').value = proj ? (proj.badge || '') : '';
    $('modal-badgeType').value = proj ? (proj.badgeType || 'green') : 'green';
    $('modal-status').value = proj ? (proj.status || '') : '';
    $('modal-featured').value = proj ? String(proj.featured !== false) : 'true';
    $('modal-tags').value = proj && proj.tags ? proj.tags.join(', ') : '';

    const preview = $('modal-image-preview');
    if (proj && proj.image) {
      preview.src = proj.image;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }

    $('projectModal').style.display = 'flex';
  }

  function closeProjectModal() {
    $('projectModal').style.display = 'none';
  }

  function editProject(id) {
    const p = projects.find(x => x.id === id);
    if (p) openProjectModal(p);
  }

  function deleteProject(id) {
    const p = projects.find(x => x.id === id);
    $('confirmMessage').textContent = `Are you sure you want to delete "${p ? p.title : 'this project'}"?`;
    deleteCallback = async () => {
      try {
        await apiFetch(`/api/projects/${encodeURIComponent(id)}`, 'DELETE');
        showToast('Project deleted');
        loadProjects();
        loadStats();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
    $('confirmModal').style.display = 'flex';
  }

  function deleteContact(id) {
    deleteCallback = async () => {
      try {
        await apiFetch(`/api/admin/contacts/${encodeURIComponent(id)}`, 'DELETE');
        showToast('Inquiry removed');
        loadContacts();
        loadStats();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
    $('confirmMessage').textContent = 'Delete this message inquiry?';
    $('confirmModal').style.display = 'flex';
  }

  function deleteImage(name) {
    deleteCallback = async () => {
      try {
        await apiFetch(`/api/images/${encodeURIComponent(name)}`, 'DELETE');
        showToast('Image deleted');
        loadImages();
        loadStats();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
    $('confirmMessage').textContent = `Delete image "${name}"?`;
    $('confirmModal').style.display = 'flex';
  }

  function openImagePicker(targetInputId) {
    imagePickerTarget = targetInputId;
    const grid = $('pickerGrid');
    grid.innerHTML = (images || []).map(img => `
      <div class="picker-thumb" onclick="AdminApp.selectImage('${img.url}')">
        <img src="${img.url}" alt="${img.name}">
      </div>
    `).join('');
    $('imagePickerModal').style.display = 'flex';
  }

  function selectImage(url) {
    if (imagePickerTarget && $(imagePickerTarget)) {
      $(imagePickerTarget).value = url;
      updateImagePreview(imagePickerTarget);
      if (imagePickerTarget === 'modal-image') {
        const prev = $('modal-image-preview');
        if (prev) {
          prev.src = url;
          prev.style.display = 'block';
        }
      }
    }
    $('imagePickerModal').style.display = 'none';
  }

  async function uploadSingleImage(fileInput, targetInputId) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const fd = new FormData();
    fd.append('file', file, file.name);

    showToast(`Uploading ${file.name}…`);
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if ($(targetInputId)) {
        $(targetInputId).value = data.url;
        updateImagePreview(targetInputId);
      }
      showToast(`Uploaded ${file.name} successfully!`);
      loadImages();
    } catch (err) {
      showToast(err.message, 'error');
    }
    fileInput.value = '';
  }

  async function handlePickerUpload(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const fd = new FormData();
    fd.append('file', file, file.name);

    showToast(`Uploading ${file.name}…`);
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      await loadImages();
      if (imagePickerTarget) {
        selectImage(data.url);
      }
      showToast(`Uploaded and selected ${file.name}!`);
    } catch (err) {
      showToast(err.message, 'error');
    }
    input.value = '';
  }

  // ── Home Section Navigation Pills ───────────────────────────
  function initHomeNav() {
    document.querySelectorAll('#homeSectionNav .home-nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#homeSectionNav .home-nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.dataset.targetSec;
        const sec = $(targetId);
        if (sec) {
          sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ── Rich-Text Formatting Toolbars ────────────────────────────
  function initRichTextToolbars() {
    document.querySelectorAll('.rte-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const action = btn.dataset.action;
        const toolbar = btn.closest('.rte-toolbar');
        if (!toolbar) return;
        const targetId = toolbar.dataset.target;
        const textarea = $(targetId);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const sel = textarea.value.substring(start, end);
        let replacement = '';

        switch (action) {
          case 'bold':
            replacement = `<strong>${sel || 'bold text'}</strong>`;
            break;
          case 'italic':
            replacement = `<em>${sel || 'italic text'}</em>`;
            break;
          case 'grad-cyan':
            replacement = `<span class="text-gradient">${sel || 'highlighted text'}</span>`;
            break;
          case 'grad-blue':
            replacement = `<span class="text-gradient-blue">${sel || 'highlighted text'}</span>`;
            break;
          case 'link':
            const url = prompt('Enter link URL (e.g. #projects or https://...):', '#');
            if (url) replacement = `<a href="${url}">${sel || 'link text'}</a>`;
            else return;
            break;
          case 'code':
            replacement = `<code>${sel || 'code snippet'}</code>`;
            break;
        }

        textarea.focus();
        textarea.setRangeText(replacement, start, end, 'end');
      });
    });
  }

  $('imagePickerClose').addEventListener('click', () => {
    $('imagePickerModal').style.display = 'none';
  });

  // ── Public API ───────────────────────────────────────────────
  return {
    init() {
      initAuth();
      initNav();
      initHomeNav();
      initRichTextToolbars();
      initSaveHandlers();
      initProjectModal();
      initMediaUpload();
      checkSession();
    },
    switchPage,
    openProjectModal,
    editProject,
    deleteProject,
    deleteContact,
    deleteImage,
    removeSkill(idx) {
      if (siteData.skills && siteData.skills[idx]) {
        siteData.skills.splice(idx, 1);
        renderSkills();
      }
    },
    removeHomeSkill(idx) {
      if (siteData.skills && siteData.skills[idx]) {
        siteData.skills.splice(idx, 1);
        renderHomeSkills();
      }
    },
    toggleFeaturedProject(id, isFeatured) {
      const p = (projects || []).find(x => x.id === id);
      if (p) {
        p.featured = isFeatured;
        const card = document.querySelector(`.featured-proj-card[data-id="${id}"]`);
        if (card) card.classList.toggle('is-featured', isFeatured);
      }
    },
    uploadSingleImage,
    handlePickerUpload,
    openImagePicker,
    selectImage,
    showToast,
    loadContacts
  };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => AdminApp.init());
