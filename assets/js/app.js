import { createStore } from './lib/zustand-vanilla.js';

/* =================================================================
   DATA LAYER — loaded from public/data.js via window.PROFILES
   ================================================================= */
var P = window.PROFILES || [];

/* =================================================================
   ZUSTAND STATE MANAGEMENT
   ================================================================= */
const useStore = createStore((set) => ({
  profileId: null,
  isRedacted: false,
  zoomLevel: 1,
  setProfile: (id) => set({ profileId: id }),
  setZoom: (z) => set({ zoomLevel: Math.min(Math.max(z, 0.85), 2.5) }),
  toggleRedacted: () => set((state) => ({ isRedacted: !state.isRedacted }))
}));

useStore.subscribe((state, prevState) => {
  // Handle Redact
  if (state.isRedacted !== prevState.isRedacted) {
    if (state.isRedacted) {
      document.body.classList.add('redact-mode');
    } else {
      document.body.classList.remove('redact-mode');
    }
    var redactButton = document.getElementById('btnRedact');
    if (redactButton) {
      redactButton.setAttribute('aria-pressed', String(state.isRedacted));
      redactButton.setAttribute('aria-label', state.isRedacted ? 'Show contact details' : 'Hide contact details');
    }
  }

  // Handle Zoom
  if (state.zoomLevel !== prevState.zoomLevel) {
    applyDesktopSheetScale();
  }

  // Handle Profile Swap (Targeted Updates)
  if (state.profileId !== prevState.profileId && state.profileId) {
    var p = byId(state.profileId);
    if (p) {
      cur = p;
      track('view_pair', { pair: p.id });

      // Update URL without polluting history (replaceState)
      var url = new URL(location.href);
      url.searchParams.set('role', p.role);
      url.searchParams.set('industry', p.industry);
      history.replaceState({ profileId: p.id }, '', url);

      // Update DOM components
      renderProfile(p);
    }
  }
});

/* =================================================================
   UTILITIES
   ================================================================= */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function nb(s) { return String(s).replace(/(\d)\s+(?=[A-Za-z%$€£])/g, '$1\u00a0'); }
function slug(s) { return String(s).replace(/\s+/g, '_').replace(/[^\w]/g, ''); }
function pdfName(p) { return p.pdfFilename || ('Kartavya_Jharwal_Resume_' + slug(p.role) + '_' + slug(p.industry) + '.pdf'); }
function pdfHref(p) { return 'resumes/' + pdfName(p); }
function track(ev, obj) { try { console.log('[telemetry]', ev, obj); } catch (e) {} }

/* =================================================================
   STATE & RUNTIME FLAGS
   ================================================================= */
var cur = null;
var fitScale = 1;
var finalizeToken = 0;
var stageResizeTimer = null;
var stageObserver = null;
var lastMobileMode = null;
var A4_RUNTIME_KEY = '__RESUME_A4_RUNTIME__';
var BUILD_FIT_MODE = new URLSearchParams(location.search).get('_fit') === '1';

function isMobileLayout() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

function byId(id) {
  for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i];
  return null;
}

function roles() {
  var seen = {}, out = [];
  for (var i = 0; i < P.length; i++) {
    if (!seen[P[i].role]) {
      seen[P[i].role] = 1;
      out.push(P[i].role);
    }
  }
  return out;
}

function industries(role) {
  var out = [];
  for (var i = 0; i < P.length; i++) if (P[i].role === role) out.push(P[i].industry);
  return out;
}

function pickInit() {
  if (!P.length) return null;
  var sp = new URLSearchParams(location.search);
  var profileId = sp.get('_profile');
  if (profileId) {
    var exactProfile = byId(profileId);
    if (exactProfile) return exactProfile;
  }
  var role = sp.get('role');
  var industry = sp.get('industry');
  if (role && industry) {
    for (var i = 0; i < P.length; i++) {
      if (P[i].role.toLowerCase() === role.toLowerCase() && P[i].industry.toLowerCase() === industry.toLowerCase()) {
        return P[i];
      }
    }
  }

  return P.find(function(profile) { return profile.fallback; }) || P[0];
}

/* =================================================================
   DESKTOP A4 LOCK
   ================================================================= */
function getStageEls() {
  return {
    stage: document.querySelector('.stage'),
    wrap: document.getElementById('wrap'),
    sheet: document.getElementById('sheet'),
    zoomCtrl: document.querySelector('.zoom-ctrl')
  };
}

