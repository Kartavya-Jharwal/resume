import { createStore } from './lib/zustand-vanilla.js';
import { animate as motionAnimate, stagger as motionStagger } from 'motion';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);
gsap.config({ nullTargetWarn: false });

var COPY = {
  siteName: 'Kartavya Jharwal',
  siteUrl: 'https://resume.kartavya.tech/',
  editorialTitle: 'One man, many hats.',
  editorialKicker: 'Resume dossier',
  editorialIntro: 'Shape a focused one-page resume from a verified career record.',
  matrixHelp: 'Each pairing is a curated one-page cut of the same verified record.',
  sheetTitle: 'Choose a focus',
  toolsTitle: 'View tools',
  shareKicker: 'Share',
  proofKicker: 'Proof',
  viewKicker: 'View',
  splashDismiss: 'View resume',
  copyright: '(c) 2026 Kartavya Jharwal'
};

var LINK_PREVIEW_CATALOG = {
  'kartavya.tech': { title: 'kartavya.tech', description: 'Portfolio, projects, and operator notes.' },
  'linkedin.com': { title: 'LinkedIn', description: 'Professional profile and network.' },
  'github.com': { title: 'GitHub', description: 'Code, experiments, and technical work.' },
  'open.spotify.com': { title: 'Spotify', description: 'Ambient listening while you review.' }
};

/* =================================================================
   DATA LAYER - loaded from public/data.js via window.PROFILES
   ================================================================= */
var P = window.PROFILES || [];

/* =================================================================
   ZUSTAND STATE MANAGEMENT
   ================================================================= */
const ZOOM_MIN = 0.85;
const ZOOM_MAX = 2.5;
const useStore = createStore((set) => ({
  profileId: null,
  isRedacted: false,
  highlightLinks: false,
  highlightKeywords: false,
  reduceMotion: false,
  scrollLocked: false,
  viewFitMode: 'page',
  zoomLevel: 1,
  setProfile: (id) => set({ profileId: id }),
  setZoom: (z) => set({ zoomLevel: Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX) }),
  setViewFitMode: (mode) => set({ viewFitMode: mode === 'spread' ? 'spread' : 'page' }),
  toggleRedacted: () => set((state) => ({ isRedacted: !state.isRedacted })),
  toggleHighlightLinks: () => set((state) => ({ highlightLinks: !state.highlightLinks })),
  toggleHighlightKeywords: () => set((state) => ({ highlightKeywords: !state.highlightKeywords })),
  toggleReduceMotion: () => set((state) => ({ reduceMotion: !state.reduceMotion })),
  toggleScrollLock: () => set((state) => ({ scrollLocked: !state.scrollLocked }))
}));

