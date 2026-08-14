import { createStore } from './lib/zustand-vanilla.js';
import { animate as motionAnimate, stagger as motionStagger } from 'motion';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);
gsap.config({ nullTargetWarn: false });

/* =================================================================
   DATA LAYER - loaded from public/data.js via window.PROFILES
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
    applyRedactionState(state.isRedacted);
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

      // Update URL without polluting history (replaceState)
      var url = new URL(location.href);
      url.searchParams.set('role', p.family || p.role);
      url.searchParams.set('industry', p.industry);
      history.replaceState({ profileId: p.id }, '', url);

      // Update DOM components with a layout-aware morph transition.
      renderProfileWithTransition(p);
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

/* =================================================================
   STATE & RUNTIME FLAGS
   ================================================================= */
var cur = null;
var fitScale = 1;
var finalizeToken = 0;
var stageResizeTimer = null;
var stageObserver = null;
var lastMobileMode = null;
var hasRenderedProfile = false;
var activePopoverTrigger = null;
var mobileMenuReturnFocus = null;
var A4_RUNTIME_KEY = '__RESUME_A4_RUNTIME__';
var BUILD_FIT_MODE = new URLSearchParams(location.search).get('_fit') === '1';
var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
var activeProfileTransition = null;

function canAnimate() {
  return !BUILD_FIT_MODE && !reducedMotionQuery.matches;
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

function byId(id) {
  for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i];
  return null;
}

function roleFamily(profile) {
  return profile.family || profile.role;
}

function roles() {
  var seen = {}, out = [];
  for (var i = 0; i < P.length; i++) {
    var family = roleFamily(P[i]);
    if (!seen[family]) {
      seen[family] = 1;
      out.push(family);
    }
  }
  return out;
}

function industries(role) {
  var out = [];
  for (var i = 0; i < P.length; i++) if (roleFamily(P[i]) === role) out.push(P[i].industry);
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
      if ((roleFamily(P[i]).toLowerCase() === role.toLowerCase() || P[i].role.toLowerCase() === role.toLowerCase()) && P[i].industry.toLowerCase() === industry.toLowerCase()) {
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

  var stageStyle = getComputedStyle(els.stage);
  var padX = parseFloat(stageStyle.paddingLeft) + parseFloat(stageStyle.paddingRight);
  var padY = parseFloat(stageStyle.paddingTop) + parseFloat(stageStyle.paddingBottom);

  /* Measure the sheet at its natural CSS dimensions (unscaled) */
  var prevTransform = els.sheet.style.transform;
  els.sheet.style.transform = 'none';
  var naturalWidth = els.sheet.offsetWidth;
  var naturalHeight = els.sheet.offsetHeight;
  var isMasterCV = els.sheet.classList.contains('is-master-cv');
  els.sheet.style.transform = prevTransform;

  // Stage now purely flexes, no absolute floating controls overlapping it
  var availableWidth = Math.max(els.stage.clientWidth - padX, naturalWidth * 0.3);
  var availableHeight = Math.max(els.stage.clientHeight - padY, naturalHeight * 0.3);

  fitScale = isMasterCV
    ? Math.min(availableWidth / naturalWidth, 1)
    : Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);
  /* Touch layouts always fit the complete page; native pinch zoom remains available. */
  var storedZoomLevel = useStore.getState().zoomLevel;
  var zoomLevel = isMobileLayout() ? 1 : storedZoomLevel;
  var appliedScale = Math.max(fitScale * zoomLevel, 0.25);

  /* Size the wrap to the visual (post-scale) footprint so flexbox centres it correctly */
  els.wrap.style.width = Math.round(naturalWidth * appliedScale) + 'px';
  els.wrap.style.height = Math.round(naturalHeight * appliedScale) + 'px';
  els.wrap.style.maxWidth = '';
  els.wrap.style.maxHeight = '';

  /* Scale from top-left so wrap clip stays perfectly aligned */
  els.sheet.style.transformOrigin = 'top left';
  els.sheet.style.transform = 'scale(' + appliedScale + ')';
  els.stage.classList.toggle('is-zoomed', zoomLevel > 1.001);

  var zoomValue = document.getElementById('zoomValue');
  if (zoomValue) zoomValue.textContent = Math.round(storedZoomLevel * 100) + '%';
  var zoomInButton = document.getElementById('btnZoomIn');
  var zoomOutButton = document.getElementById('btnZoomOut');
  if (zoomInButton) zoomInButton.disabled = storedZoomLevel >= 2.5;
  if (zoomOutButton) zoomOutButton.disabled = storedZoomLevel <= 0.85;

  requestAnimationFrame(function() {
    if (zoomLevel > 1.001) {
      els.stage.scrollLeft = Math.max(0, (els.stage.scrollWidth - els.stage.clientWidth) / 2);
      els.stage.scrollTop = Math.max(0, (els.stage.scrollHeight - els.stage.clientHeight) / 2);
    }
  });

  setA4RuntimeState({ appliedScale: appliedScale });
}

function zoom(delta) {
  useStore.getState().setZoom(useStore.getState().zoomLevel + delta);
}

function zoomReset() {
  useStore.getState().setZoom(1);
}

function applyRedactionState(isRedacted) {
  document.body.classList.toggle('redact-mode', isRedacted);
  document.querySelectorAll('[data-redact-control]').forEach(function(redactButton) {
    redactButton.setAttribute('aria-pressed', String(isRedacted));
    redactButton.setAttribute('aria-label', isRedacted ? 'Show contact details' : 'Hide contact details');
  });
  var mobileState = document.querySelector('#btnRedactMobile .mobile-action-state');
  if (mobileState) mobileState.textContent = isRedacted ? 'On' : 'Off';
  document.querySelectorAll('.sensitive').forEach(function(item) {
    if (isRedacted) item.setAttribute('aria-label', 'Contact detail hidden');
    else item.removeAttribute('aria-label');
    item.querySelectorAll('a').forEach(function(link) {
      if (isRedacted) {
        link.setAttribute('aria-hidden', 'true');
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('aria-hidden');
        link.removeAttribute('tabindex');
      }
    });
  });
}