function setA4RuntimeState(partial) {
  var next = window[A4_RUNTIME_KEY] || {};
  for (var k in partial) next[k] = partial[k];
  window[A4_RUNTIME_KEY] = next;

  var sheet = document.getElementById('sheet');
  if (!sheet) return;

  sheet.dataset.a4Mode = isMobileLayout() ? 'mobile' : 'desktop';
  sheet.dataset.a4Truncated = next.truncated ? 'true' : 'false';
  sheet.dataset.a4Profile = next.profileId || '';
  sheet.dataset.a4RemovedCount = String((next.removed || []).length || 0);
  sheet.dataset.a4Resolved = typeof next.resolved === 'boolean' ? String(next.resolved) : 'true';
  if (typeof fitScale === 'number') sheet.dataset.a4FitScale = fitScale.toFixed(4);
  if (typeof next.appliedScale === 'number') sheet.dataset.a4AppliedScale = next.appliedScale.toFixed(4);
}

function applyDesktopSheetScale() {
  var els = getStageEls();
  if (!els.stage || !els.wrap || !els.sheet) return;

  var isMobile = isMobileLayout();
  var padX = isMobile ? 16 : 40;
  var padY = isMobile ? 92 : 40;

  /* Measure the sheet at its natural CSS dimensions (unscaled) */
  var prevTransform = els.sheet.style.transform;
  els.sheet.style.transform = 'none';
  var naturalWidth = els.sheet.offsetWidth;
  var naturalHeight = els.sheet.offsetHeight;
  els.sheet.style.transform = prevTransform;

  // Stage now purely flexes, no absolute floating controls overlapping it
  var availableWidth = Math.max(els.stage.clientWidth - (padX * 2), naturalWidth * 0.3);
  var availableHeight = Math.max(els.stage.clientHeight - (padY * 2), naturalHeight * 0.3);

  fitScale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);
  var appliedScale = Math.max(fitScale * useStore.getState().zoomLevel, 0.25);

  /* Size the wrap to the visual (post-scale) footprint so flexbox centres it correctly */
  els.wrap.style.width = Math.round(naturalWidth * appliedScale) + 'px';
  els.wrap.style.height = Math.round(naturalHeight * appliedScale) + 'px';
  els.wrap.style.maxWidth = '';
  els.wrap.style.maxHeight = '';

  /* Scale from top-left so wrap clip stays perfectly aligned */
  els.sheet.style.transformOrigin = 'top left';
  els.sheet.style.transform = 'scale(' + appliedScale + ')';

  setA4RuntimeState({ appliedScale: appliedScale });
}

function zoom(delta) {
  useStore.getState().setZoom(useStore.getState().zoomLevel + delta);
}

function zoomReset() {
  useStore.getState().setZoom(1);
}

/* =================================================================
   TARGETED SECTION RENDERERS
   ================================================================= */
function updateTarget(elId, newHTML, delay) {
  var el = document.getElementById(elId);
  if (!el) return;
  el.classList.remove('up-in');
  el.innerHTML = newHTML;
  if (BUILD_FIT_MODE) {
    el.classList.add('up-in');
    return;
  }
  setTimeout(function() {
    el.classList.add('up-in');
  }, delay || 10);
}

function renderName(p) {
  updateTarget('r-name', '<span class="r-name-inner">' + esc(p.name) + '</span>', 0);
}


