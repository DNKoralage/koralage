/**
 * assets/js/cms-loader.js
 * Public CMS Hydration Engine
 *
 * Fetches live site data from the Node.js CMS API and populates
 * the public portfolio page dynamically. Runs after the page loads
 * so the static fallback content is visible instantly (no flash).
 *
 * Strategy: innerHTML for rich-text fields, textContent for plain text.
 * Falls back to existing static content if API is unavailable.
 */

(async function initCMS() {
  // ── Helpers ──────────────────────────────────────────────────
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function setHtml(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.innerHTML = value;
  }

  function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el && value) el.setAttribute(attr, value);
  }

  function setHref(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.href = value;
  }

  // ── Fetch CMS data ────────────────────────────────────────────
  let site = {};
  let projects = [];
  let processData = { steps: [] };

  // API responses use the { success, data } envelope — unwrap it safely.
  function unwrap(res) {
    return res.ok
      ? res.json().then(b => (b && typeof b === 'object' && 'success' in b) ? b.data : b).catch(() => null)
      : null;
  }

  try {
    const [siteRes, projectsRes, processRes] = await Promise.all([
      fetch('/api/site').then(unwrap),
      fetch('/api/projects').then(unwrap),
      fetch('/api/sections/process').then(unwrap)
    ]);
    if (siteRes) site = siteRes;
    if (projectsRes) projects = projectsRes;
    if (processRes) processData = processRes;
  } catch (err) {
    console.warn('[CMS] Could not connect to CMS API, showing static content.', err.message);
    return; // graceful fallback — static HTML stays as-is
  }

  // ── HERO SECTION ──────────────────────────────────────────────
  // Tagline badge text (inside #hero-tagline, preserve the pulse dot span)
  const heroTaglineEl = document.getElementById('cms-hero-tagline');
  if (heroTaglineEl && site.heroTagline) heroTaglineEl.textContent = site.heroTagline;

  // Hero headline — supports HTML (spans with gradient classes)
  const heroHeadlineEl = document.getElementById('cms-hero-headline');
  if (heroHeadlineEl && site.heroHeading) heroHeadlineEl.innerHTML = site.heroHeading;

  // Hero subtext paragraph
  setText('cms-hero-subtext', site.heroSubtitle);

  // Portrait images
  const cyberImg = document.getElementById('hero-portrait');
  if (cyberImg && site.heroPortrait) {
    cyberImg.src = site.heroPortrait;
    cyberImg.alt = (site.name || 'Devnith Koralage') + ' - ' + (site.title || 'Software Developer');
  }
  // Real portrait (stored in window for the mode toggle in main.js)
  if (site.realPortrait) window._cmsRealPortrait = site.realPortrait;

  // Hero CTA buttons
  if (site.heroPrimaryBtn) {
    const primaryBtn = document.getElementById('hero-cta-primary');
    if (primaryBtn) {
      primaryBtn.href = site.heroPrimaryBtn.url || '#projects';
      const span = primaryBtn.querySelector('span') || primaryBtn.childNodes[0];
      if (span && span.nodeType === Node.TEXT_NODE) {
        span.textContent = site.heroPrimaryBtn.text || 'View My Work';
      } else if (primaryBtn.firstChild && primaryBtn.firstChild.tagName !== 'SVG') {
        primaryBtn.childNodes[0].textContent = site.heroPrimaryBtn.text || 'View My Work';
      }
    }
  }
  if (site.heroSecondaryBtn) {
    const secondaryBtn = document.getElementById('hero-cta-secondary');
    if (secondaryBtn) {
      secondaryBtn.href = site.heroSecondaryBtn.url || '#contact';
      if (secondaryBtn.childNodes[0] && secondaryBtn.childNodes[0].nodeType === Node.TEXT_NODE) {
        secondaryBtn.childNodes[0].textContent = '\n              ' + (site.heroSecondaryBtn.text || "Let's Talk") + '\n              ';
      }
    }
  }

  // Floating metric badges
  if (site.heroStats) {
    setText('cms-stat-experience', site.heroStats.experience);
    setText('cms-stat-projects', site.heroStats.projects);
    setText('cms-stat-platforms', site.heroStats.platforms);
  }

  // ── ABOUT SECTION ─────────────────────────────────────────────
  if (site.aboutTagline) setText('cms-about-tagline', site.aboutTagline);
  if (site.aboutHeading) setText('cms-about-heading', site.aboutHeading);
  setText('cms-about-name', site.name);
  setText('cms-about-title', site.title);
  if (site.bio) setHtml('cms-about-bio', site.bio);
  setText('cms-about-location', site.location);
  setText('cms-about-email', site.email);
  setText('cms-about-phone', site.phone);
  setText('cms-about-availability', site.availability);

  // Update email/phone links
  const emailLink = document.getElementById('cms-email-link');
  if (emailLink && site.email) {
    emailLink.href = 'mailto:' + site.email;
    emailLink.textContent = site.email;
  }
  const phoneLink = document.getElementById('cms-phone-link');
  if (phoneLink && site.phone) {
    phoneLink.href = 'tel:' + site.phone.replace(/\s/g, '');
  }

  // ── EXPERTISE / SKILLS ────────────────────────────────────────
  if (site.expertiseTagline) setText('cms-expertise-tagline', site.expertiseTagline);
  if (site.expertiseHeading) setText('cms-expertise-heading', site.expertiseHeading);
  if (site.skills && site.skills.length > 0) {
    const skillsList = document.getElementById('cms-skills-list');
    if (skillsList) {
      skillsList.innerHTML = site.skills.map(s => `
        <div class="skill-row">
          <div class="skill-header">
            <div class="skill-name-wrap">
              <span class="skill-name">${s.name}</span>
              <span class="skill-details-tag">${s.details}</span>
            </div>
            <span class="skill-percentage">${s.percentage}%</span>
          </div>
          <div class="skill-bar-track">
            <div class="skill-bar-fill" data-percentage="${s.percentage}%"></div>
          </div>
        </div>
      `).join('');

      // Re-trigger skill bar animation for dynamically injected bars
      setTimeout(() => {
        skillsList.querySelectorAll('.skill-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.percentage || '0%';
        });
      }, 100);
    }
  }

  // Core stack tech tags
  if (site.coreStack && site.coreStack.length > 0) {
    const coreStackEl = document.getElementById('cms-core-stack');
    if (coreStackEl) {
      coreStackEl.innerHTML = site.coreStack.map(t => `<span class="tech-tag">${t}</span>`).join('');
    }
  }

  // ── SOCIAL LINKS ──────────────────────────────────────────────
  if (site.social) {
    const linkMap = {
      'cms-social-linkedin': site.social.linkedin,
      'cms-social-facebook': site.social.facebook,
      'cms-social-instagram': site.social.instagram,
      'cms-social-whatsapp': site.social.whatsapp,
      'cms-contact-linkedin': site.social.linkedin,
      'cms-contact-facebook': site.social.facebook,
      'cms-contact-instagram': site.social.instagram
    };
    Object.entries(linkMap).forEach(([id, url]) => {
      if (url) setHref(id, url);
    });

    // Email social button
    const emailSocialBtn = document.getElementById('cms-social-email');
    if (emailSocialBtn && site.email) emailSocialBtn.href = 'mailto:' + site.email;

    // WhatsApp button
    const waBtn = document.getElementById('cms-social-whatsapp');
    if (waBtn && site.social.whatsapp) waBtn.href = site.social.whatsapp;
  }

  // ── PROJECTS SECTION ──────────────────────────────────────────
  if (site.projectsTagline) setText('cms-projects-tagline-text', site.projectsTagline);
  if (site.projectsTitle) setText('cms-projects-title', site.projectsTitle);
  if (site.projectsSubtitle) setText('cms-projects-subtitle', site.projectsSubtitle);

  if (projects && projects.length > 0) {
    const projectsGrid = document.getElementById('cms-projects-grid');
    if (projectsGrid) {
      const visibleProjects = projects.filter(p => p.featured !== false);
      const displayProjects = visibleProjects.length > 0 ? visibleProjects : projects;

      projectsGrid.innerHTML = displayProjects.map((p, idx) => `
        <div class="glass-card project-card reveal-item delay-${(idx % 4) + 1}"
             data-category="${p.category || 'web'}"
             ${p.liveUrl || p.detailHtml || p.description ? `data-open-project="${p.id}"` : ''}>
          <div class="project-image-box">
            <img src="${p.image || 'assets/images/devnith-cyber.jpg'}"
                 alt="${p.title}"
                 class="project-thumb"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 60%22><rect fill=%22%23111827%22 width=%22100%22 height=%2260%22/></svg>'">
            ${p.badge ? `<div class="project-overlay-badge">
              <span class="pulse-dot ${p.badgeType === 'green' ? 'green' : ''}" style="width:6px;height:6px;"></span>
              ${p.badge}
            </div>` : ''}
          </div>
          <div class="project-body">
            <div class="project-category">${p.categoryLabel || p.category || 'Project'}</div>
            <h3 class="project-title">${p.title}</h3>
            <p class="project-desc">${p.description || ''}</p>
            <div class="project-tech-tags">
              ${(p.tags || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}
            </div>
            <div class="project-footer-actions">
              <span class="project-view-btn">
                View Case Study
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </span>
              ${p.status ? `<span class="project-live-indicator">● ${p.status}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // ── WORK PROCESS SECTION ─────────────────────────────────────
  if (site.processTagline) setText('cms-process-tagline-text', site.processTagline);
  if (site.processTitle) setText('cms-process-title', site.processTitle);
  if (site.processSubtitle) setText('cms-process-subtitle', site.processSubtitle);

  if (processData.steps && processData.steps.length > 0) {
    const processGrid = document.getElementById('cms-process-steps');
    if (processGrid) {
      processGrid.innerHTML = processData.steps.map(st => `
        <div class="process-step-item">
          <div class="step-node-bubble" title="Step ${st.num}: ${st.title}">
            <span class="step-num-badge">${st.num}</span>
            <span class="step-icon">${st.icon}</span>
          </div>
          <h3 class="step-title">${st.title}</h3>
          <p class="step-desc">${st.desc}</p>
        </div>
      `).join('');
    }
  }

  // ── STATS SECTION ────────────────────────────────────────────
  if (site.stats) {
    setText('cms-stat-clients', site.stats.clients);
    setText('cms-stat-projects-count', site.stats.projects);
    setText('cms-stat-experience-years', site.stats.experience);
    setText('cms-stat-uptime', site.stats.uptime);
  }

  // ── TESTIMONIAL ──────────────────────────────────────────────
  if (site.testimonial) {
    setText('cms-testimonial-quote', site.testimonial.quote ? `"${site.testimonial.quote}"` : '');
    setText('cms-testimonial-author', site.testimonial.author);
  }

  // ── CONTACT SECTION ──────────────────────────────────────────
  if (site.contactTagline) setText('cms-contact-tagline-text', site.contactTagline);
  if (site.contactTitle) setText('cms-contact-title', site.contactTitle);
  if (site.contactSubtitle) setText('cms-contact-subtitle', site.contactSubtitle);

  const contactEmailEl = document.getElementById('cms-contact-email');
  if (contactEmailEl && site.email) {
    contactEmailEl.textContent = site.email;
    const row = contactEmailEl.closest('[data-copy]');
    if (row) row.dataset.copy = site.email;
  }
  const contactPhoneEl = document.getElementById('cms-contact-phone');
  if (contactPhoneEl && site.phone) {
    contactPhoneEl.textContent = site.phone;
    const row = contactPhoneEl.closest('[data-copy]');
    if (row) row.dataset.copy = site.phone;
  }
  setText('cms-contact-location', site.location);
  setText('cms-contact-availability', site.availability);

  // ── BRAND / LOGO ─────────────────────────────────────────────
  if (site.brandMonogram) {
    setText('cms-brand-monogram', site.brandMonogram);
    setText('cms-footer-monogram', site.brandMonogram);
  }
  if (site.brandName) setText('cms-brand-name', site.brandName);
  if (site.brandRole) setText('cms-brand-role', site.brandRole);

  // ── FOOTER ───────────────────────────────────────────────────
  setText('cms-footer-name', site.name);

  // Re-run reveal animations for content injected above (e.g. the projects grid);
  // without this, injected .reveal-item cards remain at opacity:0 (invisible).
  if (typeof window.refreshRevealAnimations === 'function') window.refreshRevealAnimations();

  console.log('[CMS] Public site hydrated from CMS successfully.');
})();