/* =================================================================
   TARGETED SECTION RENDERERS
   ================================================================= */
function markMicroUpdate(el) {
  if (!el || BUILD_FIT_MODE || !hasRenderedProfile) return;
  el.classList.add('micro-updated');
  if (!canAnimate()) return;
  motionAnimate(el, {
    opacity: [0.45, 1],
    y: [3, 0],
    filter: ['blur(2.5px)', 'blur(0px)']
  }, {
    duration: 0.42,
    ease: [0.16, 1, 0.3, 1]
  });
}

function setText(el, text) {
  var next = text == null ? '' : String(text);
  if (!el || el.textContent === next) return false;
  el.textContent = next;
  markMicroUpdate(el);
  return true;
}

function syncAttr(el, name, value) {
  if (!el) return;
  if (value == null || value === false || value === '') {
    el.removeAttribute(name);
    return;
  }
  if (el.getAttribute(name) !== String(value)) {
    el.setAttribute(name, String(value));
  }
}

function ensureElement(parent, selector, tagName, className) {
  var el = parent.querySelector(selector);
  if (el) return el;
  el = document.createElement(tagName);
  if (className) el.className = className;
  parent.appendChild(el);
  return el;
}

function syncChildren(parent, items, keyFn, createFn, updateFn) {
  if (!parent) return;
  var existing = {};
  Array.from(parent.children).forEach(function(child) {
    if (child.dataset && child.dataset.key) existing[child.dataset.key] = child;
  });

  var nextChildren = [];
  items.forEach(function(item, index) {
    var key = keyFn(item, index);
    var child = existing[key];
    if (!child) {
      child = createFn(item, index);
      child.dataset.key = key;
    }
    updateFn(child, item, index);
    nextChildren.push(child);
    delete existing[key];
  });

  Object.keys(existing).forEach(function(key) {
    existing[key].remove();
  });

  nextChildren.forEach(function(child, index) {
    if (parent.children[index] !== child) {
      parent.insertBefore(child, parent.children[index] || null);
    }
  });
}

function syncSectionLabel(sectionId, labelId, text) {
  var section = document.getElementById(sectionId);
  if (!section) return null;
  if (!text) {
    section.replaceChildren();
    return section;
  }
  var label = ensureElement(section, ':scope > .r-lbl', 'h2', 'r-lbl');
  label.id = labelId;
  setText(label, text);
  return section;
}

function syncSectionBody(section) {
  if (!section) return null;
  return ensureElement(section, ':scope > .r-sec-body', 'div', 'r-sec-body');
}

function clearSection(sectionId) {
  var section = document.getElementById(sectionId);
  if (section) section.replaceChildren();
}

function itemKey(parts) {
  return parts.filter(Boolean).join('|');
}

function renderMxField(container, config) {
  var field = ensureElement(container, ':scope > .field[data-field="' + config.key + '"]', 'div', 'field');
  field.dataset.field = config.key;

  var label = ensureElement(field, ':scope > .field-label', 'span', 'field-label');
  label.id = config.labelId;
  setText(label, config.label);

  var control = ensureElement(field, ':scope > .field-control', 'button', 'field-control');
  control.type = 'button';
  control.dataset.k = config.key;
  control.setAttribute('aria-labelledby', config.labelId);
  control.setAttribute('aria-haspopup', 'listbox');
  control.setAttribute('aria-controls', 'popover');
  control.setAttribute('aria-expanded', 'false');

  var value = ensureElement(control, ':scope > .field-val', 'span', 'field-val');
  setText(value, config.value);

  var icon = ensureElement(control, ':scope > .ti', 'i', 'ti ti-chevron-down');
  icon.setAttribute('aria-hidden', 'true');

  control.onclick = config.onClick;
  return field;
}

function renderName(p) {
  var el = document.getElementById('r-name');
  if (!el) return;
  var inner = ensureElement(el, ':scope > .r-name-inner', 'span', 'r-name-inner');
  setText(inner, p.name);
}