function renderContact(p) {
  var el = document.getElementById('r-ctc');
  if (!el) return;

  el.classList.remove('up-in');

  var c = p.contact || {};
  var parts = [];
  if (c.location) parts.push('<span class="ctc-part" data-part="location">' + esc(c.location) + '</span>');
  if (c.email) parts.push('<span class="ctc-part sensitive" data-part="email"><a href="mailto:' + encodeURIComponent(c.email) + '">' + esc(c.email) + '</a></span>');
  if (c.phone) parts.push('<span class="ctc-part sensitive" data-part="phone"><a href="tel:' + esc(c.phone.replace(/[^+\d]/g, '')) + '">' + esc(c.phone) + '</a></span>');
  if (c.url) parts.push('<span class="ctc-part" data-part="url"><a href="' + esc(c.url) + '">' + esc(c.url.replace(/^https?:\/\//, '')) + '</a></span>');
  if (c.profiles && c.profiles.length) {
    for (var i = 0; i < c.profiles.length; i++) {
      var prof = c.profiles[i];
      parts.push('<span class="ctc-part" data-part="profile"><a href="' + esc(prof.url) + '">' + esc(prof.network) + ': ' + esc(prof.username) + '</a></span>');
    }
  }

  el.innerHTML = parts.join('<span class="sep">\u202f|\u202f</span>');
  if (BUILD_FIT_MODE) el.classList.add('up-in');
  else setTimeout(function() { el.classList.add('up-in'); }, 10);
}

function renderSummary(p) {
  if (!p.summary) {
    updateTarget('r-summary', '', 30);
    return;
  }
  var html = '<h2 class="r-lbl" id="r-summary-label">Areas of Focus</h2>'
    + '<p class="r-prose summary-text">' + nb(esc(p.summary || '')) + '</p>';
  updateTarget('r-summary', html, 30);
}

function renderExperience(p) {
  if (!p.experience || !p.experience.length) {
    updateTarget('r-experience', '', 60);
    return;
  }

  var pieces = ['<h2 class="r-lbl" id="r-experience-label">Relevant Experience</h2>'];
  p.experience.forEach(function(e, idx) {
    var highlights = (e.highlights || []).map(function(b) {
      return '<li class="bl-item">' + nb(esc(b)) + '</li>';
    }).join('');

    pieces.push(
      '<article class="exp-block" data-idx="' + idx + '">'
      + '<div class="r-item-hdr"><span class="r-co">' + esc(e.company) + '</span><span class="r-date">' + esc(e.date) + '</span></div>'
      + '<div class="r-role">' + esc(e.role) + '</div>'
      + (highlights ? '<ul class="r-ul r-prose">' + highlights + '</ul>' : '')
      + '</article>'
    );
  });

  updateTarget('r-experience', pieces.join(''), 60);
}

function renderProjects(p) {
  if (!p.projects || !p.projects.length) {
    updateTarget('r-projects', '', 80);
    return;
  }

  var pieces = ['<h2 class="r-lbl" id="r-projects-label">Related Projects</h2>'];
  p.projects.forEach(function(pr, idx) {
    var highlights = (pr.highlights || []).map(function(b) {
      return '<li class="bl-item">' + nb(esc(b)) + '</li>';
    }).join('');

    pieces.push(
      '<article class="proj-block" data-idx="' + idx + '">'
      + '<div class="r-item-hdr"><span class="r-co">' + esc(pr.name) + '</span></div>'
      + (pr.description ? '<div class="r-prose proj-desc">' + esc(pr.description) + '</div>' : '')
      + (highlights ? '<ul class="r-ul r-prose">' + highlights + '</ul>' : '')
      + '</article>'
    );
  });

  updateTarget('r-projects', pieces.join(''), 80);
}

function renderEducation(p) {
  if (!p.education || !p.education.length) {
    updateTarget('r-education', '', 100);
    return;
  }

  var pieces = ['<h2 class="r-lbl" id="r-education-label">Education</h2>'];
  p.education.forEach(function(e, idx) {
    var degree = [e.studyType, e.area].filter(Boolean).join(', ');
    pieces.push(
      '<article class="edu-block" data-idx="' + idx + '">'
      + '<div class="r-item-hdr"><span class="r-co">' + esc(e.institution) + '</span><span class="r-date">' + esc(e.date) + '</span></div>'
      + '<div class="edu-meta r-prose">'
      + '<span class="edu-degree">' + esc(degree) + '</span>'
      + (e.summary ? '<span class="edu-summary">' + esc(e.summary) + '</span>' : '')
      + '</div>'
      + '</article>'
    );
  });

  updateTarget('r-education', pieces.join(''), 100);
}

function renderAdditional(p) {
  var a = p.additional || {};
  var parts = [];

  if (a.skills && a.skills.length) {
    parts.push('<p class="r-prose skills-text"><b>Skills: </b>' + esc(a.skills.join(', ')) + '</p>');
  }
  if (a.certifications && a.certifications.length) {
    parts.push('<p class="r-prose"><b>Certifications: </b>' + esc(a.certifications.join(', ')) + '</p>');
  }
  if (a.languages && a.languages.length) {
    parts.push('<p class="r-prose"><b>Languages: </b>' + esc(a.languages.join(', ')) + '</p>');
  }
  if (a.workAuthorization) {
    parts.push('<p class="r-prose"><b>Work authorization: </b>' + esc(a.workAuthorization) + '</p>');
  }
  if (a.leadership && a.leadership.length) {
    parts.push('<p class="r-prose"><b>Leadership: </b>' + esc(a.leadership.join(' \u202f|\u202f ')) + '</p>');
  }

  if (!parts.length) {
    updateTarget('r-additional', '', 120);
    return;
  }

  updateTarget('r-additional', '<h2 class="r-lbl" id="r-additional-label">Additional Information</h2>' + parts.join(''), 120);
}



/* =================================================================
   RENDER — MATRIX (left sidebar dropdowns)
   ================================================================= */
function renderMx() {
  var el = document.getElementById('mxD');
  if (!el || !cur) return;

  el.innerHTML = '<div class="field"><span class="field-label" id="role-label">I am a</span>'
    + '<button class="field-control" type="button" data-k="role" aria-labelledby="role-label"><span class="field-val">' + esc(cur.role) + '</span><i class="ti ti-chevron-down" aria-hidden="true"></i></button></div>'
    + '<div class="field"><span class="field-label" id="industry-label">for</span>'
    + '<button class="field-control" type="button" data-k="ind" aria-labelledby="industry-label"><span class="field-val">' + esc(cur.industry) + '</span><i class="ti ti-chevron-down" aria-hidden="true"></i></button></div>';

  el.querySelector('[data-k="role"]').onclick = function(e) { showPop(e, roles(), 'role'); };
  el.querySelector('[data-k="ind"]').onclick = function(e) { showPop(e, industries(cur.role), 'ind'); };
}

function showPop(e, opts, key) {
  var pop = document.getElementById('popover');
  if (!pop) return;

  var rect = e.currentTarget.getBoundingClientRect();
  pop.style.top = rect.bottom + 8 + 'px';
  pop.style.left = rect.left + 'px';
  pop.innerHTML = opts.map(function(o) {
    var selected = (key === 'role' ? cur.role : cur.industry) === o;
    return '<button class="mtx-opt ' + (selected ? 'sel' : '') + '" type="button" role="option" aria-selected="' + selected + '">' + esc(o) + '</button>';
  }).join('');
  pop.classList.add('on');

  var off = function(ev) {
    if (ev.target.classList.contains('mtx-opt')) {
      var val = ev.target.textContent;
      if (key === 'role') {
        var nextIndustry = industries(val)[0];
        for (var j = 0; j < P.length; j++) {
          if (P[j].role === val && P[j].industry === nextIndustry) {
            sel(P[j].id);
            break;
          }
        }
      } else {
        for (var k = 0; k < P.length; k++) {
          if (P[k].role === cur.role && P[k].industry === val) {
            sel(P[k].id);
            break;
          }
        }
      }
    }
    pop.classList.remove('on');
    window.removeEventListener('click', off);
  };

  setTimeout(function() { window.addEventListener('click', off); }, 10);
}

function scheduleFinalizeLayout() {
  var token = ++finalizeToken;
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      if (token !== finalizeToken) return;
      applyDesktopSheetScale();
      validateDesktopA4Fit();
    });
  });
}