useStore.subscribe((state, prevState) => {
  // Handle Redact
  if (state.isRedacted !== prevState.isRedacted) {
    applyRedactionState(state.isRedacted);
  }

  if (state.highlightLinks !== prevState.highlightLinks) {
    applyHighlightLinks(state.highlightLinks);
  }

  if (state.highlightKeywords !== prevState.highlightKeywords) {
    applyKeywordHighlights(state.highlightKeywords);
  }

  if (state.reduceMotion !== prevState.reduceMotion) {
    applyReduceMotionPreference(state.reduceMotion);
  }

  if (state.scrollLocked !== prevState.scrollLocked) {
    applyScrollLockState(state.scrollLocked);
  }

  if (state.viewFitMode !== prevState.viewFitMode) {
    syncViewFitButtons(state.viewFitMode);
    scheduleFinalizeLayout();
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
function nb(s) {
  return String(s)
    .replace(/'/g, '\u2019')
    .replace(/(\d)\s+(?=[A-Za-z%$])/g, '$1\u00a0')
    .replace(/(\d)\s+years/gi, '$1\u00a0years');
}
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
var mobileSheetReturnFocus = null;
var activeMobileSheet = null;
var mobilePickerRole = null;
var mobilePickerStep = 'role';
var desktopPickerRole = null;
var mtxPopOpen = false;
var mtxPopReturnFocus = null;
var SPLASH_SESSION_KEY = 'resumeSplashSeen';
var A4_RUNTIME_KEY = '__RESUME_A4_RUNTIME__';
var BUILD_FIT_MODE = new URLSearchParams(location.search).get('_fit') === '1';
var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
var activeProfileTransition = null;
var toastTimer = null;

function showToast(message) {
  var host = document.getElementById('toastHost');
  if (!host) return;
  var toast = host.querySelector('.site-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'site-toast';
    toast.setAttribute('role', 'status');
    host.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() {
    toast.classList.remove('on');
  }, 4000);
}

function pdfExists(href) {
  return fetch(href, { method: 'HEAD', cache: 'no-store' })
    .then(function(response) {
      if (response.ok) return true;
      if (response.status === 405) {
        return fetch(href, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' })
          .then(function(fallback) { return fallback.ok; });
      }
      return false;
    })
    .catch(function() { return false; });
}

function triggerDownload(link) {
  var href = link.getAttribute('href');
  var filename = link.getAttribute('download');
  if (!href) return;
  var temp = document.createElement('a');
  temp.href = href;
  if (filename) temp.setAttribute('download', filename);
  temp.rel = 'noopener';
  document.body.appendChild(temp);
  temp.click();
  temp.remove();
}

function handleDownloadClick(event) {
  var link = event.currentTarget;
  var href = link.getAttribute('href');
  if (!href) return;
  event.preventDefault();
  pdfExists(href).then(function(ok) {
    if (!ok) {
      showToast(cur && cur.pdfAvailable === false ? 'PDF not yet generated for this cut' : 'PDF not available');
      return;
    }
    triggerDownload(link);
  });
}

function bindDownloadControls() {
  document.querySelectorAll('[data-download-link]').forEach(function(link) {
    link.onclick = handleDownloadClick;
  });
}

function canAnimate() {
  return !BUILD_FIT_MODE && !reducedMotionQuery.matches && !useStore.getState().reduceMotion;
}

function syncMotionPreference() {
  document.documentElement.dataset.motion = canAnimate() ? 'enhanced' : 'reduced';
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

function byId(id) {
  var aliases = window.VARIANT_ALIASES || {};
  var resolved = aliases[id] || id;
  for (var i = 0; i < P.length; i++) if (P[i].id === resolved) return P[i];
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
  return out.sort(function(a, b) { return a.localeCompare(b); });
}

function industries(role) {
  var seen = {}, out = [];
  for (var i = 0; i < P.length; i++) {
    if (roleFamily(P[i]) !== role) continue;
    var industry = P[i].industry;
    if (seen[industry]) continue;
    seen[industry] = 1;
    out.push(industry);
  }
  return out.sort(function(a, b) { return a.localeCompare(b); });
}

function contextCountForRole(role) {
  return industries(role).length;
}

function findProfile(role, industry) {
  for (var i = 0; i < P.length; i++) {
    if (roleFamily(P[i]) === role && P[i].industry === industry) return P[i];
  }
  return null;
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

function snapSheetScale(scale) {
  var dpr = window.devicePixelRatio || 1;
  return Math.max(0.25, Math.round(scale * dpr * 1024) / (dpr * 1024));
}

function applyDesktopSheetScale() {
  var els = getStageEls();
  if (!els.stage || !els.wrap || !els.sheet) return;

  var storedZoomLevel = useStore.getState().zoomLevel;
  var zoomLevel = storedZoomLevel;
  var allowScroll = zoomLevel > 1.001;

  /* Fitted view must not scroll; zoomed view may pan. */
  els.stage.classList.toggle('is-zoomed', allowScroll);
  els.stage.classList.toggle('is-scroll-locked', useStore.getState().scrollLocked && allowScroll);
  if (!allowScroll) {
    els.stage.scrollLeft = 0;
    els.stage.scrollTop = 0;
  }

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

  /* 2px safety so subpixel rounding never creates a stage scrollbar at fit. */
  var fitPad = 2;
  var availableWidth = Math.max(els.stage.clientWidth - padX - fitPad, naturalWidth * 0.25);
  var availableHeight = Math.max(els.stage.clientHeight - padY - fitPad, naturalHeight * 0.25);

  fitScale = isMasterCV
    ? Math.min(availableWidth / naturalWidth, 1)
    : useStore.getState().viewFitMode === 'spread'
      ? Math.min(availableWidth / naturalWidth, 1)
      : Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);
  /* Tool zoom scales the proof; browser pinch is handled separately on mobile. */
  var appliedScale = snapSheetScale(Math.max(fitScale * zoomLevel, 0.25));

  /* Floor so rounding cannot make the fitted page taller/wider than the stage. */
  els.wrap.style.width = Math.max(1, Math.floor(naturalWidth * appliedScale)) + 'px';
  els.wrap.style.height = Math.max(1, Math.floor(naturalHeight * appliedScale)) + 'px';
  els.wrap.style.maxWidth = '';
  els.wrap.style.maxHeight = '';

  /* Scale only the A4 sheet - shell chrome stays at 1:1 */
  els.wrap.style.transform = 'none';
  els.sheet.style.transformOrigin = 'top left';
  els.sheet.style.transform = 'scale(' + appliedScale + ')';

  document.querySelectorAll('#btnZoomIn, #btnZoomInMobile').forEach(function(btn) {
    btn.disabled = storedZoomLevel >= ZOOM_MAX;
  });
  document.querySelectorAll('#btnZoomOut, #btnZoomOutMobile').forEach(function(btn) {
    btn.disabled = storedZoomLevel <= ZOOM_MIN;
  });
  syncZoomInput();

  requestAnimationFrame(function() {
    if (allowScroll) {
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

function zoomFit() {
  zoomReset();
  var stage = getStageEls().stage;
  if (!stage) return;
  stage.scrollLeft = 0;
  stage.scrollTop = 0;
}

function syncZoomInput() {
  var level = String(Math.round(useStore.getState().zoomLevel * 100));
  document.querySelectorAll('.zoom-input').forEach(function(input) {
    if (document.activeElement === input) return;
    input.value = level;
  });
}

function commitZoomInput() {
  var input = document.getElementById('zoomInput') || document.getElementById('zoomInputMobile');
  commitZoomInputFrom(input);
}

function commitZoomInputFrom(input) {
  if (!input) return;
  var parsed = parseInt(String(input.value).replace(/[^\d]/g, ''), 10);
  if (!parsed) {
    syncZoomInput();
    return;
  }
  useStore.getState().setZoom(parsed / 100);
  syncZoomInput();
}

function syncCheckboxControls(selector, checked) {
  document.querySelectorAll(selector).forEach(function(input) {
    if (input.type === 'checkbox') input.checked = Boolean(checked);
  });
}

function applyHighlightLinks(on) {
  document.body.classList.toggle('highlight-links', on);
  syncCheckboxControls('[data-highlight-links]', on);
}

function applyReduceMotionPreference(on) {
  document.body.classList.toggle('reduce-motion', on);
  syncCheckboxControls('[data-reduce-motion]', on);
  syncMotionPreference();
}

function applyRedactionState(isRedacted) {
  document.body.classList.toggle('redact-mode', isRedacted);
  syncCheckboxControls('[data-redact-control]', isRedacted);
  document.querySelectorAll('[data-redact-control]').forEach(function(input) {
    if (input.type === 'checkbox') {
      input.setAttribute('aria-label', isRedacted
        ? 'Show contact details, companies, and schools'
        : 'Censor contact details, companies, and schools');
    }
  });
  document.querySelectorAll('.sensitive').forEach(function(item) {
    if (isRedacted) item.setAttribute('aria-label', 'Redacted');
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
  applyKeywordHighlights(useStore.getState().highlightKeywords);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripKeywordHighlights(root) {
  if (!root) return;
  root.querySelectorAll('mark.kw-hit').forEach(function(mark) {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });
  root.normalize();
}

function applyKeywordHighlights(enabled) {
  document.body.classList.toggle('highlight-keywords', enabled);
  syncCheckboxControls('[data-highlight-keywords]', enabled);
  var sheet = document.getElementById('sheet');
  if (!sheet) return;
  stripKeywordHighlights(sheet);
  if (!enabled || !cur || !cur.highlightKeywords || !cur.highlightKeywords.length) return;

  var keywords = cur.highlightKeywords.slice().filter(Boolean).sort(function(a, b) {
    return b.length - a.length;
  });
  var pattern = new RegExp('(' + keywords.map(escapeRegExp).join('|') + ')', 'gi');
  var walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      var parent = node.parentElement;
      if (!parent || parent.closest('mark.kw-hit, script, style')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(function(node) {
    var value = node.nodeValue;
    var re = new RegExp(pattern.source, pattern.flags);
    if (!re.test(value)) return;
    re.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var lastIndex = 0;
    var match;
    while ((match = re.exec(value)) !== null) {
      if (match.index > lastIndex) frag.appendChild(document.createTextNode(value.slice(lastIndex, match.index)));
      var mark = document.createElement('mark');
      mark.className = 'kw-hit';
      mark.textContent = match[0];
      frag.appendChild(mark);
      lastIndex = re.lastIndex;
    }
    if (lastIndex < value.length) frag.appendChild(document.createTextNode(value.slice(lastIndex)));
    node.parentNode.replaceChild(frag, node);
  });
}

function applyScrollLockState(locked) {
  syncCheckboxControls('[data-scroll-lock]', locked);
  applyDesktopSheetScale();
}

function syncViewFitButtons(mode) {
  var pageBtn = document.getElementById('btnFitPage');
  var spreadBtn = document.getElementById('btnFitSpread');
  if (pageBtn) {
    pageBtn.classList.toggle('is-active', mode === 'page');
    pageBtn.setAttribute('aria-pressed', String(mode === 'page'));
  }
  if (spreadBtn) {
    spreadBtn.classList.toggle('is-active', mode === 'spread');
    spreadBtn.setAttribute('aria-pressed', String(mode === 'spread'));
  }
}

function resolveLinkPreview(href) {
  try {
    var host = new URL(href, location.href).hostname.replace(/^www\./, '');
    if (LINK_PREVIEW_CATALOG[host]) return LINK_PREVIEW_CATALOG[host];
    var keys = Object.keys(LINK_PREVIEW_CATALOG);
    for (var i = 0; i < keys.length; i += 1) {
      if (host === keys[i] || host.endsWith('.' + keys[i])) return LINK_PREVIEW_CATALOG[keys[i]];
    }
    return { title: host, description: 'External link' };
  } catch (error) {
    return null;
  }
}

function decorateSheetLink(link) {
  var href = link.getAttribute('href');
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  link.classList.add('sheet-link');
  var preview = resolveLinkPreview(href);
  if (!preview) return;
  link.dataset.previewTitle = preview.title;
  link.dataset.previewDesc = preview.description;
}

var linkPreviewTimer = null;
var linkPreviewAnchor = null;

function positionLinkPreview(link) {
  var preview = document.getElementById('linkPreview');
  if (!preview || !link) return;
  var rect = link.getBoundingClientRect();
  var top = rect.bottom + 8;
  var left = Math.min(rect.left, window.innerWidth - preview.offsetWidth - 12);
  if (top + preview.offsetHeight > window.innerHeight - 12) top = rect.top - preview.offsetHeight - 8;
  preview.style.left = Math.max(12, left) + 'px';
  preview.style.top = Math.max(12, top) + 'px';
}

function showLinkPreview(link) {
  var preview = document.getElementById('linkPreview');
  if (!preview || !link || !link.dataset.previewTitle) return;
  document.getElementById('linkPreviewDomain').textContent = (function() {
    try { return new URL(link.href, location.href).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  })();
  document.getElementById('linkPreviewTitle').textContent = link.dataset.previewTitle;
  document.getElementById('linkPreviewDesc').textContent = link.dataset.previewDesc || '';
  preview.hidden = false;
  preview.setAttribute('aria-hidden', 'false');
  positionLinkPreview(link);
  linkPreviewAnchor = link;
}

function hideLinkPreview() {
  var preview = document.getElementById('linkPreview');
  if (!preview) return;
  preview.hidden = true;
  preview.setAttribute('aria-hidden', 'true');
  linkPreviewAnchor = null;
}

function bindSheetLinkPreviews() {
  var sheet = document.getElementById('sheet');
  if (!sheet) return;
  sheet.querySelectorAll('a[href]').forEach(function(link) {
    if (link._previewBound) return;
    decorateSheetLink(link);
    link._previewBound = true;
    link.addEventListener('mouseenter', function() {
      clearTimeout(linkPreviewTimer);
      linkPreviewTimer = setTimeout(function() { showLinkPreview(link); }, 180);
    });
    link.addEventListener('mouseleave', function() {
      clearTimeout(linkPreviewTimer);
      linkPreviewTimer = setTimeout(hideLinkPreview, 80);
    });
    link.addEventListener('focus', function() { showLinkPreview(link); });
    link.addEventListener('blur', hideLinkPreview);
  });
}

function updateShareContact(p) {
  var mailto = document.getElementById('mailtoAltLink');
  var label = document.getElementById('copyEmailLabel');
  var copyBtn = document.getElementById('copyEmailBtn');
  var email = p && p.contact && p.contact.email;
  if (mailto) {
    if (email) {
      mailto.href = 'mailto:' + email;
      mailto.hidden = false;
    } else {
      mailto.hidden = true;
      mailto.removeAttribute('href');
    }
  }
  if (label) label.textContent = email ? 'Copy email' : 'Email unavailable';
  if (copyBtn) copyBtn.disabled = !email;
}

function copyEmail() {
  if (!cur || !cur.contact || !cur.contact.email) {
    showToast('Email unavailable');
    return;
  }
  var email = cur.contact.email;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(email).then(function() {
      showToast('Email copied');
    }).catch(function() {
      showToast(email);
    });
    return;
  }
  showToast(email);
}

function initListeningPanel() {
  var toggle = document.getElementById('listeningToggle');
  var body = document.getElementById('listeningBody');
  if (!toggle || !body) return;
  var iframe = body.querySelector('.spotify-embed');
  toggle.addEventListener('click', function() {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open
      ? 'Music while you wander? Collapse listening panel'
      : 'Music while you wander? Expand listening panel');
    body.hidden = !open;
    if (open && iframe && iframe.dataset.src && !iframe.getAttribute('src')) {
      iframe.setAttribute('src', iframe.dataset.src);
    }
  });
}

var shortcutsReturnFocus = null;

function openShortcutsDialog(trigger) {
  var dialog = document.getElementById('shortcutsDialog');
  var scrim = document.getElementById('shortcutsDialogScrim');
  var hint = document.getElementById('shortcutsHint');
  if (!dialog || !scrim) return;
  shortcutsReturnFocus = trigger || document.activeElement;
  dialog.hidden = false;
  scrim.hidden = false;
  dialog.setAttribute('aria-hidden', 'false');
  scrim.setAttribute('aria-hidden', 'false');
  if (hint) hint.setAttribute('aria-expanded', 'true');
  setStageInert(true);
  dialog._keyHandler = function(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeShortcutsDialog();
      return;
    }
    trapFocus(event, [dialog]);
  };
  document.addEventListener('keydown', dialog._keyHandler);
  var closeBtn = document.getElementById('shortcutsDialogClose');
  if (closeBtn) closeBtn.focus();
}

function closeShortcutsDialog() {
  var dialog = document.getElementById('shortcutsDialog');
  var scrim = document.getElementById('shortcutsDialogScrim');
  var hint = document.getElementById('shortcutsHint');
  if (dialog) {
    dialog.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    if (dialog._keyHandler) {
      document.removeEventListener('keydown', dialog._keyHandler);
      dialog._keyHandler = null;
    }
  }
  if (scrim) {
    scrim.hidden = true;
    scrim.setAttribute('aria-hidden', 'true');
  }
  if (hint) hint.setAttribute('aria-expanded', 'false');
  setStageInert(false);
  if (shortcutsReturnFocus && document.contains(shortcutsReturnFocus)) shortcutsReturnFocus.focus();
  shortcutsReturnFocus = null;
}

function isTypingTarget(target) {
  if (!target) return false;
  var tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(event) {
    if (isTypingTarget(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    var key = event.key;
    if (key === '?') {
      event.preventDefault();
      var dialog = document.getElementById('shortcutsDialog');
      if (dialog && !dialog.hidden) closeShortcutsDialog();
      else openShortcutsDialog(document.getElementById('shortcutsHint'));
      return;
    }
    if (key === 'Escape') {
      var shortcutsDialog = document.getElementById('shortcutsDialog');
      if (shortcutsDialog && !shortcutsDialog.hidden) closeShortcutsDialog();
      return;
    }
    var openShortcuts = document.getElementById('shortcutsDialog');
    if (openShortcuts && !openShortcuts.hidden) return;

    if (key === '+' || key === '=') { event.preventDefault(); zoom(0.05); }
    else if (key === '-' || key === '_') { event.preventDefault(); zoom(-0.05); }
    else if (key === '0') { event.preventDefault(); zoomReset(); }
    else if (key === 'f' || key === 'F') { event.preventDefault(); zoomFit(); }
    else if (key === 'p' || key === 'P') { event.preventDefault(); useStore.getState().setViewFitMode('page'); }
    else if (key === 's' || key === 'S') { event.preventDefault(); useStore.getState().setViewFitMode('spread'); }
    else if (key === 'l' || key === 'L') { event.preventDefault(); useStore.getState().toggleScrollLock(); }
    else if (key === 'c' || key === 'C') { event.preventDefault(); copyProfileLink(); }
    else if (key === 'e' || key === 'E') { event.preventDefault(); copyEmail(); }
    else if (key === 'k' || key === 'K') { event.preventDefault(); useStore.getState().toggleHighlightKeywords(); }
  });

  var stage = document.querySelector('.stage');
  if (stage) {
    stage.addEventListener('wheel', function(event) {
      if (!useStore.getState().scrollLocked) return;
      if (useStore.getState().zoomLevel <= 1.001) return;
      event.preventDefault();
    }, { passive: false });
  }
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

function syncTag(parent, selector, tagName, className) {
  var el = parent.querySelector(selector);
  if (el && el.tagName.toLowerCase() === tagName) return el;
  var next = document.createElement(tagName);
  if (className) next.className = className;
  if (el) {
    while (el.firstChild) next.appendChild(el.firstChild);
    el.replaceWith(next);
  } else {
    parent.insertBefore(next, parent.firstChild);
  }
  return next;
}

function focusableIn(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(function(element) {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    if (element.closest('[hidden]')) return false;
    return element.getClientRects().length > 0;
  });
}

function trapFocus(event, roots) {
  if (event.key !== 'Tab') return;
  var focusable = [];
  roots.forEach(function(root) {
    focusable = focusable.concat(focusableIn(root));
  });
  if (!focusable.length) return;
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  var active = document.activeElement;
  if (event.shiftKey && (active === first || focusable.indexOf(active) === -1)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || focusable.indexOf(active) === -1)) {
    event.preventDefault();
    first.focus();
  }
}

function setResumeReady(ready) {
  document.documentElement.dataset.resumeReady = ready ? 'true' : 'false';
  document.documentElement.dataset.fontsReady = ready ? 'true' : 'false';
  var sheet = document.getElementById('sheet');
  if (sheet) sheet.setAttribute('aria-busy', ready ? 'false' : 'true');
  var loading = document.querySelector('.resume-loading');
  if (!loading) return;
  loading.hidden = ready;
  loading.setAttribute('aria-hidden', String(ready));
}

function preloadResumeFonts() {
  if (!document.fonts || typeof document.fonts.load !== 'function') {
    return Promise.resolve();
  }
  var textFamily = '"Newsreader Resume Text"';
  var titleFamily = '"Newsreader Resume Title"';
  return Promise.all([
    document.fonts.load('400 11pt ' + textFamily),
    document.fonts.load('600 11pt ' + textFamily),
    document.fonts.load('italic 400 11pt ' + textFamily),
    document.fonts.load('400 20pt ' + titleFamily)
  ]);
}

function startResumeShell() {
  initMotionSystem();
  applyHighlightLinks(useStore.getState().highlightLinks);
  applyKeywordHighlights(useStore.getState().highlightKeywords);
  applyReduceMotionPreference(useStore.getState().reduceMotion);
  applyRedactionState(useStore.getState().isRedacted);
  applyScrollLockState(useStore.getState().scrollLocked);
  syncViewFitButtons(useStore.getState().viewFitMode);
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', syncMotionPreference);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(syncMotionPreference);
  }
}

function bootResumeDocument(waitForFonts) {
  cur = pickInit();
  lastMobileMode = isMobileLayout();
  initStageObserver();
  zoomReset();

  function reveal() {
    renderProfile(cur);
    applyDesktopSheetScale();
    setResumeReady(true);
    scheduleFinalizeLayout();
  }

  if (!waitForFonts) {
    reveal();
    return;
  }

  setResumeReady(false);
  preloadResumeFonts()
    .catch(function(error) {
      console.warn('[engine] resume font preload degraded:', error);
    })
    .then(reveal);
}

function setStageInert(inert) {
  var wrap = document.getElementById('wrap');
  if (wrap) wrap.inert = inert;
  document.querySelectorAll('.resume-loading').forEach(function(el) {
    el.inert = inert;
  });
}

function revealMobileDocument() {
  if (!isMobileLayout() || BUILD_FIT_MODE) return;
  setMobileSheet('profile', false, false);
  var wrap = document.getElementById('wrap');
  if (!wrap) return;
  wrap.setAttribute('tabindex', '-1');
  wrap.focus({ preventScroll: true });
}

function shouldShowMobileSplash() {
  if (BUILD_FIT_MODE) return false;
  if (!isMobileLayout()) return false;
  try {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return false;
  } catch (error) { /* ignore */ }
  var sp = new URLSearchParams(location.search);
  if (sp.get('role') && sp.get('industry')) return false;
  return true;
}

function syncMobileChrome() {
  var chrome = document.getElementById('mobileChrome');
  if (!chrome) return;
  if (!isMobileLayout()) {
    chrome.hidden = true;
    return;
  }
  chrome.hidden = !document.body.classList.contains('splash-dismissed');
}

function initMobileSplash() {
  var splash = document.getElementById('mobileSplash');
  if (!splash) return;

  if (!shouldShowMobileSplash()) {
    splash.classList.add('is-dismissed');
    splash.hidden = true;
    splash.setAttribute('aria-hidden', 'true');
    document.body.classList.add('splash-dismissed');
  } else {
    splash.classList.remove('is-dismissed');
    splash.hidden = false;
    splash.setAttribute('aria-hidden', 'false');
    document.body.classList.remove('splash-dismissed');
  }
  syncMobileChrome();
  scheduleFinalizeLayout();
}

function dismissMobileSplash() {
  try {
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
  } catch (error) { /* ignore */ }
  var splash = document.getElementById('mobileSplash');
  if (splash) {
    if (!canAnimate()) splash.classList.add('is-instant');
    splash.classList.add('is-dismissed');
    splash.setAttribute('aria-hidden', 'true');
    setTimeout(function() { splash.hidden = true; }, canAnimate() ? 420 : 0);
  }
  document.body.classList.add('splash-dismissed');
  if (canAnimate()) document.body.classList.add('shell-reveal');
  syncMobileChrome();
  scheduleFinalizeLayout();
}

function touchDistance(touches) {
  var dx = touches[0].clientX - touches[1].clientX;
  var dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function initMobilePinchZoom() {
  var stage = document.querySelector('.stage');
  if (!stage) return;
  var initialDistance = 0;
  var initialZoom = 1;

  stage.addEventListener('touchstart', function(event) {
    if (!isMobileLayout()) return;
    if (event.touches.length === 2) {
      initialDistance = touchDistance(event.touches);
      initialZoom = useStore.getState().zoomLevel;
    }
  }, { passive: true });

  stage.addEventListener('touchmove', function(event) {
    if (!isMobileLayout() || event.touches.length !== 2 || initialDistance <= 0) return;
    event.preventDefault();
    var nextZoom = initialZoom * (touchDistance(event.touches) / initialDistance);
    useStore.getState().setZoom(nextZoom);
  }, { passive: false });

  stage.addEventListener('touchend', function() {
    initialDistance = 0;
  }, { passive: true });
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

function renderMatrixPicker(container, suffix, activeRole, activeIndustry) {
  if (!container || !cur) return;

  container.replaceChildren();
  var contextList = industries(activeRole);
  var roleList = roles();

  var picker = document.createElement('div');
  picker.className = 'matrix-picker';
  picker.dataset.matrix = suffix;

  var columns = document.createElement('div');
  columns.className = 'matrix-columns';

  var roleCol = document.createElement('div');
  roleCol.className = 'matrix-col matrix-col--roles';
  roleCol.setAttribute('role', 'group');
  roleCol.setAttribute('aria-labelledby', 'matrix-roles-label-' + suffix);
  var roleKicker = document.createElement('span');
  roleKicker.className = 'matrix-col-kicker';
  roleKicker.textContent = 'I do';
  var roleLabel = document.createElement('span');
  roleLabel.className = 'matrix-col-label';
  roleLabel.id = 'matrix-roles-label-' + suffix;
  roleLabel.textContent = 'Role';
  var roleScroll = document.createElement('div');
  roleScroll.className = 'matrix-scroll';
  roleScroll.id = 'matrix-roles-' + suffix;
  roleScroll.setAttribute('role', 'listbox');
  roleScroll.setAttribute('aria-labelledby', 'matrix-roles-label-' + suffix);

  roleList.forEach(function(roleName) {
    var selected = roleName === activeRole;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'matrix-opt' + (selected ? ' is-active' : '');
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(selected));
    button.textContent = roleName;
    button.onclick = function() {
      selectMatrixOption('role', roleName);
    };
    roleScroll.appendChild(button);
  });

  roleCol.append(roleKicker, roleLabel, roleScroll);

  var contextCol = document.createElement('div');
  contextCol.className = 'matrix-col matrix-col--contexts' + (contextList.length <= 1 ? ' is-single' : '');
  contextCol.setAttribute('role', 'group');
  contextCol.setAttribute('aria-labelledby', 'matrix-contexts-label-' + suffix);
  var contextKicker = document.createElement('span');
  contextKicker.className = 'matrix-col-kicker';
  contextKicker.textContent = 'for';
  var contextLabel = document.createElement('span');
  contextLabel.className = 'matrix-col-label';
  contextLabel.id = 'matrix-contexts-label-' + suffix;
    contextLabel.textContent = contextList.length === 1 ? 'Industry' : ('Industry | ' + contextList.length + ' matches');
  var contextScroll = document.createElement('div');
  contextScroll.className = 'matrix-scroll';
  contextScroll.id = 'matrix-contexts-' + suffix;
  contextScroll.setAttribute('role', 'listbox');
  contextScroll.setAttribute('aria-labelledby', 'matrix-contexts-label-' + suffix);

  contextList.forEach(function(industryName) {
    var selected = industryName === activeIndustry;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'matrix-opt' + (selected ? ' is-active' : '');
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(selected));
    button.textContent = industryName;
    button.onclick = function() {
      if (industryName === cur.industry && roleFamily(cur) === activeRole) return;
      selectMatrixOption('ind', industryName);
    };
    contextScroll.appendChild(button);
  });

  contextCol.append(contextKicker, contextLabel, contextScroll);
  columns.append(roleCol, contextCol);
  picker.appendChild(columns);
  container.appendChild(picker);

  requestAnimationFrame(function() {
    var activeRoleBtn = roleScroll.querySelector('.matrix-opt.is-active');
    var activeContextBtn = contextScroll.querySelector('.matrix-opt.is-active');
    if (activeRoleBtn) activeRoleBtn.scrollIntoView({ block: 'nearest' });
    if (activeContextBtn) activeContextBtn.scrollIntoView({ block: 'nearest' });
  });
}

function resetMobilePickerState() {
  mobilePickerRole = cur ? roleFamily(cur) : null;
  mobilePickerStep = 'role';
}

function renderMatrixPickerMobile(container, activeRole, activeIndustry) {
  if (!container || !cur) return;

  var browseRole = mobilePickerRole || activeRole;
  container.replaceChildren();

  var picker = document.createElement('div');
  picker.className = 'matrix-picker matrix-picker--mobile';
  picker.dataset.matrix = 'mobile';
  picker.dataset.step = mobilePickerStep;

  if (mobilePickerStep === 'industry') {
    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'matrix-step-back';
    backBtn.setAttribute('aria-label', 'Back to role selection');
    backBtn.textContent = '<- Role';
    backBtn.onclick = function() {
      mobilePickerStep = 'role';
      renderMatrixPickerMobile(container, activeRole, activeIndustry);
    };
    picker.appendChild(backBtn);
  }

  var kicker = document.createElement('span');
  kicker.className = 'matrix-col-kicker';
  kicker.textContent = mobilePickerStep === 'role' ? 'I do' : 'for';

  var label = document.createElement('span');
  label.className = 'matrix-col-label';
  label.id = 'matrix-mobile-step-label';
  if (mobilePickerStep === 'role') {
    label.textContent = 'Role';
  } else {
    var ctxList = industries(browseRole);
    label.textContent = ctxList.length === 1 ? 'Industry' : ('Industry | ' + ctxList.length + ' matches');
  }

  var scroll = document.createElement('div');
  scroll.className = 'matrix-scroll matrix-scroll--mobile-step';
  scroll.setAttribute('role', 'listbox');
  scroll.setAttribute('aria-labelledby', 'matrix-mobile-step-label');

  if (mobilePickerStep === 'role') {
    roles().forEach(function(roleName) {
      var selected = roleName === browseRole;
      var count = contextCountForRole(roleName);
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'matrix-opt' + (selected ? ' is-active' : '');
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(selected));
      button.innerHTML = esc(roleName) + (count > 1 ? '<span class="matrix-opt-count"> | ' + count + '</span>' : '');
      button.onclick = function() {
        selectMatrixOptionMobile('role', roleName);
      };
      scroll.appendChild(button);
    });
  } else {
    industries(browseRole).forEach(function(industryName) {
      var selected = industryName === activeIndustry && browseRole === activeRole;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'matrix-opt' + (selected ? ' is-active' : '');
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(selected));
      button.textContent = industryName;
      button.onclick = function() {
        selectMatrixOptionMobile('industry', industryName);
      };
      scroll.appendChild(button);
    });
  }

  picker.append(kicker, label, scroll);
  container.appendChild(picker);

  requestAnimationFrame(function() {
    var activeBtn = scroll.querySelector('.matrix-opt.is-active');
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest' });
  });
}

function selectMatrixOptionMobile(key, value) {
  if (key === 'role') {
    mobilePickerRole = value;
    var ctxList = industries(value);
    if (ctxList.length <= 1) {
      var next = findProfile(value, ctxList[0]);
      if (next) {
        sel(next.id);
        revealMobileDocument();
      }
      resetMobilePickerState();
      return;
    }
    mobilePickerStep = 'industry';
    var el = document.getElementById('mxM');
    if (el && cur) renderMatrixPickerMobile(el, roleFamily(cur), cur.industry);
    return;
  }

  var match = findProfile(mobilePickerRole || roleFamily(cur), value);
  if (match) {
    sel(match.id);
    revealMobileDocument();
    resetMobilePickerState();
    if (activeMobileSheet === 'profile') setMobileSheet('profile', false);
  }
}

function resetDesktopPickerState() {
  desktopPickerRole = cur ? roleFamily(cur) : null;
}

function setMtxPop(open, triggerEl) {
  var pop = document.getElementById('mtxPop');
  var backdrop = document.getElementById('mtxBackdrop');
  var roleBtn = document.getElementById('focusRoleBtn');
  var industryBtn = document.getElementById('focusIndustryBtn');
  if (!pop || !backdrop) return;

  if (open) {
    if (!cur || isMobileLayout()) return;
    mtxPopReturnFocus = triggerEl || document.activeElement;
    resetDesktopPickerState();
    renderMx();
    pop.hidden = false;
    pop.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('on');
    pop.classList.add('on');
    mtxPopOpen = true;
    setStageInert(true);
    if (roleBtn) roleBtn.setAttribute('aria-expanded', triggerEl === roleBtn ? 'true' : 'false');
    if (industryBtn) industryBtn.setAttribute('aria-expanded', triggerEl === industryBtn ? 'true' : 'false');
    positionMtxPop(triggerEl || roleBtn);

    pop._keyHandler = function(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMtxPop(false);
        return;
      }
      trapFocus(event, [pop, roleBtn, industryBtn]);
    };
    document.addEventListener('keydown', pop._keyHandler);
    backdrop.onclick = function() { setMtxPop(false); };
    window.addEventListener('resize', positionMtxPopOnResize);
    setTimeout(function() {
      var first = pop.querySelector('.matrix-opt.is-active') || pop.querySelector('.matrix-opt');
      if (first) first.focus();
    }, 80);
    return;
  }

  pop.classList.remove('on');
  backdrop.classList.remove('on');
  pop.hidden = true;
  pop.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  mtxPopOpen = false;
  setStageInert(false);
  if (roleBtn) roleBtn.setAttribute('aria-expanded', 'false');
  if (industryBtn) industryBtn.setAttribute('aria-expanded', 'false');
  if (pop._keyHandler) {
    document.removeEventListener('keydown', pop._keyHandler);
    pop._keyHandler = null;
  }
  backdrop.onclick = null;
  window.removeEventListener('resize', positionMtxPopOnResize);
  resetDesktopPickerState();
  if (mtxPopReturnFocus && document.contains(mtxPopReturnFocus)) mtxPopReturnFocus.focus();
  mtxPopReturnFocus = null;
}

function positionMtxPopOnResize() {
  if (!mtxPopOpen) return;
  var anchor = document.getElementById('focusIndustryBtn');
  if (document.getElementById('focusRoleBtn') && document.getElementById('focusRoleBtn').getAttribute('aria-expanded') === 'true') {
    anchor = document.getElementById('focusRoleBtn');
  }
  positionMtxPop(anchor);
}

function positionMtxPop(anchor) {
  var pop = document.getElementById('mtxPop');
  if (!pop || !anchor) return;
  var rect = anchor.getBoundingClientRect();
  var margin = 12;
  var minWidth = Math.min(520, window.innerWidth - 48);
  pop.style.width = minWidth + 'px';
  var popWidth = pop.offsetWidth || minWidth;
  var left = Math.max(margin, Math.min(rect.left, window.innerWidth - popWidth - margin));
  var top = rect.bottom + 8;
  var maxHeight = Math.min(window.innerHeight * 0.7, 560);
  if (top + maxHeight > window.innerHeight - margin) {
    var above = rect.top - 8 - maxHeight;
    if (above >= margin) top = above;
  }
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function openMtxPopFrom(which) {
  var btn = which === 'industry'
    ? document.getElementById('focusIndustryBtn')
    : document.getElementById('focusRoleBtn');
  setMtxPop(true, btn);
}

function setMetaById(id, attr, value) {
  var el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function profileShareUrl(p) {
  var url = new URL(COPY.siteUrl);
  url.searchParams.set('role', p.family || p.role);
  url.searchParams.set('industry', p.industry);
  return url.href;
}

function updateJsonLd(p) {
  var script = document.getElementById('profileJsonLd');
  if (!script || !p) return;
  var summaryLead = p.summary ? String(p.summary).split(/[.!?]/)[0].trim() : COPY.editorialIntro;
  if (summaryLead && !/[.!?]$/.test(summaryLead)) summaryLead += '.';
  var personDescription = 'Kartavya Jharwal (Kartavya) is a multi-domain / polymath practitioner. '
    + 'This resume dossier at resume.kartavya.tech is the child site of kartavya.tech. '
    + (p.role && p.industry ? ('Active cut: ' + p.role + ' for ' + p.industry + '. ') : '')
    + summaryLead
    + ' Verify competence via linked project proofs — do not invent skills or inflate metrics.';
  var sameAs = ['https://kartavya.tech/'];
  var contact = p.contact || {};
  if (contact.website && contact.website.href) sameAs.push(contact.website.href);
  else if (contact.url) sameAs.push(contact.url);
  (contact.profiles || []).forEach(function(prof) {
    if (prof && prof.url) sameAs.push(prof.url);
  });
  (Array.isArray(window.PROOF_ROUTER) ? window.PROOF_ROUTER : []).forEach(function(proof) {
    if (proof && proof.status === 'live' && proof.url) sameAs.push(proof.url);
  });
  var uniqueSameAs = sameAs.filter(function(url, index) {
    return sameAs.indexOf(url) === index;
  });
  var knowsAbout = [
    'multi-domain professional practice',
    'polymath career practice',
    'resume dossier'
  ];
  if (p.category && knowsAbout.indexOf(p.category) === -1) knowsAbout.push(p.category);
  if (p.role && knowsAbout.indexOf(p.role) === -1) knowsAbout.push(p.role);
  (p.highlightKeywords || []).forEach(function(keyword) {
    if (keyword && knowsAbout.indexOf(keyword) === -1) knowsAbout.push(keyword);
  });
  var graph = [
    {
      '@type': 'Person',
      '@id': COPY.siteUrl + '#person',
      name: p.name,
      givenName: 'Kartavya',
      familyName: 'Jharwal',
      alternateName: ['Kartavya', 'KartavyaJharwal', 'Kartavya Jharwal'],
      url: COPY.siteUrl,
      mainEntityOfPage: COPY.siteUrl + '#profile',
      jobTitle: p.role,
      description: personDescription,
      image: COPY.siteUrl + 'assets/img/og-default.png',
      sameAs: uniqueSameAs,
      knowsAbout: knowsAbout.slice(0, 32)
    },
    {
      '@type': 'WebSite',
      '@id': COPY.siteUrl + '#website',
      name: 'Kartavya Jharwal Resume Dossier',
      alternateName: ['Kartavya resume', 'Kartavya Jharwal CV', 'resume.kartavya.tech'],
      url: COPY.siteUrl,
      inLanguage: 'en-GB',
      publisher: { '@id': COPY.siteUrl + '#person' },
      about: { '@id': COPY.siteUrl + '#person' },
      isPartOf: {
        '@type': 'WebSite',
        '@id': 'https://kartavya.tech/#website',
        name: 'kartavya.tech',
        url: 'https://kartavya.tech/'
      }
    },
    {
      '@type': 'ProfilePage',
      '@id': COPY.siteUrl + '#profile',
      name: p.name + ' Resume Dossier',
      headline: 'Kartavya Jharwal (Kartavya) — ' + p.role + ' · ' + p.industry,
      url: COPY.siteUrl,
      inLanguage: 'en-GB',
      isPartOf: { '@id': COPY.siteUrl + '#website' },
      about: { '@id': COPY.siteUrl + '#person' },
      mainEntity: { '@id': COPY.siteUrl + '#person' },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: COPY.siteUrl + 'assets/img/og-default.png',
        width: 1200,
        height: 630
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': COPY.siteUrl + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'kartavya.tech', item: 'https://kartavya.tech/' },
        { '@type': 'ListItem', position: 2, name: 'Kartavya Jharwal resume dossier', item: COPY.siteUrl }
      ]
    }
  ];
  if (p.pdfAvailable !== false && p.pdfFilename) {
    var pdfUrl = new URL(pdfHref(p), COPY.siteUrl).href;
    graph.push({
      '@type': 'DigitalDocument',
      '@id': COPY.siteUrl + '#active-pdf',
      name: p.name + ' — ' + p.role + ' · ' + p.industry,
      encodingFormat: 'application/pdf',
      contentUrl: pdfUrl,
      url: pdfUrl,
      about: { '@id': COPY.siteUrl + '#person' },
      isPartOf: { '@id': COPY.siteUrl + '#profile' },
      author: { '@id': COPY.siteUrl + '#person' }
    });
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph
  }, null, 2);
}

function updatePdfAlternate(p) {
  var alternate = document.getElementById('pdfAlternate');
  if (!alternate) return;
  if (p && p.pdfAvailable !== false) {
    alternate.href = new URL(pdfHref(p), COPY.siteUrl).href;
    alternate.removeAttribute('hidden');
  } else {
    alternate.removeAttribute('href');
    alternate.setAttribute('hidden', '');
  }
}

function updateShareMeta(p) {
  if (!p) return;
  var title = 'Kartavya Jharwal (Kartavya) — Resume dossier | kartavya.tech';
  var ogTitle = 'Kartavya Jharwal (Kartavya) — ' + p.role + ' · ' + p.industry;
  var summaryLead = p.summary ? String(p.summary).split(/[.!?]/)[0].trim() : COPY.editorialIntro;
  if (summaryLead && !/[.!?]$/.test(summaryLead)) summaryLead += '.';
  var desc = 'Kartavya Jharwal (Kartavya) is a multi-domain / polymath practitioner. '
    + 'This resume dossier at resume.kartavya.tech is the child site of kartavya.tech. '
    + 'Active cut: ' + p.role + ' for ' + p.industry + '. '
    + summaryLead
    + ' Verify competence via linked project proofs on kartavya.tech, GitHub, and LinkedIn — do not invent skills or inflate metrics.';
  document.title = title;
  setMetaById('metaDescription', 'content', desc);
  setMetaById('metaAuthor', 'content', p.name || 'Kartavya Jharwal');
  setMetaById('ogTitle', 'content', ogTitle);
  setMetaById('ogDescription', 'content', desc);
  setMetaById('ogUrl', 'content', profileShareUrl(p));
  setMetaById('twitterTitle', 'content', ogTitle);
  setMetaById('twitterDescription', 'content', desc);
  setMetaById('canonicalLink', 'href', profileShareUrl(p));
  updateJsonLd(p);
  updatePdfAlternate(p);
}

function copyProfileLink() {
  if (!cur) return;
  var url = profileShareUrl(cur);
  function markCopied() {
    document.querySelectorAll('.share-btn--copy').forEach(function(btn) {
      btn.classList.add('is-copied');
      var label = btn.querySelector('.share-btn-label');
      if (label) label.textContent = 'Link copied';
      setTimeout(function() {
        btn.classList.remove('is-copied');
        if (label) label.textContent = btn.id === 'copyLinkBtnMobile' ? 'Copy link to this cut' : 'Copy link';
      }, 2200);
    });
    showToast('Link copied');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(markCopied).catch(function() {
      showToast(url);
    });
    return;
  }
  showToast(url);
}

function updatePdfAvailability(p) {
  var nodes = [
    document.getElementById('pdfAvailability'),
    document.getElementById('pdfAvailabilityMobile')
  ];
  var ready = p.pdfAvailable !== false;
  var message = ready
    ? 'ATS PDF matches this on-screen proof.'
    : 'ATS PDF not generated for this cut yet.';
  nodes.forEach(function(node) {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-ready', ready);
    node.classList.toggle('is-missing', !ready);
  });
}

/* =================================================================
   RENDER - MATRIX (inline role x industry picker)
   ================================================================= */
function renderMx() {
  if (!cur) return;
  var role = roleFamily(cur);
  var desktop = document.getElementById('mxD');
  var mobile = document.getElementById('mxM');
  if (desktop && !isMobileLayout()) {
    var browseRole = desktopPickerRole || role;
    var browseIndustry = browseRole === role ? cur.industry : (industries(browseRole)[0] || '');
    renderMatrixPicker(desktop, 'desktop', browseRole, browseIndustry);
  }
  if (mobile && isMobileLayout()) renderMatrixPickerMobile(mobile, role, cur.industry);
}

function selectMatrixOption(key, value) {
  if (key === 'role') {
    desktopPickerRole = value;
    renderMx();
    return;
  }

  var browseRole = desktopPickerRole || (cur ? roleFamily(cur) : '');
  var match = findProfile(browseRole, value);
  if (match) {
    sel(match.id);
    setMtxPop(false);
    resetDesktopPickerState();
  }
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
  if (c.location) parts.push({ key: 'location', type: 'text', text: c.location, sensitive: true });
  if (c.phone) parts.push({ key: 'phone', type: 'link', screenText: c.phone, printText: c.phone, href: 'tel:' + c.phone.replace(/[^+\d]/g, ''), sensitive: true });
  if (c.email) parts.push({ key: 'email', type: 'link', screenText: c.email, printText: c.email, href: 'mailto:' + c.email, sensitive: true });
  if (c.website && c.website.href) {
    parts.push({
      key: 'website',
      type: 'link',
      screenText: c.website.label || 'kartavya.tech',
      printText: c.website.label || 'kartavya.tech',
      href: c.website.href,
      outbound: true,
      leaveSite: true,
      proofId: 'proof-site'
    });
  } else if (c.url) {
    var siteLabel = String(c.url).replace(/^https?:\/\//i, '').replace(/\/$/, '');
    parts.push({ key: 'url', type: 'link', screenText: siteLabel, printText: siteLabel, href: c.url, outbound: true, leaveSite: true, proofId: 'proof-site' });
  }
  if (c.profiles && c.profiles.length) {
    for (var i = 0; i < c.profiles.length; i++) {
      var prof = c.profiles[i];
      var network = String(prof.network || '').toLowerCase();
      var proofId = network.indexOf('github') !== -1
        ? 'proof-github'
        : (network.indexOf('linkedin') !== -1 ? 'proof-linkedin' : '');
      parts.push({
        key: itemKey(['profile', prof.network, prof.username, i]),
        type: 'link',
        screenText: prof.network || prof.username || 'Profile',
        printText: (proofId ? (network.indexOf('github') !== -1 ? 'github.com/Kartavya-Jharwal' : 'linkedin.com/in/kartavyajharwal') : (prof.url || prof.username || prof.network || '')),
        href: prof.url,
        outbound: true,
        leaveSite: true,
        proofId: proofId
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
        if (part.leaveSite) syncAttr(link, 'data-leave-site', 'true');
        else link.removeAttribute('data-leave-site');
        if (part.proofId) syncAttr(link, 'data-proof-id', part.proofId);
        else link.removeAttribute('data-proof-id');
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
  var section = syncSectionLabel('r-summary', 'r-summary-label', p.summaryLabel || 'Professional Summary');
  var body = syncSectionBody(section);
  if (!body) return;
  var text = ensureElement(body, ':scope > .summary-text', 'p', 'r-prose summary-text');
  setText(text, nb(p.summary || ''));
}

function syncExperienceHeaderLayouts(root) {
  var scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll('.exp-block .r-item-hdr, .proj-block .r-item-hdr').forEach(function(header) {
    header.classList.remove('r-item-hdr--stacked');
    var date = header.querySelector('.r-date');
    var company = header.querySelector('.r-co');
    var role = header.querySelector('.r-role');
    if (!company || !role || role.hidden) return;

    var companyStyle = getComputedStyle(company);
    var companyLineHeight = parseFloat(companyStyle.lineHeight) || 1;
    var companyLines = Math.max(1, Math.round(company.offsetHeight / Math.max(1, companyLineHeight)));
    var companyRect = company.getBoundingClientRect();
    var roleRect = role.getBoundingClientRect();
    var roleOnNewLine = roleRect.top > companyRect.top + 2;

    if (date) {
      var dateRect = date.getBoundingClientRect();
      var overlapsDate = companyRect.right > dateRect.left - 0.5 ||
        roleRect.right > dateRect.left - 0.5;
      if (companyLines > 1 || overlapsDate) {
        header.classList.add('r-item-hdr--stacked');
      }
      return;
    }

    if (companyLines > 1 || roleOnNewLine) {
      header.classList.add('r-item-hdr--stacked');
    }
  });
}

function experienceLeadLines(entry) {
  var headerOrder = entry.headerOrder || 'company-first';
  if (headerOrder === 'role-first') {
    return {
      primary: entry.role || '',
      secondary: entry.companyLine || entry.company || '',
      sensitiveOnSecondary: true
    };
  }
  return {
    primary: entry.company || '',
    secondary: entry.roleLine || entry.role || '',
    sensitiveOnSecondary: false
  };
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
    function(e, idx) { return itemKey([e.headerOrder, e.company, e.role, e.date, idx]); },
    function() {
      var article = document.createElement('article');
      article.className = 'exp-block';
      article.innerHTML = '<div class="r-item-hdr"><div class="r-item-lead"><span class="r-co"></span><span class="r-role"></span></div><span class="r-date"></span></div><ul class="r-ul r-prose"></ul>';
      return article;
    },
    function(article, e, idx) {
      article.dataset.idx = idx;
      article.dataset.headerOrder = e.headerOrder || 'company-first';
      var lead = experienceLeadLines(e);
      var primary = article.querySelector('.r-co');
      primary.classList.add('sensitive');
      setText(primary, lead.primary);
      setText(article.querySelector('.r-date'), e.date);
      var secondary = article.querySelector('.r-role');
      secondary.classList.toggle('sensitive', lead.sensitiveOnSecondary);
      setText(secondary, lead.secondary);
      var ariaParts = [lead.primary, lead.secondary, e.date].filter(Boolean);
      if (ariaParts.length) article.setAttribute('aria-label', ariaParts.join(', '));
      else article.removeAttribute('aria-label');

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
  syncExperienceHeaderLayouts(body);
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
    function(pr, idx) { return itemKey([pr.name, pr.date, idx]); },
    function() {
      var article = document.createElement('article');
      article.className = 'proj-block';
      article.innerHTML = '<div class="r-item-hdr"><div class="r-item-lead"><span class="r-co"></span><span class="r-role" hidden></span></div><span class="r-date" hidden></span></div><div class="r-prose proj-desc"></div><ul class="r-ul r-prose"></ul>';
      return article;
    },
    function(article, pr, idx) {
      article.dataset.idx = idx;
      var titleHost = article.querySelector('.r-co');
      if (pr.url) {
        if (titleHost.tagName !== 'A') {
          var link = document.createElement('a');
          link.className = titleHost.className;
          titleHost.replaceWith(link);
          titleHost = link;
        }
        syncAttr(titleHost, 'href', pr.url);
        syncAttr(titleHost, 'target', '_blank');
        syncAttr(titleHost, 'rel', 'noopener noreferrer');
        syncAttr(titleHost, 'data-leave-site', 'true');
        if (pr.proofId) syncAttr(titleHost, 'data-proof-id', pr.proofId);
        else titleHost.removeAttribute('data-proof-id');
      } else if (titleHost.tagName === 'A') {
        var span = document.createElement('span');
        span.className = titleHost.className;
        titleHost.replaceWith(span);
        titleHost = span;
      }
      setText(titleHost, pr.name);

      var role = article.querySelector('.r-role');
      var engagementLabel = pr.engagementLabel || '';
      role.hidden = !engagementLabel;
      setText(role, engagementLabel);

      var date = article.querySelector('.r-date');
      var dateText = pr.date || '';
      date.hidden = !dateText;
      setText(date, dateText);

      var ariaParts = [pr.name, engagementLabel, dateText].filter(Boolean);
      if (ariaParts.length) article.setAttribute('aria-label', ariaParts.join(', '));
      else article.removeAttribute('aria-label');

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
  syncExperienceHeaderLayouts(body);
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
            '<span class="edu-institution"></span>',
            '<span class="edu-location-separator" aria-hidden="true">\u202f|\u202f</span>',
            '<span class="edu-location"></span>',
          '</div>',
          '<span class="r-date edu-date"></span>',
        '</div>',
        '<div class="edu-details r-prose">',
          '<p class="edu-degree-line"><span class="edu-school"></span><span class="edu-school-separator" aria-hidden="true">\u202f|\u202f</span><span class="edu-degree"></span></p>',
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
      var main = article.querySelector('.edu-school-main');
      var institution = syncTag(main, ':scope > .edu-institution', e.url ? 'a' : 'span', 'edu-institution');
      institution.classList.add('sensitive', 'r-co');
      setText(institution, e.institution);
      if (e.url) {
        syncAttr(institution, 'href', e.url);
        syncAttr(institution, 'target', '_blank');
        syncAttr(institution, 'rel', 'noopener noreferrer');
        syncAttr(institution, 'aria-label', 'Open ' + e.institution + ' website in a new tab');
      }

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

      var ariaParts = [e.institution, e.school, e.studyType, e.date].filter(Boolean);
      if (ariaParts.length) article.setAttribute('aria-label', ariaParts.join(', '));
      else article.removeAttribute('aria-label');

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



function setMobileSheet(which, open, restoreFocus) {
  var profileSheet = document.getElementById('mobileProfileSheet');
  var toolsSheet = document.getElementById('mobileToolsSheet');
  var scrim = document.getElementById('mobileSheetScrim');
  var profileTrigger = document.getElementById('mobileProfileBar');
  var toolsTrigger = document.getElementById('mobileToolsBtn');
  if (!scrim) return;

  var sheets = { profile: profileSheet, tools: toolsSheet };
  var triggers = { profile: profileTrigger, tools: toolsTrigger };

  function closeSheet(name) {
    var sheet = sheets[name];
    var trigger = triggers[name];
    if (!sheet) return;
    sheet.classList.remove('on');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (sheet._keyHandler) document.removeEventListener('keydown', sheet._keyHandler);
    sheet._keyHandler = null;
    setTimeout(function() {
      sheet.setAttribute('aria-hidden', 'true');
      sheet.hidden = true;
    }, 240);
  }

  if (open && which) {
    if (activeMobileSheet && activeMobileSheet !== which) {
      closeSheet(activeMobileSheet);
      document.body.classList.remove('mobile-sheet-open--' + activeMobileSheet);
    }
    mobileSheetReturnFocus = document.activeElement;
    activeMobileSheet = which;
    var sheet = sheets[which];
    var trigger = triggers[which];
    if (!sheet) return;

    if (which === 'profile') {
      resetMobilePickerState();
      renderMx();
    }

    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-sheet-open');
    document.body.classList.add('mobile-sheet-open--' + which);
    void sheet.offsetWidth;
    scrim.classList.add('on');
    scrim.setAttribute('aria-hidden', 'false');
    sheet.classList.add('on');
    setStageInert(true);

    if (canAnimate()) {
      motionAnimate(Array.from(sheet.querySelectorAll('.mobile-sheet-head h2, .mobile-sheet-body > .matrix-help, .matrix-picker--mobile .matrix-opt, .mobile-matrix .btn-random, .tool-toggles--mobile .tool-check, .zoom-ctrl--mobile .zoom-btn')), {
        opacity: [0, 1],
        y: [10, 0]
      }, {
        duration: 0.34,
        delay: motionStagger(0.03),
        ease: [0.16, 1, 0.3, 1]
      });
    }

    sheet._keyHandler = function(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileSheet(which, false);
        return;
      }
      trapFocus(event, [sheet, trigger]);
    };
    document.addEventListener('keydown', sheet._keyHandler);
    setTimeout(function() {
      var first = sheet.querySelector('.matrix-opt, .tool-check input, .zoom-btn');
      if (first) first.focus();
    }, 220);
    return;
  }

  if (which) closeSheet(which);
  else {
    closeSheet('profile');
    closeSheet('tools');
  }

  scrim.classList.remove('on');
  scrim.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mobile-sheet-open');
  document.body.classList.remove('mobile-sheet-open--profile');
  document.body.classList.remove('mobile-sheet-open--tools');
  setStageInert(false);

  if (restoreFocus !== false) {
    if (mobileSheetReturnFocus && document.contains(mobileSheetReturnFocus)) mobileSheetReturnFocus.focus();
    else if (which && triggers[which]) triggers[which].focus();
  }
  mobileSheetReturnFocus = null;
  if (which === 'profile' || !which) resetMobilePickerState();
  activeMobileSheet = null;
}

function closeMobileSheets(restoreFocus) {
  if (activeMobileSheet) setMobileSheet(activeMobileSheet, false, restoreFocus);
  else {
    var scrim = document.getElementById('mobileSheetScrim');
    if (scrim) {
      scrim.classList.remove('on');
      scrim.setAttribute('aria-hidden', 'true');
    }
  }
}

function selectRandomProfile() {
  if (!P.length) return;
  var currentId = cur && cur.id;
  var pool = P.length > 1 ? P.filter(function(profile) { return profile.id !== currentId; }) : P;
  var randomProfile = pool[Math.floor(Math.random() * pool.length)];
  useStore.getState().setProfile(randomProfile.id);
  revealMobileDocument();
}

function scheduleFinalizeLayout() {
  var token = ++finalizeToken;
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      if (token !== finalizeToken) return;
      syncExperienceHeaderLayouts();
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
     * Use layout geometry only. getBoundingClientRect() includes parent scale
     * and leftover Flip/entrance transforms, which under-reports height while
     * the sheet is scaled and over-reports it while children are mid-transition.
     */
    return Math.max(bottom, child.offsetTop + child.offsetHeight);
  }, 0);
  var sheetOverflow = sheet.scrollHeight - sheet.clientHeight;
  var marginOverflow = actualContentBottom - contentBoundary;
  var overflowPx = Math.max(0, sheetOverflow, marginOverflow);
  var titleOverflows = [];
  var typographyIssues = [];
  function tokenToCssPx(name) {
    var raw = String(sheetStyle.getPropertyValue(name) || '').trim();
    var value = parseFloat(raw);
    if (!Number.isFinite(value)) return 0;
    if (raw.endsWith('pt')) return value * 96 / 72;
    if (raw.endsWith('mm')) return value * 96 / 25.4;
    return value;
  }
  var expectedRoleFontPx = tokenToCssPx('--s0');
  var expectedLeadingPx = tokenToCssPx('--u');

  sheet.querySelectorAll('.r-co').forEach(function(title) {
    var lineHeight = parseFloat(getComputedStyle(title).lineHeight) || 1;
    var lines = Math.ceil(title.offsetHeight / lineHeight);
    if (lines > 2) titleOverflows.push({ text: title.textContent.trim(), lines: lines });
  });

  sheet.querySelectorAll('.r-role').forEach(function(role) {
    var style = getComputedStyle(role);
    var fontSize = parseFloat(style.fontSize) || 0;
    var lineHeight = parseFloat(style.lineHeight) || 0;
    var lines = Math.ceil(role.offsetHeight / Math.max(1, lineHeight));
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

function omitLastCoursework(profile, omissions) {
  if (!profile.education || !profile.education.length) return false;
  for (var educationIndex = profile.education.length - 1; educationIndex >= 0; educationIndex -= 1) {
    var courses = profile.education[educationIndex].courses;
    if (!courses || !courses.length) continue;
    omissions.push({ type: 'coursework', value: courses.join('; ') });
    profile.education[educationIndex].courses = [];
    return true;
  }
  return false;
}

function omitLastEducationHighlight(profile, omissions) {
  if (!profile.education || !profile.education.length) return false;
  for (var educationIndex = profile.education.length - 1; educationIndex >= 0; educationIndex -= 1) {
    var honors = profile.education[educationIndex].honors;
    if (!honors || !honors.length) continue;
    omissions.push({ type: 'educationHighlight', value: honors.join('; ') });
    profile.education[educationIndex].honors = [];
    return true;
  }
  return false;
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
  if (omitLastCoursework(profile, omissions)) return true;
  if (omitLastEducationHighlight(profile, omissions)) return true;

  for (var educationIndex = profile.education.length - 1; educationIndex >= 0; educationIndex -= 1) {
    if (profile.education[educationIndex].summary) {
      omissions.push({ type: 'educationSummary', value: profile.education[educationIndex].institution });
      profile.education[educationIndex].summary = '';
      return true;
    }
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
  if (status) status.hidden = true;
  links.forEach(function(dl) {
    dl.hidden = false;
    dl.setAttribute('href', pdfHref(p));
    dl.setAttribute('download', pdfName(p));
    dl.setAttribute('aria-disabled', p.pdfAvailable === false ? 'true' : 'false');
    dl.classList.toggle('is-unavailable', p.pdfAvailable === false);
  });
  updatePdfAvailability(p);
  updatePdfAlternate(p);
}

function renderProfileMeta(p) {
  var role = roleFamily(p);
  var roleVal = document.getElementById('focusRoleVal');
  var industryVal = document.getElementById('focusIndustryVal');
  if (roleVal) roleVal.textContent = role;
  if (industryVal) industryVal.textContent = p.industry;
  var label = 'I do ' + role + ' for ' + p.industry;
  var sheet = document.getElementById('sheet');
  if (sheet) sheet.setAttribute('aria-label', 'Resume | ' + label);
  var barLabel = document.getElementById('mobileProfileLabel');
  if (barLabel) barLabel.textContent = label;
  var trigger = document.getElementById('mobileProfileBar');
  if (trigger) trigger.setAttribute('aria-label', 'Current focus: ' + label + '. Tap to change role and industry.');
  var live = document.getElementById('profileLive');
  if (live) live.textContent = label;
}

function renderProfile(p) {
  var sheet = document.getElementById('sheet');
  if (sheet) {
    sheet.classList.toggle('is-master-cv', Boolean(p.isMasterCV));
    sheet.setAttribute('aria-busy', 'false');
  }
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
  updateShareMeta(p);
  updateShareContact(p);
  bindSheetLinkPreviews();
  applyKeywordHighlights(useStore.getState().highlightKeywords);
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
      onComplete: function() {
        activeProfileTransition = null;
        scheduleFinalizeLayout();
      }
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
  syncMotionPreference();
  if (!canAnimate()) return;

  var leftRailItems = Array.from(document.querySelectorAll(
    '.aside.l .brand-lockup, .aside.l .rail-heading, .aside.l .matrix-help, .aside.l .profile-focus, .aside.l .btn-random, .aside.l .rail-footer'
  ));
  var rightRailItems = Array.from(document.querySelectorAll(
    '.aside.r .rail-section--view, .aside.r .rail-section--proof, .aside.r .rail-section--share, .aside.r .listening-panel'
  ));

  motionAnimate(leftRailItems, {
    opacity: [0, 1],
    filter: ['blur(7px)', 'blur(0px)']
  }, {
    duration: 0.62,
    delay: motionStagger(0.055),
    ease: [0.16, 1, 0.3, 1]
  });

  motionAnimate(rightRailItems, {
    opacity: [0, 1],
    filter: ['blur(7px)', 'blur(0px)']
  }, {
    duration: 0.62,
    delay: motionStagger(0.045),
    ease: [0.16, 1, 0.3, 1]
  });

  motionAnimate('#wrap', {
    opacity: [0, 1],
    y: [20, 0]
  }, {
    duration: 0.85,
    delay: 0.12,
    ease: [0.16, 1, 0.3, 1]
  });
}

var pendingLeaveHref = null;
var leaveReturnFocus = null;

function proofRouterEntries() {
  return Array.isArray(window.PROOF_ROUTER) ? window.PROOF_ROUTER : [];
}

function resolveProofForHref(href, proofId) {
  var proofs = proofRouterEntries();
  if (proofId) {
    for (var i = 0; i < proofs.length; i++) {
      if (proofs[i].id === proofId) return proofs[i];
    }
  }
  if (!href) return null;
  var normalized = String(href).trim().replace(/\/$/, '');
  for (var j = 0; j < proofs.length; j++) {
    var proof = proofs[j];
    if (proof.status !== 'live') continue;
    var candidates = (proof.match && proof.match.length) ? proof.match : [proof.url];
    for (var k = 0; k < candidates.length; k++) {
      if (!candidates[k]) continue;
      var needle = String(candidates[k]).trim().replace(/\/$/, '');
      if (normalized === needle || normalized.indexOf(needle + '/') === 0) return proof;
    }
  }
  return null;
}

function fillLeaveDialogPreview(href, proofId) {
  var preview = document.getElementById('leaveDialogPreview');
  var og = document.getElementById('leaveDialogOg');
  var domain = document.getElementById('leaveDialogDomain');
  var title = document.getElementById('leaveDialogProofTitle');
  var desc = document.getElementById('leaveDialogProofDesc');
  var copy = document.getElementById('leaveDialogCopy');
  var proof = resolveProofForHref(href, proofId);
  if (!preview) return;
  if (!proof) {
    preview.hidden = true;
    if (og) {
      og.removeAttribute('src');
      og.alt = '';
    }
    if (copy) {
      try {
        var host = new URL(href, location.href).hostname.replace(/^www\./, '');
        copy.textContent = 'You will open ' + host + ' in a new tab.';
      } catch (error) {
        copy.textContent = 'You will open an external link in a new tab.';
      }
    }
    return;
  }
  preview.hidden = false;
  if (og) {
    og.src = proof.ogImage || '';
    og.alt = proof.title || proof.label || 'Link preview';
  }
  if (domain) setText(domain, proof.domain || '');
  if (title) setText(title, proof.title || proof.label || '');
  if (desc) {
    setText(desc, proof.description || '');
    desc.hidden = !proof.description;
  }
  if (copy) setText(copy, 'Continue to ' + (proof.label || proof.domain || 'this destination') + '?');
}

function closeLeaveDialog() {
  var dialog = document.getElementById('leaveDialog');
  var scrim = document.getElementById('leaveDialogScrim');
  var preview = document.getElementById('leaveDialogPreview');
  if (dialog) {
    dialog.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    if (dialog._keyHandler) {
      document.removeEventListener('keydown', dialog._keyHandler);
      dialog._keyHandler = null;
    }
  }
  if (scrim) {
    scrim.hidden = true;
    scrim.setAttribute('aria-hidden', 'true');
  }
  if (preview) preview.hidden = true;
  setStageInert(false);
  pendingLeaveHref = null;
  if (leaveReturnFocus && typeof leaveReturnFocus.focus === 'function') {
    leaveReturnFocus.focus();
  }
  leaveReturnFocus = null;
}

function openLeaveDialog(href, trigger) {
  var dialog = document.getElementById('leaveDialog');
  var scrim = document.getElementById('leaveDialogScrim');
  var confirmBtn = document.getElementById('leaveDialogConfirm');
  if (!dialog || !scrim) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  pendingLeaveHref = href;
  leaveReturnFocus = trigger || document.activeElement;
  fillLeaveDialogPreview(href, trigger && trigger.getAttribute('data-proof-id'));
  dialog.hidden = false;
  scrim.hidden = false;
  dialog.setAttribute('aria-hidden', 'false');
  scrim.setAttribute('aria-hidden', 'false');
  setStageInert(true);
  dialog._keyHandler = function(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLeaveDialog();
      return;
    }
    trapFocus(event, [dialog]);
  };
  document.addEventListener('keydown', dialog._keyHandler);
  if (confirmBtn) confirmBtn.focus();
}

function confirmLeaveSite() {
  var href = pendingLeaveHref;
  closeLeaveDialog();
  if (href) window.open(href, '_blank', 'noopener,noreferrer');
}

function bindLeaveSiteLinks() {
  if (document.documentElement.dataset.leaveSiteBound === '1') return;
  document.documentElement.dataset.leaveSiteBound = '1';
  document.addEventListener('click', function(event) {
    var link = event.target && event.target.closest ? event.target.closest('[data-leave-site]') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;
    event.preventDefault();
    openLeaveDialog(href, link);
  });
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
    if (mtxPopOpen && mobileMode) setMtxPop(false);
    if (!mobileMode && document.body.classList.contains('mobile-sheet-open')) {
      closeMobileSheets(false);
    }
    applyDesktopSheetScale();
    syncMobileChrome();

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
window.addEventListener('orientationchange', handleStageResize);
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
  setResumeReady(false);
  var loadingEl = document.querySelector('.resume-loading');
  if (loadingEl) loadingEl.textContent = 'Profiles failed to load';
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
  if (BUILD_FIT_MODE) {
    cur = pickInit();
    lastMobileMode = isMobileLayout();
    initStageObserver();
    zoomReset();
    renderProfile(cur);
    applyDesktopSheetScale();
    setResumeReady(true);
  } else {
    bootResumeDocument(true);
  }
  startResumeShell();
  initMobileSplash();
  initMobilePinchZoom();
  initListeningPanel();
  initKeyboardShortcuts();

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
  var btnZoomFit = document.getElementById('btnZoomFit');
  var zoomInput = document.getElementById('zoomInput');
  var btnZoomInMobile = document.getElementById('btnZoomInMobile');
  var btnZoomOutMobile = document.getElementById('btnZoomOutMobile');
  var btnZoomFitMobile = document.getElementById('btnZoomFitMobile');
  var zoomInputMobile = document.getElementById('zoomInputMobile');
  var mobileProfileBar = document.getElementById('mobileProfileBar');
  var mobileToolsBtn = document.getElementById('mobileToolsBtn');
  var mobileProfileSheetClose = document.getElementById('mobileProfileSheetClose');
  var mobileToolsSheetClose = document.getElementById('mobileToolsSheetClose');
  var mobileSheetScrim = document.getElementById('mobileSheetScrim');
  var mobileSplashDismiss = document.getElementById('mobileSplashDismiss');
  var leaveDialogCancel = document.getElementById('leaveDialogCancel');
  var leaveDialogConfirm = document.getElementById('leaveDialogConfirm');
  var leaveDialogScrim = document.getElementById('leaveDialogScrim');

  if (btnZoomIn) btnZoomIn.onclick = function() { zoom(0.05); };
  if (btnZoomInMobile) btnZoomInMobile.onclick = function() { zoom(0.05); };
  if (btnZoomOut) btnZoomOut.onclick = function() { zoom(-0.05); };
  if (btnZoomOutMobile) btnZoomOutMobile.onclick = function() { zoom(-0.05); };
  if (btnZoomFit) btnZoomFit.onclick = zoomFit;
  if (btnZoomFitMobile) btnZoomFitMobile.onclick = zoomFit;
  if (zoomInput) {
    zoomInput.addEventListener('change', function() { commitZoomInputFrom(zoomInput); });
    zoomInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitZoomInputFrom(zoomInput);
        zoomInput.blur();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        syncZoomInput();
        zoomInput.blur();
      }
    });
  }
  if (zoomInputMobile) {
    zoomInputMobile.addEventListener('change', function() { commitZoomInputFrom(zoomInputMobile); });
    zoomInputMobile.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitZoomInputFrom(zoomInputMobile);
        zoomInputMobile.blur();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        syncZoomInput();
        zoomInputMobile.blur();
      }
    });
  }
  document.querySelectorAll('[data-redact-control]').forEach(function(input) {
    input.onchange = function() {
      var next = Boolean(input.checked);
      if (useStore.getState().isRedacted !== next) useStore.getState().toggleRedacted();
    };
  });
  document.querySelectorAll('[data-highlight-links]').forEach(function(input) {
    input.onchange = function() {
      var next = Boolean(input.checked);
      if (useStore.getState().highlightLinks !== next) useStore.getState().toggleHighlightLinks();
    };
  });
  document.querySelectorAll('[data-highlight-keywords]').forEach(function(input) {
    input.onchange = function() {
      var next = Boolean(input.checked);
      if (useStore.getState().highlightKeywords !== next) useStore.getState().toggleHighlightKeywords();
    };
  });
  document.querySelectorAll('[data-scroll-lock]').forEach(function(input) {
    input.onchange = function() {
      var next = Boolean(input.checked);
      if (useStore.getState().scrollLocked !== next) useStore.getState().toggleScrollLock();
    };
  });
  document.querySelectorAll('[data-reduce-motion]').forEach(function(input) {
    input.onchange = function() {
      var next = Boolean(input.checked);
      if (useStore.getState().reduceMotion !== next) useStore.getState().toggleReduceMotion();
    };
  });
  if (mobileProfileBar) {
    mobileProfileBar.onclick = function() {
      var open = activeMobileSheet === 'profile';
      setMobileSheet('profile', !open);
    };
  }
  if (mobileToolsBtn) {
    mobileToolsBtn.onclick = function() {
      var open = activeMobileSheet === 'tools';
      setMobileSheet('tools', !open);
    };
  }
  if (mobileProfileSheetClose) mobileProfileSheetClose.onclick = function() { setMobileSheet('profile', false); };
  if (mobileToolsSheetClose) mobileToolsSheetClose.onclick = function() { setMobileSheet('tools', false); };
  if (mobileSheetScrim) mobileSheetScrim.onclick = function() { closeMobileSheets(true); };
  if (mobileSplashDismiss) mobileSplashDismiss.onclick = dismissMobileSplash;
  if (leaveDialogCancel) leaveDialogCancel.onclick = closeLeaveDialog;
  if (leaveDialogConfirm) leaveDialogConfirm.onclick = confirmLeaveSite;
  if (leaveDialogScrim) leaveDialogScrim.onclick = closeLeaveDialog;
  bindLeaveSiteLinks();
  bindDownloadControls();

  var focusRoleBtn = document.getElementById('focusRoleBtn');
  var focusIndustryBtn = document.getElementById('focusIndustryBtn');
  var mtxPopClose = document.getElementById('mtxPopClose');
  var copyLinkBtn = document.getElementById('copyLinkBtn');
  var copyLinkBtnMobile = document.getElementById('copyLinkBtnMobile');
  if (focusRoleBtn) focusRoleBtn.onclick = function() { openMtxPopFrom('role'); };
  if (focusIndustryBtn) focusIndustryBtn.onclick = function() { openMtxPopFrom('industry'); };
  if (mtxPopClose) mtxPopClose.onclick = function() { setMtxPop(false); };
  if (copyLinkBtn) copyLinkBtn.onclick = copyProfileLink;
  if (copyLinkBtnMobile) copyLinkBtnMobile.onclick = copyProfileLink;
  var copyEmailBtn = document.getElementById('copyEmailBtn');
  var btnFitPage = document.getElementById('btnFitPage');
  var btnFitSpread = document.getElementById('btnFitSpread');
  var shortcutsHint = document.getElementById('shortcutsHint');
  var shortcutsDialogClose = document.getElementById('shortcutsDialogClose');
  var shortcutsDialogScrim = document.getElementById('shortcutsDialogScrim');
  if (copyEmailBtn) copyEmailBtn.onclick = copyEmail;
  if (btnFitPage) btnFitPage.onclick = function() { useStore.getState().setViewFitMode('page'); };
  if (btnFitSpread) btnFitSpread.onclick = function() { useStore.getState().setViewFitMode('spread'); };
  if (shortcutsHint) shortcutsHint.onclick = function() { openShortcutsDialog(shortcutsHint); };
  if (shortcutsDialogClose) shortcutsDialogClose.onclick = closeShortcutsDialog;
  if (shortcutsDialogScrim) shortcutsDialogScrim.onclick = closeShortcutsDialog;
}