function renderContact(p) {
  var el = document.getElementById('r-ctc');
  if (!el) return;

  var c = p.contact || {};
  var parts = [];
  if (c.location) parts.push({ key: 'location', type: 'text', text: c.location });
  if (c.phone) parts.push({ key: 'phone', type: 'link', screenText: c.phone, printText: c.phone, href: 'tel:' + c.phone.replace(/[^+\d]/g, ''), sensitive: true });
  if (c.email) parts.push({ key: 'email', type: 'link', screenText: c.email, printText: c.email, href: 'mailto:' + c.email, sensitive: true });
  if (c.url) parts.push({ key: 'url', type: 'link', screenText: 'Portfolio', printText: c.url, href: c.url, outbound: true });
  if (c.profiles && c.profiles.length) {
    for (var i = 0; i < c.profiles.length; i++) {
      var prof = c.profiles[i];
      parts.push({
        key: itemKey(['profile', prof.network, prof.username, i]),
        type: 'link',
        screenText: prof.network || prof.username || 'Profile',
        printText: prof.url || prof.username || prof.network || '',
        href: prof.url,
        outbound: true
      });
    }
  }

  syncChildren(
    el,
    parts,
    function(part) { return part.key; },
    function() {
      var span = document.createElement('span');
      span.className = 'ctc-part';
      return span;
    },
    function(span, part) {
      span.className = part.sensitive ? 'ctc-part sensitive' : 'ctc-part';
      span.dataset.part = part.key;
      if (part.type === 'link') {
        var copy = span.querySelector(':scope > .ctc-copy');
        if (copy) copy.remove();
        var link = ensureElement(span, ':scope > a', 'a');
        link.className = 'ctc-link';
        syncAttr(link, 'href', part.href);
        syncAttr(link, 'target', part.outbound ? '_blank' : null);
        syncAttr(link, 'rel', part.outbound ? 'noopener noreferrer' : null);
        syncAttr(link, 'aria-label', part.outbound ? 'Open ' + part.screenText + ' in a new tab' : null);
        var screenLabel = ensureElement(link, ':scope > .screen-link-label', 'span', 'screen-link-label');
        var printLabel = ensureElement(link, ':scope > .print-link-label', 'span', 'print-link-label');
        setText(screenLabel, part.screenText);
        setText(printLabel, part.printText);
      } else {
        var existingLink = span.querySelector(':scope > a');
        if (existingLink) existingLink.remove();
        var copy = ensureElement(span, ':scope > .ctc-copy', 'span', 'ctc-copy');
        setText(copy, part.text);
      }
    }
  );

  Array.from(el.querySelectorAll(':scope > .sep')).forEach(function(sep) {
    sep.remove();
  });
  var contactParts = Array.from(el.querySelectorAll(':scope > .ctc-part'));
  contactParts.forEach(function(part, index) {
    if (index === contactParts.length - 1) return;
    var sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '\u202f|\u202f';
    el.insertBefore(sep, contactParts[index + 1]);
  });

  applyRedactionState(useStore.getState().isRedacted);
}

function renderSummary(p) {
  if (!p.summary) {
    clearSection('r-summary');
    return;
  }
  var section = syncSectionLabel('r-summary', 'r-summary-label', 'Areas of Focus');
  var body = syncSectionBody(section);
  if (!body) return;
  var text = ensureElement(body, ':scope > .summary-text', 'p', 'r-prose summary-text');
  setText(text, nb(p.summary || ''));
}

function renderExperience(p) {
  if (!p.experience || !p.experience.length) {
    clearSection('r-experience');
    return;
  }

  var section = syncSectionLabel('r-experience', 'r-experience-label', p.isMasterCV ? 'Professional Experience' : 'Relevant Experience');
  var body = syncSectionBody(section);
  if (!body) return;
  syncChildren(
    body,
    p.experience,
    function(e, idx) { return itemKey([e.company, e.role, e.date, idx]); },
    function() {
      var article = document.createElement('article');
      article.className = 'exp-block';
      article.innerHTML = '<div class="r-item-hdr"><span class="r-co"></span><span class="r-date"></span></div><div class="r-role"></div><ul class="r-ul r-prose"></ul>';
      return article;
    },
    function(article, e, idx) {
      article.dataset.idx = idx;
      setText(article.querySelector('.r-co'), e.company);
      setText(article.querySelector('.r-date'), e.date);
      setText(article.querySelector('.r-role'), e.role);

      var list = article.querySelector('.r-ul');
      var highlights = e.highlights || [];
      list.hidden = !highlights.length;
      syncChildren(
        list,
        highlights,
        function(line, lineIdx) { return itemKey([e.company, e.role, line, lineIdx]); },
        function() {
          var li = document.createElement('li');
          li.className = 'bl-item';
          return li;
        },
        function(li, line) {
          setText(li, nb(line));
        }
      );
    }
  );
}

function renderProjects(p) {
  if (!p.projects || !p.projects.length) {
    clearSection('r-projects');
    return;
  }

  var section = syncSectionLabel('r-projects', 'r-projects-label', p.isMasterCV ? 'Projects' : 'Related Projects');
  var body = syncSectionBody(section);
  if (!body) return;
  syncChildren(
    body,
    p.projects,
    function(pr, idx) { return itemKey([pr.name, idx]); },
    function() {
      var article = document.createElement('article');
      article.className = 'proj-block';
      article.innerHTML = '<div class="r-item-hdr"><span class="r-co"></span></div><div class="r-prose proj-desc"></div><ul class="r-ul r-prose"></ul>';
      return article;
    },
    function(article, pr, idx) {
      article.dataset.idx = idx;
      setText(article.querySelector('.r-co'), pr.name);

      var desc = article.querySelector('.proj-desc');
      desc.hidden = !pr.description;
      setText(desc, pr.description || '');

      var list = article.querySelector('.r-ul');
      var highlights = pr.highlights || [];
      list.hidden = !highlights.length;
      syncChildren(
        list,
        highlights,
        function(line, lineIdx) { return itemKey([pr.name, line, lineIdx]); },
        function() {
          var li = document.createElement('li');
          li.className = 'bl-item';
          return li;
        },
        function(li, line) {
          setText(li, nb(line));
        }
      );
    }
  );
}