function measureA4Layout() {
  var sheet = document.getElementById('sheet');
  if (!sheet) return { overflowPx: 0, resolved: false, titleOverflows: [] };

  var previousTransform = sheet.style.transform;
  sheet.style.transform = 'none';
  var overflowPx = Math.max(0, sheet.scrollHeight - sheet.clientHeight);
  var titleOverflows = [];

  sheet.querySelectorAll('.r-co').forEach(function(title) {
    var lineHeight = parseFloat(getComputedStyle(title).lineHeight) || 1;
    var lines = Math.ceil(title.getBoundingClientRect().height / lineHeight);
    if (lines > 2) titleOverflows.push({ text: title.textContent.trim(), lines: lines });
  });

  sheet.style.transform = previousTransform;
  return {
    overflowPx: Number(overflowPx.toFixed(3)),
    resolved: overflowPx <= 1 && titleOverflows.length === 0,
    titleOverflows: titleOverflows
  };
}

function validateDesktopA4Fit() {
  if (!cur) return;
  var measurement = measureA4Layout();
  setA4RuntimeState({
    profileId: cur.id,
    removed: cur.omissions || [],
    truncated: Boolean(cur.omissions && cur.omissions.length),
    resolved: measurement.resolved,
    overflowPx: measurement.overflowPx,
    titleOverflows: measurement.titleOverflows
  });

  if (!measurement.resolved) {
    console.error('[resume:a4] Profile violates the fixed A4 layout.', window[A4_RUNTIME_KEY]);
  }
}

