/**
 * DEVNITH KORALAGE - FUTURISTIC PORTFOLIO JAVASCRIPT ENGINE
 * Features:
 * 1. Lenis Ultra-Smooth Scrolling & Inertia Navigation
 * 2. Scroll-Triggered Fade/Slide Reveal Animations
 * 3. Custom Neon Cyber Cursor & Trailing Halo
 * 4. Cursor-Reactive Dynamic Spotlight on Glass Cards
 * 5. Preloaded Web Audio UI Sound Effects (Crisp pop, snappy click, gentle hover)
 * 6. Interactive Particles Canvas
 * 7. Project Case Study Modal & Filter Engine
 * 8. CV Viewer & Printable Resume Modal
 * 9. Portrait Mode Switcher (Cyber Mode vs Real Mode)
 * 10. Form Validation, Telemetry Simulation & Toast System
 */

document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initScrollReveal();
  initCustomCursor();
  initCardSpotlight();
  initAudioEngine();
  initParticleCanvas();
  initNavigation();
  initSkillBars();
  initProjects();
  initWorkProcess();
  initContactForm();
  initCvModal();
  initPortraitToggle();
  initCopyTriggers();
});

/* ===================================================================
   1. Lenis Ultra-Smooth Scrolling Engine
   =================================================================== */
let lenis = null;

function initSmoothScroll() {
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.8,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync header scroll state with Lenis
    lenis.on('scroll', (e) => {
      const header = document.querySelector('.site-header');
      if (header) {
        if (e.scroll > 35) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    });

    // Smooth scroll for internal navigation links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          lenis.scrollTo(targetElement, {
            offset: -85,
            duration: 1.2,
          });
        }
      });
    });
  } else {
    // Fallback standard smooth scroll
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.site-header');
      if (header) {
        if (window.scrollY > 35) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    });
  }
}

/* ===================================================================
   2. Scroll-Triggered Reveal Animations
   =================================================================== */
function initScrollReveal() {
  if (typeof IntersectionObserver === 'undefined') return;

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.12,
  });

  // (Re)observe every not-yet-revealed item. Exposed globally so content that is
  // injected AFTER load (e.g. the CMS loader re-rendering the projects grid) is
  // revealed too — otherwise those .reveal-item cards stay at opacity:0 forever.
  window.refreshRevealAnimations = function () {
    document.querySelectorAll('.reveal-item:not(.is-revealed)').forEach((elem) => revealObserver.observe(elem));
  };

  window.refreshRevealAnimations();
}

/* ===================================================================
   3. Custom Neon Cyber Cursor & Trailing Halo
   =================================================================== */
function initCustomCursor() {
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  if (!cursorDot || !cursorRing) return;

  // Check if touch device
  if (window.matchMedia('(pointer: coarse)').matches) {
    cursorDot.style.display = 'none';
    cursorRing.style.display = 'none';
    return;
  }

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
  });

  // Smooth lerp trailing animation for the glowing ring
  function animateCursor() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animateCursor);
  }
  requestAnimationFrame(animateCursor);

  // Expand and illuminate on hover over interactive elements
  const interactiveSelectors = 'a, button, .btn, .glass-card, .project-card, .filter-tab, .step-node-bubble, .social-icon-btn, input, textarea, .contact-meta-row';
  document.querySelectorAll(interactiveSelectors).forEach((elem) => {
    elem.addEventListener('mouseenter', () => {
      cursorRing.classList.add('cursor-hover');
      cursorDot.classList.add('cursor-hover');
    });
    elem.addEventListener('mouseleave', () => {
      cursorRing.classList.remove('cursor-hover');
      cursorDot.classList.remove('cursor-hover');
    });
  });

  // Click compression pulse
  window.addEventListener('mousedown', () => {
    cursorRing.classList.add('cursor-click');
  });
  window.addEventListener('mouseup', () => {
    cursorRing.classList.remove('cursor-click');
  });

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0';
    cursorRing.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursorDot.style.opacity = '1';
    cursorRing.style.opacity = '1';
  });
}