function renderEducation(p) {
  if (!p.education || !p.education.length) {
    clearSection('r-education');
    return;
  }

  var section = syncSectionLabel('r-education', 'r-education-label', 'Education');
  var body = syncSectionBody(section);
  if (!body) return;
  syncChildren(
    body,
    p.education,
    function(e, idx) { return itemKey([e.institution, e.date, idx]); },
    function() {
      var article = document.createElement('article');
      article.className = 'edu-block';
      article.innerHTML = [
        '<div class="edu-school-row">',
          '<div class="edu-school-main">',
            '<a class="edu-institution"></a>',
            '<span class="edu-location-separator" aria-hidden="true"> - </span>',
            '<span class="edu-location"></span>',
          '</div>',
          '<span class="r-date edu-date"></span>',
        '</div>',
        '<div class="edu-details r-prose">',
          '<p class="edu-degree-line"><span class="edu-school"></span><span class="edu-school-separator" aria-hidden="true"> | </span><span class="edu-degree"></span></p>',
          '<p class="edu-fact edu-major-line"><span class="edu-fact-label">Double Major:</span><span class="edu-major"></span></p>',
          '<p class="edu-fact edu-score-line"><span class="edu-fact-label">GPA:</span><span class="edu-score"></span></p>',
          '<p class="edu-fact edu-summary-line"><span class="edu-fact-label">Focus:</span><span class="edu-summary"></span></p>',
          '<p class="edu-fact edu-honors-line"><span class="edu-fact-label">Honors:</span><span class="edu-honors"></span></p>',
          '<p class="edu-fact edu-coursework-line"><span class="edu-fact-label">Relevant Coursework:</span><span class="edu-coursework"></span></p>',
        '</div>'
      ].join('');
      return article;
    },
    function(article, e, idx) {
      article.dataset.idx = idx;
      var institution = article.querySelector('.edu-institution');
      setText(institution, e.institution);
      syncAttr(institution, 'href', e.url || null);
      syncAttr(institution, 'target', e.url ? '_blank' : null);
      syncAttr(institution, 'rel', e.url ? 'noopener noreferrer' : null);
      syncAttr(institution, 'aria-label', e.url ? 'Open ' + e.institution + ' website in a new tab' : null);

      var location = article.querySelector('.edu-location');
      var locationSeparator = article.querySelector('.edu-location-separator');
      location.hidden = !e.location;
      locationSeparator.hidden = !e.location;
      setText(location, e.location || '');

      setText(article.querySelector('.edu-date'), e.date);
      var school = article.querySelector('.edu-school');
      var schoolSeparator = article.querySelector('.edu-school-separator');
      school.hidden = !e.school;
      schoolSeparator.hidden = !e.school;
      setText(school, e.school || '');
      setText(article.querySelector('.edu-degree'), e.studyType || '');

      var details = [
        { line: '.edu-major-line', value: e.area || '', copy: '.edu-major' },
        { line: '.edu-score-line', value: e.score || '', copy: '.edu-score' },
        { line: '.edu-summary-line', value: e.summary || '', copy: '.edu-summary' },
        { line: '.edu-honors-line', value: (e.honors || []).join('; '), copy: '.edu-honors' },
        { line: '.edu-coursework-line', value: (e.courses || []).join('; '), copy: '.edu-coursework' }
      ];
      details.forEach(function(detail) {
        var line = article.querySelector(detail.line);
        line.hidden = !detail.value;
        setText(article.querySelector(detail.copy), detail.value);
      });
    }
  );
}

function renderAdditional(p) {
  var a = p.additional || {};
  var parts = [];

  if (p.isMasterCV && a.skillMap && a.skillMap.length) {
    a.skillMap.forEach(function(group, index) {
      parts.push({ key: 'skills-' + index, label: group.label || group.name || 'Skills', value: (group.keywords || []).join(', '), className: 'r-prose skills-text' });
    });
  } else if (a.skills && a.skills.length) {
    parts.push({ key: 'skills', label: 'Skills', value: a.skills.join(', '), className: 'r-prose skills-text' });
  }
  if (a.certifications && a.certifications.length) parts.push({ key: 'certifications', label: 'Certifications', value: a.certifications.join(', '), className: 'r-prose' });
  if (a.languages && a.languages.length) parts.push({ key: 'languages', label: 'Languages', value: a.languages.join(', '), className: 'r-prose' });
  if (a.workAuthorization) parts.push({ key: 'workAuthorization', label: 'Work authorization', value: a.workAuthorization, className: 'r-prose' });
  if (a.leadership && a.leadership.length) parts.push({ key: 'leadership', label: 'Leadership', value: a.leadership.join(' \u202f|\u202f '), className: 'r-prose' });

  if (!parts.length) {
    clearSection('r-additional');
    return;
  }

  var section = syncSectionLabel('r-additional', 'r-additional-label', 'Additional Information');
  var body = syncSectionBody(section);
  if (!body) return;
  syncChildren(
    body,
    parts,
    function(part) { return part.key; },
    function(part) {
      var line = document.createElement('p');
      line.className = part.className;
      line.innerHTML = '<b></b><span class="info-copy"></span>';
      return line;
    },
    function(line, part) {
      line.className = part.className;
      setText(line.querySelector('b'), part.label + ':');
      setText(line.querySelector('.info-copy'), part.value);
    }
  );
}



/* =================================================================
   RENDER - MATRIX (left sidebar dropdowns)
   ================================================================= */
function renderMx() {
  if (!cur) return;
  [
    { id: 'mxD', suffix: 'desktop' },
    { id: 'mxM', suffix: 'mobile' }
  ].forEach(function(target) {
    var el = document.getElementById(target.id);
    if (!el) return;
    renderMxField(el, {
      key: 'role',
      labelId: 'role-label-' + target.suffix,
      label: 'Role',
      value: roleFamily(cur),
      onClick: function(e) { showPop(e, roles(), 'role'); }
    });
    renderMxField(el, {
      key: 'ind',
      labelId: 'industry-label-' + target.suffix,
      label: 'Context',
      value: cur.industry,
      onClick: function(e) { showPop(e, industries(roleFamily(cur)), 'ind'); }
    });
  });
}

function selectMatrixOption(key, value) {
  if (key === 'role') {
    var nextIndustry = industries(value)[0];
    for (var j = 0; j < P.length; j++) {
      if (roleFamily(P[j]) === value && P[j].industry === nextIndustry) {
        sel(P[j].id);
        return;
      }
    }
    return;
  }

  for (var k = 0; k < P.length; k++) {
    if (roleFamily(P[k]) === roleFamily(cur) && P[k].industry === value) {
      sel(P[k].id);
      return;
    }
  }
}