function cloneProfile(profile) {
  return typeof structuredClone === 'function'
    ? structuredClone(profile)
    : JSON.parse(JSON.stringify(profile));
}

function omitLast(array, label, omissions) {
  if (!array || !array.length) return false;
  var value = array.pop();
  omissions.push({ type: label, value: typeof value === 'string' ? value : (value.name || value.company || value.institution || '') });
  return true;
}

function removeNextOptional(profile, omissions) {
  var additional = profile.additional || {};
  if (omitLast(additional.leadership, 'leadership', omissions)) return true;
  if (omitLast(additional.certifications, 'certification', omissions)) return true;
  if (omitLast(additional.languages, 'language', omissions)) return true;
  if (additional.workAuthorization) {
    omissions.push({ type: 'workAuthorization', value: additional.workAuthorization });
    additional.workAuthorization = '';
    return true;
  }
  if (additional.skills && additional.skills.length > 8) {
    return omitLast(additional.skills, 'skill', omissions);
  }

  for (var projectIndex = profile.projects.length - 1; projectIndex >= 0; projectIndex -= 1) {
    var project = profile.projects[projectIndex];
    if (project.highlights && project.highlights.length > 1) {
      return omitLast(project.highlights, 'projectHighlight', omissions);
    }
    if (project.description) {
      omissions.push({ type: 'projectDescription', value: project.name });
      project.description = '';
      return true;
    }
  }
  if (profile.projects && profile.projects.length) return omitLast(profile.projects, 'project', omissions);

  for (var experienceIndex = profile.experience.length - 1; experienceIndex >= 0; experienceIndex -= 1) {
    var experience = profile.experience[experienceIndex];
    if (experience.highlights && experience.highlights.length > 1) {
      return omitLast(experience.highlights, 'experienceHighlight', omissions);
    }
  }
  if (profile.experience && profile.experience.length > 2) return omitLast(profile.experience, 'experience', omissions);

  for (var educationIndex = profile.education.length - 1; educationIndex >= 0; educationIndex -= 1) {
    if (profile.education[educationIndex].summary) {
      omissions.push({ type: 'educationSummary', value: profile.education[educationIndex].institution });
      profile.education[educationIndex].summary = '';
      return true;
    }
  }
  if (profile.education && profile.education.length > 1) return omitLast(profile.education, 'education', omissions);

  if (profile.summary) {
    omissions.push({ type: 'summary', value: profile.summary });
    profile.summary = '';
    return true;
  }
  return false;
}

function settleDocumentLayout() {
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  if (BUILD_FIT_MODE) return Promise.resolve(fontsReady);
  return Promise.resolve(fontsReady)
    .then(function() {
      return new Promise(function(resolve) {
        requestAnimationFrame(function() { requestAnimationFrame(resolve); });
      });
    });
}

async function fitProfileForBuild(profileId) {
  var source = byId(profileId);
  if (!source) throw new Error('Unknown profile: ' + profileId);

  var candidate = cloneProfile(source);
  var omissions = [];
  for (var pass = 0; pass < 300; pass += 1) {
    candidate.omissions = omissions;
    cur = candidate;
    renderProfile(candidate);
    await settleDocumentLayout();
    var measurement = measureA4Layout();
    if (measurement.resolved) {
      return { profile: candidate, measurement: measurement, passes: pass + 1, omissions: omissions };
    }
    if (!removeNextOptional(candidate, omissions)) {
      throw new Error(profileId + ' cannot fit A4 after exhausting optional content; overflow=' + measurement.overflowPx + 'px');
    }
  }
  throw new Error(profileId + ' exceeded the 300-pass fit guard');
}

/* =================================================================
   SELECT / SWAP
   ================================================================= */
function updateDownloadLink(p) {
  var dl = document.getElementById('dlBtn');
  if (!dl) return;
  dl.hidden = !p.pdfAvailable;
  if (!p.pdfAvailable) {
    dl.removeAttribute('href');
    dl.removeAttribute('download');
    return;
  }
  dl.setAttribute('href', pdfHref(p));
  dl.setAttribute('download', pdfName(p));
}

function renderProfile(p) {
  renderName(p);
  renderContact(p);
  renderSummary(p);
  renderExperience(p);
  renderProjects(p);
  renderEducation(p);
  renderAdditional(p);
  renderMx();
  updateDownloadLink(p);
  document.title = p.name + ' — ' + p.role + ' Résumé';
  if (!BUILD_FIT_MODE) scheduleFinalizeLayout();
}