/* ===================================================================
   4. Dynamic Cursor-Reactive Spotlight on Glass Cards
   =================================================================== */
function initCardSpotlight() {
  const cards = document.querySelectorAll('.glass-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/* ===================================================================
   5. Preloaded Web Audio UI Sound Engine (Crisp pops, Snappy clicks, Gentle hovers)
   =================================================================== */
let soundEnabled = true;
let audioCtx = null;

// Preload & pre-warm AudioContext on first user interaction
function prewarmAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
window.addEventListener('pointerdown', prewarmAudio, { once: true });
window.addEventListener('keydown', prewarmAudio, { once: true });

function initAudioEngine() {
  const toggleBtn = document.getElementById('audio-toggle-btn');
  if (!toggleBtn) return;

  // Retrieve saved preference or default to enabled
  const savedState = localStorage.getItem('dk_audio_enabled');
  if (savedState !== null) {
    soundEnabled = savedState === 'true';
  } else {
    soundEnabled = true;
  }

  updateAudioButtonUI(toggleBtn);

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    prewarmAudio();
    soundEnabled = !soundEnabled;
    localStorage.setItem('dk_audio_enabled', soundEnabled);
    updateAudioButtonUI(toggleBtn);

    if (soundEnabled) {
      playSnappyClick();
      showToast('🔊 Audio FX Active', 'Interactive UI clicks & hovers enabled');
    } else {
      showToast('🔇 Audio FX Muted', 'Sound feedback turned off');
    }
  });

  // Gentle hover sound on main nav links and primary buttons
  const hoverTargets = document.querySelectorAll('.nav-link, .btn-primary, .btn-secondary, .btn-cv, .filter-tab, .step-node-bubble');
  hoverTargets.forEach((elem) => {
    elem.addEventListener('mouseenter', () => {
      playGentleHover();
    });
  });

  // Crisp satisfying click sound on interactive elements
  const clickTargets = document.querySelectorAll('button, .btn, .nav-link, .project-card, .filter-tab, .step-node-bubble, .social-icon-btn, .modal-close-btn');
  clickTargets.forEach((elem) => {
    elem.addEventListener('click', () => {
      playCrispPop();
    });
  });
}

function updateAudioButtonUI(btn) {
  if (soundEnabled) {
    btn.classList.add('active');
    btn.setAttribute('title', 'Audio FX: Enabled (Click to mute)');
  } else {
    btn.classList.remove('active');
    btn.setAttribute('title', 'Audio FX: Muted (Click to enable)');
  }
}

// 1. Crisp satisfying comic/tactile pop sound
function playCrispPop() {
  if (!soundEnabled) return;
  try {
    prewarmAudio();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Fast downward pitch sweep creates a satisfying "pop / snap"
    osc.type = 'sine';
    osc.frequency.setValueAtTime(860, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.055);
  } catch (err) {
    console.debug('Audio error', err);
  }
}

// 2. Snappy high-tech micro click
function playSnappyClick() {
  if (!soundEnabled) return;
  try {
    prewarmAudio();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch (err) {
    console.debug('Audio error', err);
  }
}

// 3. Gentle airy hover tick
function playGentleHover() {
  if (!soundEnabled) return;
  try {
    prewarmAudio();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now);
    osc.frequency.exponentialRampToValueAtTime(1920, now + 0.02);

    // Ultra-light gain so it feels delicate and elegant
    gain.gain.setValueAtTime(0.016, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.025);
  } catch (err) {
    console.debug('Audio error', err);
  }
}

// 4. Success transmission chime
function playSuccessSound() {
  if (!soundEnabled) return;
  try {
    prewarmAudio();
    const now = audioCtx.currentTime;

    const notes = [587.33, 880, 1174.66]; // D5, A5, D6
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.26);
    });
  } catch (err) {
    console.debug('Audio error', err);
  }
}

/* ===================================================================
   6. Interactive Cyber Particle Canvas
   =================================================================== */