function closePop(returnFocus) {
  var pop = document.getElementById('popover');
  if (!pop) return;
  var backdrop = document.getElementById('popoverBackdrop');
  var trigger = activePopoverTrigger;

  pop.classList.remove('on');
  if (backdrop) backdrop.classList.remove('on');
  document.body.classList.remove('popover-open');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  if (pop._outsideHandler) document.removeEventListener('pointerdown', pop._outsideHandler, true);
  if (pop._keyHandler) document.removeEventListener('keydown', pop._keyHandler);
  pop._outsideHandler = null;
  pop._keyHandler = null;
  activePopoverTrigger = null;

  setTimeout(function() {
    if (!pop.classList.contains('on')) pop.replaceChildren();
  }, 220);
  if (returnFocus && trigger && document.contains(trigger)) trigger.focus();
}

function showPop(e, opts, key) {
  var pop = document.getElementById('popover');
  var backdrop = document.getElementById('popoverBackdrop');
  if (!pop) return;

  var trigger = e.currentTarget;
  if (activePopoverTrigger === trigger && pop.classList.contains('on')) {
    closePop(true);
    return;
  }
  closePop(false);
  activePopoverTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');

  var currentValue = key === 'role' ? roleFamily(cur) : cur.industry;
  var titleText = key === 'role' ? 'Choose a role' : 'Choose a context';
  var searchLabel = key === 'role' ? 'Search roles' : 'Search contexts';
  pop.replaceChildren();
  pop.dataset.kind = key;
  pop.removeAttribute('role');
  pop.setAttribute('aria-labelledby', 'popoverTitle');
  pop.removeAttribute('aria-label');

  var head = document.createElement('div');
  head.className = 'mtx-pop-head';
  var titleBlock = document.createElement('div');
  titleBlock.className = 'mtx-pop-title-block';
  var kicker = document.createElement('div');
  kicker.className = 'mtx-pop-kicker';
  kicker.textContent = 'Resume configuration';
  var title = document.createElement('h2');
  title.id = 'popoverTitle';
  title.textContent = titleText;
  var meta = document.createElement('div');
  meta.className = 'mtx-pop-meta';
  var current = document.createElement('span');
  current.className = 'mtx-pop-current';
  current.textContent = 'Current · ' + currentValue;
  var optionCount = document.createElement('span');
  optionCount.className = 'mtx-pop-count';
  meta.append(current, optionCount);
  titleBlock.append(kicker, title, meta);
  var closeButton = document.createElement('button');
  closeButton.className = 'mtx-pop-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close ' + titleText.toLowerCase());
  closeButton.textContent = '×';
  closeButton.onclick = function() { closePop(true); };
  head.append(titleBlock, closeButton);

  var searchWrap = document.createElement('label');
  searchWrap.className = 'mtx-search';
  var searchIcon = document.createElement('span');
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.textContent = '⌕';
  var search = document.createElement('input');
  search.type = 'search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.placeholder = searchLabel;
  search.setAttribute('aria-label', searchLabel);
  searchWrap.append(searchIcon, search);

  var list = document.createElement('div');
  list.className = 'mtx-options';
  list.id = 'popoverOptions';
  list.setAttribute('role', 'listbox');

  function renderOptions(query) {
    var normalized = String(query || '').trim().toLowerCase();
    var filtered = opts.filter(function(option) {
      return !normalized || option.toLowerCase().includes(normalized);
    });
    optionCount.textContent = filtered.length + (filtered.length === 1 ? ' option' : ' options');
    list.replaceChildren();
    if (!filtered.length) {
      var empty = document.createElement('div');
      empty.className = 'mtx-empty';
      empty.textContent = 'No matching options';
      list.appendChild(empty);
      return;
    }

    filtered.forEach(function(option) {
      var selected = currentValue === option;
      var button = document.createElement('button');
      button.className = 'mtx-opt' + (selected ? ' sel' : '');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(selected));
      button.dataset.value = option;
      var copy = document.createElement('span');
      copy.className = 'mtx-opt-copy';
      copy.textContent = option;
      button.appendChild(copy);
      button.onclick = function() {
        selectMatrixOption(key, option);
        closePop(false);
      };
      list.appendChild(button);
    });
  }

  renderOptions('');
  search.oninput = function() { renderOptions(search.value); };
  search.onkeydown = function(event) {
    if (event.key === 'ArrowDown') {
      var firstOption = list.querySelector('.mtx-opt');
      if (firstOption) {
        event.preventDefault();
        firstOption.focus();
      }
    }
  };
  list.onkeydown = function(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    var options = Array.from(list.querySelectorAll('.mtx-opt'));
    var currentIndex = options.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    event.preventDefault();
    var nextIndex = event.key === 'ArrowDown'
      ? Math.min(options.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);
    options[nextIndex].focus();
  };

  pop.append(head, searchWrap, list);
  var rect = trigger.getBoundingClientRect();
  var popWidth = Math.min(380, Math.max(300, rect.width));
  var desiredHeight = Math.min(560, 132 + opts.length * 44, window.innerHeight - 24);
  var popTop = rect.bottom + 8;
  if (popTop + desiredHeight > window.innerHeight - 12) {
    popTop = Math.max(12, rect.top - desiredHeight - 8);
  }
  pop.style.top = popTop + 'px';
  pop.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - popWidth - 12)) + 'px';
  pop.style.width = popWidth + 'px';
  pop.style.maxHeight = Math.max(220, Math.min(560, window.innerHeight - popTop - 12)) + 'px';

  document.body.classList.add('popover-open');
  if (backdrop) backdrop.classList.add('on');
  void pop.offsetWidth;
  pop.classList.add('on');
  if (canAnimate()) {
    motionAnimate(Array.from(pop.querySelectorAll('.mtx-pop-head, .mtx-search, .mtx-opt')), {
      opacity: [0, 1],
      y: [8, 0]
    }, {
      duration: 0.34,
      delay: motionStagger(0.018),
      ease: [0.16, 1, 0.3, 1]
    });
  }

  pop._outsideHandler = function(event) {
    if (!pop.contains(event.target) && event.target !== trigger) closePop(false);
  };
  pop._keyHandler = function(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePop(true);
    }
  };
  setTimeout(function() {
    document.addEventListener('pointerdown', pop._outsideHandler, true);
    document.addEventListener('keydown', pop._keyHandler);
    search.focus();
  }, 20);
}