function sel(id, skipHist) {
  var p = byId(id);
  if (!p) return;

  if (skipHist) {
    // If skipping history (e.g. from popstate), just render directly to avoid loop
    cur = p;
    track('view_pair', { pair: p.id });
    renderProfile(p);
    useStore.setState({ profileId: p.id });
  } else {
    // Trigger via store
    useStore.getState().setProfile(p.id);
  }
}

/* =================================================================
   BOOT
   ================================================================= */

function initStageObserver() {
  if (BUILD_FIT_MODE) return;
  var stage = document.querySelector('.stage');
  if (!stage || typeof ResizeObserver === 'undefined' || stageObserver) return;
  stageObserver = new ResizeObserver(function() {
    handleStageResize();
  });
  stageObserver.observe(stage);
}

function handleStageResize() {
  clearTimeout(stageResizeTimer);
  stageResizeTimer = setTimeout(function() {
    var mobileMode = isMobileLayout();
    applyDesktopSheetScale();

    if (lastMobileMode !== mobileMode && cur) {
      /* Layout mode flipped — full re-render at the new display scale. */
      lastMobileMode = mobileMode;
      renderProfile(cur);
      return;
    }

    /* The built payload is already fitted; resizing only revalidates it. */
    if (!mobileMode && cur) {
      validateDesktopA4Fit();
    }

    lastMobileMode = mobileMode;
  }, 40);
}

window.addEventListener('resize', handleStageResize);
window.addEventListener('popstate', function(e) {
  if (e.state && e.state.profileId) {
    useStore.getState().setProfile(e.state.profileId);
  } else {
    var p = pickInit();
    if (p) useStore.getState().setProfile(p.id);
  }
});

if (!P.length) {
  console.error('[engine] No profiles loaded — public/data.js may be missing');
  document.getElementById('sheet').innerHTML = '<div style="padding:40pt;text-align:center;color:#999">Loading profiles...</div>';
} else {
  window.__RESUME_BUILD__ = {
    profileIds: P.map(function(profile) { return profile.id; }),
    fitProfile: fitProfileForBuild,
    renderProfile: async function(profile) {
      var next = typeof profile === 'string' ? byId(profile) : profile;
      if (!next) throw new Error('Unknown profile');
      cur = next;
      renderProfile(next);
      await settleDocumentLayout();
      return measureA4Layout();
    },
    measure: measureA4Layout
  };
  cur = pickInit();
  lastMobileMode = isMobileLayout();
  initStageObserver();
  zoomReset();
  renderProfile(cur);
  document.documentElement.dataset.resumeReady = 'true';

  if (BUILD_FIT_MODE && new URLSearchParams(location.search).get('_fitAll') === '1') {
    Promise.resolve().then(async function() {
      var results = [];
      for (var profileIndex = 0; profileIndex < P.length; profileIndex += 1) {
        results.push(await fitProfileForBuild(P[profileIndex].id));
      }
      var output = document.createElement('pre');
      output.id = 'fit-output';
      output.hidden = true;
      output.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(results))));
      document.body.appendChild(output);
      document.documentElement.dataset.fitComplete = 'true';
    }).catch(function(error) {
      document.documentElement.dataset.fitError = error && error.message ? error.message : String(error);
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      scheduleFinalizeLayout();
    });
  }

  window.addEventListener('load', function() {
    scheduleFinalizeLayout();
  });

  var btnSurprise = document.getElementById('btnSurprise');
  if (btnSurprise) {
    btnSurprise.onclick = function() {
      if (!P.length) return;
      var randomProfile = P[Math.floor(Math.random() * P.length)];
      useStore.getState().setProfile(randomProfile.id);
    };
  }

  // Attach control listeners since module hides global scope
  var btnZoomIn = document.getElementById('btnZoomIn');
  var btnZoomOut = document.getElementById('btnZoomOut');
  var btnZoomReset = document.getElementById('btnZoomReset');
  var btnRedact = document.getElementById('btnRedact');

  if (btnZoomIn) btnZoomIn.onclick = function() { zoom(0.05); };
  if (btnZoomOut) btnZoomOut.onclick = function() { zoom(-0.05); };
  if (btnZoomReset) btnZoomReset.onclick = function() { zoomReset(); };
  if (btnRedact) btnRedact.onclick = function() { useStore.getState().toggleRedacted(); };
}