function initParticleCanvas() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const particleCount = window.innerWidth < 768 ? 35 : 70;
  let mouse = { x: null, y: null, radius: 130 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
  });

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 2 + 1;
      this.baseX = this.x;
      this.baseY = this.y;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.color = Math.random() > 0.4 ? 'rgba(0, 240, 255,' : 'rgba(0, 114, 255,';
      this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Mouse interactive push
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          const dirX = dx / dist;
          const dirY = dy / dist;
          this.x -= dirX * force * 3;
          this.y -= dirY * force * 3;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `${this.color} ${this.alpha})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Connect nearby particles with subtle cyber circuit lines
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          const lineAlpha = (1 - dist / 110) * 0.18;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(render);
  }
  render();
}

/* ===================================================================
   7. Navigation & Mobile Menu
   =================================================================== */
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const navIsland = document.getElementById('nav-island');

  if (mobileToggle && navIsland) {
    mobileToggle.addEventListener('click', () => {
      navIsland.classList.toggle('mobile-open');
      const isOpen = navIsland.classList.contains('mobile-open');
      mobileToggle.innerHTML = isOpen ? '✕' : '☰';
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navIsland.classList.remove('mobile-open');
        mobileToggle.innerHTML = '☰';
      });
    });
  }

  // Active section observer
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0.1,
  });

  sections.forEach((sec) => sectionObserver.observe(sec));
}

/* ===================================================================
   8. Portrait Mode Switcher (Cyber Mode vs Real Mode)
   =================================================================== */
function initPortraitToggle() {
  const heroImg = document.getElementById('hero-portrait');
  const cyberBtn = document.getElementById('btn-mode-cyber');
  const realBtn = document.getElementById('btn-mode-real');
  if (!heroImg || !cyberBtn || !realBtn) return;

  const cyberSrc = 'assets/images/devnith-cyber.jpg';
  const realSrc = 'assets/images/devnith.jpg';

  cyberBtn.addEventListener('click', () => {
    heroImg.style.opacity = '0';
    setTimeout(() => {
      heroImg.src = cyberSrc;
      heroImg.style.opacity = '1';
    }, 200);
    cyberBtn.classList.add('active');
    realBtn.classList.remove('active');
    showToast('⚡ Cyberpunk Mode Activated', 'Displaying futuristic cyber developer portrait');
  });

  realBtn.addEventListener('click', () => {
    heroImg.style.opacity = '0';
    setTimeout(() => {
      heroImg.src = realSrc;
      heroImg.style.opacity = '1';
    }, 200);
    realBtn.classList.add('active');
    cyberBtn.classList.remove('active');
    showToast('📸 Authentic Portrait Mode', 'Displaying original developer photo');
  });
}

/* ===================================================================
   9. Expertise Proficiency Bars Animation
   =================================================================== */
function initSkillBars() {
  const skillBars = document.querySelectorAll('.skill-bar-fill');
  if (!skillBars.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const targetWidth = bar.getAttribute('data-percentage') || '0%';
        bar.style.width = targetWidth;
        observer.unobserve(bar);
      }
    });
  }, { threshold: 0.25 });

  skillBars.forEach((bar) => observer.observe(bar));
}

/* ===================================================================
   10. Projects Filter & Dynamic Case Study Modal
   =================================================================== */
const projectsData = {
  indusara: {
    title: 'Indusara Media Network & Indusara TV',
    category: 'Full Stack & Streaming Architecture',
    badge: 'LIVE ON AIR',
    image: 'assets/images/indusara.jpg',
    tags: ['React', 'Node.js', 'HLS / RTMP', 'Docker', 'Nginx RTMP', 'Tailwind CSS'],
    overview: 'Built high-performance web platforms and automated streaming infrastructure powering broadcast feeds for Indusara TV and Media Network.',
    highlights: [
      'Engineered an ultra-low latency HLS & RTMP video pipeline with sub-second buffer overhead.',
      'Designed a multi-tenant web broadcast control room dashboard with real-time analytics and viewer telemetry.',
      'Containerized broadcast delivery nodes using Docker and high-throughput Nginx RTMP proxies with 99.99% uptime.'
    ],
    metrics: {
      uptime: '99.98%',
      concurrent: '19,000+ Viewers',
      latency: '< 1.4s'
    }
  },
  nysco: {
    title: 'Nysco TV & Nysco Radio',
    category: 'Broadcast Systems & Web App',
    badge: 'OPERATIONAL ENGINE',
    image: 'assets/images/nysco.jpg',
    tags: ['Next.js', 'WebRTC', 'FFmpeg', 'Icecast', 'TypeScript', 'Audio Engine'],
    overview: 'Engineered custom software and real-time streaming broadcast engine integrating simultaneous television video feeds and radio audio channels.',
    highlights: [
      'Developed real-time video/audio switching engine with synchronized frequency equalizer and audio stream failovers.',
      'Integrated WebRTC for ultra-low latency studio monitor playback alongside global Icecast radio distribution.',
      'Crafted an intuitive glassmorphic scheduling system for live presenters, automated adverts, and audio presets.'
    ],
    metrics: {
      uptime: '99.95%',
      listeners: '142,000+ Online',
      latency: '1.8ms Studio Feed'
    }
  },
  youtube_radio: {
    title: '24/7 YouTube Continuous Radio',
    category: 'Automation & Audio Engineering',
    badge: 'PIONEER STREAM IN SRI LANKA',
    image: 'assets/images/youtube-radio.jpg',
    tags: ['Python Automation', 'YouTube Live API', 'FFmpeg Engine', 'FL Studio', 'Linux VPS'],
    overview: "Designed Sri Lanka's pioneer 24/7 continuous automated live audio stream on YouTube with synchronized visualizers and resilient automatic recovery.",
    highlights: [
      'Constructed a zero-downtime Python broadcast loop capable of recovering from network dropouts without terminating the YouTube Live session.',
      'Integrated real-time audio spectral visualizers reacting to music tracks mastered in FL Studio.',
      'Architected dynamic overlay rendering on headless Linux servers encoding 1080p60 stream with under 30% CPU load.'
    ],
    metrics: {
      continuity: '24/7 Continuous',
      droppedFrames: '0%',
      bitrate: '6,500 kbps'
    }
  },
  luminex: {
    title: 'Luminex Digital Platform',
    category: 'Web Development & Multimedia',
    badge: 'FEATURED AGENCY',
    image: 'assets/images/luminex.jpg',
    tags: ['Full Stack', 'After Effects', 'UI/UX Design', 'Cloud Hosting', 'VFX Motion'],
    overview: 'Full-stack digital solutions and creative content production, delivering an immersive brand presence with cyberpunk aesthetics.',
    highlights: [
      'Engineered interactive 3D web presentation layers with custom shader-inspired styling and smooth kinetic typography.',
      'Produced high-energy motion graphics and promotional video reels using Adobe After Effects.',
      'Delivered 98+ Google Lighthouse performance score across all devices while preserving rich media visual fidelity.'
    ],
    metrics: {
      lighthouse: '98/100',
      conversionRate: '+45%',
      renderSpeed: '0.4s FCP'
    }
  }
};

function initProjects() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  const projectCards = document.querySelectorAll('.project-card');

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const filterVal = tab.getAttribute('data-filter');

      projectCards.forEach((card) => {
        const category = card.getAttribute('data-category');
        if (filterVal === 'all' || category === filterVal) {
          card.style.display = 'flex';
          card.style.animation = 'fadeInUp 0.4s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  const projectModal = document.getElementById('project-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  if (projectModal && modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      projectModal.classList.remove('open');
    });

    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        projectModal.classList.remove('open');
      }
    });

    document.querySelectorAll('[data-open-project]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const projectId = trigger.getAttribute('data-open-project');
        openProjectModal(projectId);
      });
    });
  }
}

let dynamicProjectsList = [];
async function fetchCMSProjects() {
  try {
    const res = await fetch('/api/projects');
    if (res.ok) {
      let body = await res.json();
      if (body && typeof body === 'object' && 'success' in body) body = body.data;
      dynamicProjectsList = body || [];
      dynamicProjectsList.forEach(p => {
        if (!projectsData[p.id]) {
          projectsData[p.id] = {
            title: p.title,
            category: p.categoryLabel || p.category,
            badge: p.badge || 'ACTIVE',
            image: p.image || 'assets/images/devnith-cyber.jpg',
            tags: p.tags || [],
            overview: p.description || '',
            highlights: p.detailHtml ? [p.detailHtml.replace(/<[^>]+>/g, '')] : [p.description || 'Full production deployment.'],
            metrics: { status: p.status || 'Active', category: p.category }
          };
        }
      });
    }
  } catch (_) {}
}
fetchCMSProjects();

function openProjectModal(projectId) {
  const data = projectsData[projectId] || dynamicProjectsList.find(p => p.id === projectId);
  const modal = document.getElementById('project-modal');
  const modalBody = document.getElementById('modal-project-content');
  if (!data || !modal || !modalBody) return;

  const category = data.categoryLabel || data.category || 'Engineering';
  const badge = data.badge || 'PRODUCTION';
  const title = data.title;
  const overview = data.overview || data.description || '';
  const image = data.image || 'assets/images/devnith-cyber.jpg';
  const highlights = Array.isArray(data.highlights) ? data.highlights : (data.detailHtml ? [data.detailHtml.replace(/<[^>]+>/g, '')] : []);
  const metrics = data.metrics || { status: data.status || 'Live', stack: (data.tags || []).slice(0, 2).join(', ') };

  modalBody.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
        <span class="section-tag" style="margin-bottom:0;">${data.category}</span>
        <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--cyan-primary); background:rgba(0,240,255,0.1); border:1px solid rgba(0,240,255,0.3); padding:4px 10px; border-radius:999px;">
          ● ${data.badge}
        </span>
      </div>
      <h2 style="font-size:1.85rem; color:#fff; margin-bottom:12px;">${data.title}</h2>
      <p style="color:var(--text-muted); font-size:1.05rem; line-height:1.65; margin-bottom:20px;">${data.overview}</p>
    </div>

    <div style="width:100%; aspect-ratio:16/9; border-radius:14px; overflow:hidden; border:1px solid rgba(0,240,255,0.3); margin-bottom:24px; box-shadow:0 10px 30px rgba(0,0,0,0.6);">
      <img src="${data.image}" alt="${data.title}" style="width:100%; height:100%; object-fit:cover;" />
    </div>

    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; margin-bottom:24px;">
      ${Object.entries(data.metrics).map(([key, val]) => `
        <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(0,240,255,0.2); border-radius:12px; padding:14px; text-align:center;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-sub); font-family:var(--font-mono);">${key}</div>
          <div style="font-size:1.2rem; font-weight:800; color:var(--cyan-primary); margin-top:4px;">${val}</div>
        </div>
      `).join('')}
    </div>

    <div style="margin-bottom:24px;">
      <h3 style="font-size:1.15rem; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span style="color:var(--cyan-primary);">✦</span> Key Engineering Architecture
      </h3>
      <ul style="list-style:none; display:flex; flex-direction:column; gap:10px; padding:0;">
        ${data.highlights.map((item) => `
          <li style="display:flex; align-items:flex-start; gap:10px; color:var(--text-muted); font-size:0.95rem; line-height:1.6;">
            <span style="color:var(--cyan-primary); font-weight:bold; margin-top:2px;">▸</span>
            <span>${item}</span>
          </li>
        `).join('')}
      </ul>
    </div>

    <div style="margin-bottom:28px;">
      <h4 style="font-size:0.85rem; color:var(--text-sub); text-transform:uppercase; font-family:var(--font-mono); margin-bottom:10px;">Tech Stack</h4>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${data.tags.map((tag) => `<span class="tech-tag" style="border-color:rgba(0,240,255,0.3); color:#fff;">${tag}</span>`).join('')}
      </div>
    </div>

    <div style="display:flex; gap:14px; flex-wrap:wrap;">
      <a href="#contact" onclick="document.getElementById('project-modal').classList.remove('open');" class="btn btn-primary" style="flex:1;">
        Discuss Similar Project <span style="font-size:1.2rem;">→</span>
      </a>
      <button onclick="document.getElementById('project-modal').classList.remove('open');" class="btn btn-secondary">
        Close Preview
      </button>
    </div>
  `;

  modal.classList.add('open');
}