function setMobileMenu(open, restoreFocus) {
  var menu = document.getElementById('mobileMenu');
  var trigger = document.getElementById('mobileMenuBtn');
  var scrim = document.getElementById('mobileMenuScrim');
  if (!menu || !trigger || !scrim) return;

  if (open) {
    mobileMenuReturnFocus = document.activeElement;
    menu.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', 'Close résumé controls');
    document.body.classList.add('mobile-menu-open');
    void menu.offsetWidth;
    menu.classList.add('on');
    scrim.classList.add('on');
    if (canAnimate()) {
      motionAnimate(Array.from(menu.querySelectorAll('.mobile-menu-kicker, .mobile-menu-head h2, .mobile-matrix .field, .mobile-menu-copy, .mobile-action')), {
        opacity: [0, 1],
        x: [12, 0]
      }, {
        duration: 0.38,
        delay: motionStagger(0.035),
        ease: [0.16, 1, 0.3, 1]
      });
    }

    menu._keyHandler = function(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileMenu(false);
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = Array.from(menu.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])'))
        .filter(function(element) { return !element.hidden && element.offsetParent !== null; });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', menu._keyHandler);
    setTimeout(function() {
      var firstControl = menu.querySelector('.field-control');
      if (firstControl) firstControl.focus();
    }, 220);
    return;
  }

  closePop(false);
  menu.classList.remove('on');
  scrim.classList.remove('on');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', 'Open résumé controls');
  document.body.classList.remove('mobile-menu-open');
  if (menu._keyHandler) document.removeEventListener('keydown', menu._keyHandler);
  menu._keyHandler = null;
  setTimeout(function() { menu.setAttribute('aria-hidden', 'true'); }, 240);
  if (restoreFocus !== false) {
    if (mobileMenuReturnFocus && document.contains(mobileMenuReturnFocus)) mobileMenuReturnFocus.focus();
    else trigger.focus();
  }
  mobileMenuReturnFocus = null;
}

function selectRandomProfile() {
  if (!P.length) return;
  var randomProfile = P[Math.floor(Math.random() * P.length)];
  useStore.getState().setProfile(randomProfile.id);
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
  if (!sheet) return { overflowPx: 0, resolved: false, titleOverflows: [], typographyIssues: [] };

  var previousTransform = sheet.style.transform;
  sheet.style.transform = 'none';
  var sheetStyle = getComputedStyle(sheet);
  var paddingBottom = parseFloat(sheetStyle.paddingBottom) || 0;
  var contentBoundary = sheet.clientHeight - paddingBottom;
  var renderedSections = Array.from(sheet.children).filter(function(child) {
    return child.offsetWidth > 0 && child.offsetHeight > 0;
  });
  var actualContentBottom = renderedSections.reduce(function(bottom, child) {
    /*
     * offsetTop is layout geometry and deliberately excludes the 6px entrance
     * transform. getBoundingClientRect().bottom includes that animation, which
     * made a fitted document report a false overflow while transitions ran
     * (or indefinitely in a throttled background tab).
     */
    return Math.max(bottom, child.offsetTop + child.getBoundingClientRect().height);
  }, 0);
  var sheetOverflow = sheet.scrollHeight - sheet.clientHeight;
  var marginOverflow = actualContentBottom - contentBoundary;
  var overflowPx = Math.max(0, sheetOverflow, marginOverflow);
  var titleOverflows = [];
  var typographyIssues = [];
  var expectedRoleFontPx = 9.8 * 96 / 72;
  var expectedLeadingPx = 11.7 * 96 / 72;

  sheet.querySelectorAll('.r-co').forEach(function(title) {
    var lineHeight = parseFloat(getComputedStyle(title).lineHeight) || 1;
    var lines = Math.ceil(title.getBoundingClientRect().height / lineHeight);
    if (lines > 2) titleOverflows.push({ text: title.textContent.trim(), lines: lines });
  });

  sheet.querySelectorAll('.r-role').forEach(function(role) {
    var style = getComputedStyle(role);
    var fontSize = parseFloat(style.fontSize) || 0;
    var lineHeight = parseFloat(style.lineHeight) || 0;
    var lines = Math.ceil(role.getBoundingClientRect().height / Math.max(1, lineHeight));
    if (Math.abs(fontSize - expectedRoleFontPx) > 0.2 ||
        Math.abs(lineHeight - expectedLeadingPx) > 0.2 ||
        lines > 2) {
      typographyIssues.push({
        element: 'role',
        text: role.textContent.trim(),
        fontSizePx: Number(fontSize.toFixed(3)),
        lineHeightPx: Number(lineHeight.toFixed(3)),
        lines: lines
      });
    }
  });

  sheet.querySelectorAll('.r-ul li').forEach(function(item) {
    var lineHeight = parseFloat(getComputedStyle(item).lineHeight) || 0;
    if (Math.abs(lineHeight - expectedLeadingPx) > 0.2) {
      typographyIssues.push({
        element: 'bullet',
        text: item.textContent.trim().slice(0, 80),
        lineHeightPx: Number(lineHeight.toFixed(3))
      });
    }
  });

  sheet.style.transform = previousTransform;
  return {
    overflowPx: Number(overflowPx.toFixed(3)),
    resolved: overflowPx <= 1 && titleOverflows.length === 0 && typographyIssues.length === 0,
    titleOverflows: titleOverflows,
    typographyIssues: typographyIssues,
    bottomMarginPx: Number(paddingBottom.toFixed(3)),
    remainingBottomSpacePx: Number(Math.max(0, sheet.clientHeight - actualContentBottom).toFixed(3))
  };
}

function validateDesktopA4Fit() {
  if (!cur) return;
  if (cur.isMasterCV) {
    setA4RuntimeState({
      profileId: cur.id,
      removed: [],
      truncated: false,
      resolved: true,
      overflowPx: 0,
      titleOverflows: []
    });
    return;
  }
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

function omitLastSkill(additional, omissions) {
  if (!additional.skills || additional.skills.length <= 8) return false;
  var value = additional.skills.pop();
  var groups = additional.skillMap || [];

  for (var groupIndex = groups.length - 1; groupIndex >= 0; groupIndex -= 1) {
    var keywordIndex = groups[groupIndex].keywords.lastIndexOf(value);
    if (keywordIndex === -1) continue;
    groups[groupIndex].keywords.splice(keywordIndex, 1);
    if (!groups[groupIndex].keywords.length) groups.splice(groupIndex, 1);
    break;
  }

  omissions.push({ type: 'skill', value: value });
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
  if (omitLastSkill(additional, omissions)) return true;

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

  for (var experienceIndex = profile.experience.length - 1; experienceIndex >= 0; experienceIndex -= 1) {
    var experience = profile.experience[experienceIndex];
    if (experience.highlights && experience.highlights.length > 1) {
      return omitLast(experience.highlights, 'experienceHighlight', omissions);
    }
  }
  if (profile.projects && profile.projects.length) return omitLast(profile.projects, 'project', omissions);
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
    if (measurement.typographyIssues.length) {
      throw new Error(profileId + ' violates fixed PDF typography invariants: ' + JSON.stringify(measurement.typographyIssues));
    }
    if (measurement.resolved) {
      return { profile: candidate, measurement: measurement, passes: pass + 1, omissions: omissions };
    }
    if (!removeNextOptional(candidate, omissions)) {
      throw new Error(profileId + ' cannot fit A4 after exhausting optional content; overflow=' + measurement.overflowPx + 'px; overlong titles=' + JSON.stringify(measurement.titleOverflows));
    }
  }
  throw new Error(profileId + ' exceeded the 300-pass fit guard');
}

/* =================================================================
   SELECT / SWAP
   ================================================================= */
function updateDownloadLink(p) {
  var links = document.querySelectorAll('[data-download-link]');
  var status = document.getElementById('pdfStatus');
  if (status) status.hidden = p.pdfAvailable;
  links.forEach(function(dl) {
    dl.hidden = !p.pdfAvailable;
    if (!p.pdfAvailable) {
      dl.removeAttribute('href');
      dl.removeAttribute('download');
      return;
    }
    dl.setAttribute('href', pdfHref(p));
    dl.setAttribute('download', pdfName(p));
  });
}

function renderProfileMeta(p) {
  setText(document.getElementById('activeProfileRole'), roleFamily(p));
  setText(document.getElementById('activeProfileContext'), p.industry);
  setText(document.getElementById('stageProfileLabel'), roleFamily(p) + ' | ' + p.industry);
}

function renderProfile(p) {
  var sheet = document.getElementById('sheet');
  if (sheet) sheet.classList.toggle('is-master-cv', Boolean(p.isMasterCV));
  document.body.classList.toggle('master-cv-active', Boolean(p.isMasterCV));
  renderName(p);
  renderContact(p);
  renderSummary(p);
  renderExperience(p);
  renderProjects(p);
  renderEducation(p);
  renderAdditional(p);
  renderMx();
  renderProfileMeta(p);
  updateDownloadLink(p);
  document.title = p.name + ' | ' + p.role + ' | Resume';
  hasRenderedProfile = true;
  if (!BUILD_FIT_MODE) scheduleFinalizeLayout();
}

function renderProfileWithTransition(p) {
  if (!canAnimate() || !hasRenderedProfile) {
    renderProfile(p);
    return;
  }

  var sheet = document.getElementById('sheet');
  var stableSections = sheet ? Array.from(sheet.children) : [];
  var layoutState = stableSections.length
    ? Flip.getState(stableSections, { props: 'opacity' })
    : null;

  if (activeProfileTransition) activeProfileTransition.kill();
  renderProfile(p);

  if (layoutState) {
    activeProfileTransition = Flip.from(layoutState, {
      duration: 0.68,
      ease: 'power3.inOut',
      nested: true,
      prune: true,
      scale: false,
      simple: true,
      clearProps: 'transform',
      onComplete: function() { activeProfileTransition = null; }
    });
  }

}

function sel(id, skipHist) {
  var p = byId(id);
  if (!p) return;

  if (skipHist) {
    // If skipping history (e.g. from popstate), just render directly to avoid loop
    cur = p;
    renderProfileWithTransition(p);
    useStore.setState({ profileId: p.id });
  } else {
    // Trigger via store
    useStore.getState().setProfile(p.id);
  }
}