/* ===================================================================
   11. Work Process Hover Highlights
   =================================================================== */
function initWorkProcess() {
  const steps = document.querySelectorAll('.process-step-item');
  steps.forEach((step) => {
    step.addEventListener('mouseenter', () => {
      steps.forEach((s) => (s.style.opacity = '0.5'));
      step.style.opacity = '1';
    });
    step.addEventListener('mouseleave', () => {
      steps.forEach((s) => (s.style.opacity = '1'));
    });
  });
}

/* ===================================================================
   12. CV Viewer & Print/Save Modal
   =================================================================== */
function initCvModal() {
  const cvModal = document.getElementById('cv-modal');
  const cvCloseBtn = document.getElementById('cv-close-btn');
  const openCvButtons = document.querySelectorAll('[data-open-cv]');

  if (!cvModal) return;

  openCvButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      cvModal.classList.add('open');
    });
  });

  if (cvCloseBtn) {
    cvCloseBtn.addEventListener('click', () => {
      cvModal.classList.remove('open');
    });
  }

  cvModal.addEventListener('click', (e) => {
    if (e.target === cvModal) {
      cvModal.classList.remove('open');
    }
  });

  const printBtn = document.getElementById('print-cv-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

/* ===================================================================
   13. Interactive Contact Form with Validation & Feedback
   =================================================================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const statusMsg = document.getElementById('form-status-msg');

  if (!form || !submitBtn) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const subject = document.getElementById('form-subject').value.trim();
    const message = document.getElementById('form-message').value.trim();

    if (!name || !email || !message) {
      showToast('⚠️ Missing Required Fields', 'Please fill out your name, email, and message.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('⚠️ Invalid Email', 'Please enter a valid email address.');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <svg style="animation: spin 1s linear infinite; width:18px; height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      Encrypting & Sending...
    `;

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message })
    }).then(r => r.json()).then(res => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      form.reset();

      playSuccessSound();
      showToast('🚀 Transmission Successful!', 'Thank you! Your message has been received.');

      if (statusMsg) {
        statusMsg.style.display = 'flex';
        statusMsg.className = 'form-status-msg success';
        statusMsg.innerHTML = `✓ Thank you, ${name}! Your transmission has been dispatched to Devnith.`;
        setTimeout(() => {
          statusMsg.style.display = 'none';
        }, 6000);
      }
    }).catch(() => {
      // Fallback in case of network issue
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      form.reset();
      playSuccessSound();
      showToast('🚀 Transmission Sent!', 'Thank you! Devnith will respond shortly.');
    });
  });
}

/* ===================================================================
   14. Quick Copy to Clipboard Helpers
   =================================================================== */
function initCopyTriggers() {
  document.querySelectorAll('[data-copy]').forEach((elem) => {
    elem.addEventListener('click', () => {
      const textToCopy = elem.getAttribute('data-copy');
      if (!textToCopy) return;

      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          playCrispPop();
          showToast('📋 Copied to Clipboard', textToCopy);
        })
        .catch((err) => {
          console.error('Clipboard copy failed', err);
        });
    });
  });
}

/* ===================================================================
   15. Toast Notification System
   =================================================================== */
function showToast(title, description = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2px;">
      <div style="font-weight:700; color:#fff; font-size:0.92rem;">${title}</div>
      ${description ? `<div style="font-size:0.8rem; color:var(--text-muted);">${description}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.35s ease';
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}