function initMotionSystem() {
  document.documentElement.dataset.motion = canAnimate() ? 'enhanced' : 'reduced';
  if (!canAnimate()) return;

  var leftRailItems = Array.from(document.querySelectorAll(
    '.aside.l .brand-lockup, .aside.l .rail-heading, .aside.l .sec-title, .aside.l .card, .aside.l .microcopy, .aside.l .action-stack, .aside.l .rail-footer'
  ));
  var rightRailItems = Array.from(document.querySelectorAll(
    '.aside.r > .rail-kicker, .aside.r > .profile-signal, .aside.r > .sec-title, .aside.r > .zoom-ctrl, .aside.r > .actions-title, .aside.r > .dl-btn, .aside.r > .download-status, .aside.r > .listening-panel'
  ));

  motionAnimate(leftRailItems, {
    opacity: [0, 1],
    x: [-18, 0],
    filter: ['blur(7px)', 'blur(0px)']
  }, {
    duration: 0.62,
    delay: motionStagger(0.055),
    ease: [0.16, 1, 0.3, 1]
  });

  motionAnimate(rightRailItems, {
    opacity: [0, 1],
    x: [18, 0],
    filter: ['blur(7px)', 'blur(0px)']
  }, {
    duration: 0.62,
    delay: motionStagger(0.045),
    ease: [0.16, 1, 0.3, 1]
  });

  motionAnimate('#wrap', {
    opacity: [0, 1],
    y: [20, 0],
    scale: [0.985, 1]
  }, {
    duration: 0.85,
    delay: 0.12,
    ease: [0.16, 1, 0.3, 1]
  });

  motionAnimate('.stage-meta', {
    opacity: [0, 1],
    y: [-8, 0]
  }, {
    duration: 0.55,
    delay: 0.28,
    ease: [0.16, 1, 0.3, 1]
  });

  var listeningDetails = document.querySelector('.listening-details');
  if (listeningDetails) {
    listeningDetails.addEventListener('toggle', function() {
      if (!listeningDetails.open) return;
      gsap.fromTo(listeningDetails.querySelector('p'),
        { opacity: 0, y: -5, filter: 'blur(3px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, ease: 'power3.out' }
      );
    });
  }
}

/* =================================================================
   BOOT
   ================================================================= */

function initStageObserver() {
  if (BUILD_FIT_MODE) return;
  var app = document.querySelector('.app');
  if (!app || typeof ResizeObserver === 'undefined' || stageObserver) return;
  stageObserver = new ResizeObserver(function() {
    handleStageResize();
  });
  /*
   * Observe the viewport-sized shell, not the scrollable stage. Scaling the
   * sheet can toggle stage scrollbars; observing that content box feeds the
   * scrollbar change back into scaling and can lock the interactive page in
   * a ResizeObserver loop. The app shell changes for every real layout resize
   * without reacting to its descendants' scroll geometry.
   */
  stageObserver.observe(app);
}

function handleStageResize() {
  /*
   * Coalesce resize bursts without postponing the work indefinitely. A
   * ResizeObserver may emit several notifications while scrollbars settle;
   * repeatedly clearing the timer can starve the breakpoint update.
   */
  if (stageResizeTimer !== null) return;
  stageResizeTimer = setTimeout(function() {
    stageResizeTimer = null;
    var mobileMode = isMobileLayout();
    if (document.getElementById('popover')?.classList.contains('on')) closePop(false);
    if (!mobileMode && document.body.classList.contains('mobile-menu-open')) {
      setMobileMenu(false, false);
    }
    applyDesktopSheetScale();

    if (lastMobileMode !== mobileMode && cur) {
      /* Layout mode flipped - full re-render at the new display scale. */
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
  console.error('[engine] No profiles loaded - public/data.js may be missing');
  document.getElementById('sheet').innerHTML = '<div style="padding:40pt;text-align:center;color:#999">Loading profiles...</div>';
} else {
  if (BUILD_FIT_MODE) document.documentElement.dataset.fitMode = 'true';
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
  /*
   * Establish the proofing surface synchronously. requestAnimationFrame can be
   * paused in background/prerendered tabs, so it cannot be the only path that
   * sets the initial A4 mode and scale.
   */
  applyDesktopSheetScale();
  document.documentElement.dataset.resumeReady = 'true';
  initMotionSystem();

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
  var btnSurpriseMobile = document.getElementById('btnSurpriseMobile');
  if (btnSurprise) btnSurprise.onclick = selectRandomProfile;
  if (btnSurpriseMobile) btnSurpriseMobile.onclick = selectRandomProfile;

  // Attach control listeners since module hides global scope
  var btnZoomIn = document.getElementById('btnZoomIn');
  var btnZoomOut = document.getElementById('btnZoomOut');
  var btnZoomReset = document.getElementById('btnZoomReset');
  var mobileMenuBtn = document.getElementById('mobileMenuBtn');
  var mobileMenuClose = document.getElementById('mobileMenuClose');
  var mobileMenuScrim = document.getElementById('mobileMenuScrim');
  var popoverBackdrop = document.getElementById('popoverBackdrop');

  if (btnZoomIn) btnZoomIn.onclick = function() { zoom(0.05); };
  if (btnZoomOut) btnZoomOut.onclick = function() { zoom(-0.05); };
  if (btnZoomReset) btnZoomReset.onclick = function() { zoomReset(); };
  document.querySelectorAll('[data-redact-control]').forEach(function(button) {
    button.onclick = function() { useStore.getState().toggleRedacted(); };
  });
  if (mobileMenuBtn) mobileMenuBtn.onclick = function() {
    setMobileMenu(!document.body.classList.contains('mobile-menu-open'));
  };
  if (mobileMenuClose) mobileMenuClose.onclick = function() { setMobileMenu(false); };
  if (mobileMenuScrim) mobileMenuScrim.onclick = function() { setMobileMenu(false); };
  if (popoverBackdrop) popoverBackdrop.onclick = function() { closePop(true); };
}
