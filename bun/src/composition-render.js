#!/usr/bin/env bun
/** Server-side HTML fragment renderer for pillar 3 composition (PDF/DOCX branches). */

import { typograph } from './microtype.js';
import { experienceLeadParts, projectLeadParts } from './header-stack.js';

const NNBSP_PIPE = '\u202f|\u202f';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nb(value) {
  return typograph(value);
}

function text(value) {
  return escapeHtml(nb(value));
}

function renderContact(profile) {
  const c = profile.contact || {};
  const parts = [];
  if (c.location) parts.push({ type: 'text', print: c.location });
  if (c.phone) parts.push({ type: 'link', print: c.phone, href: `tel:${String(c.phone).replace(/[^+\d]/g, '')}` });
  if (c.email) parts.push({ type: 'link', print: c.email, href: `mailto:${c.email}` });
  if (c.website?.href) {
    parts.push({
      type: 'link',
      print: c.website.label || 'kartavya.tech',
      href: c.website.href
    });
  } else if (c.url) {
    const label = String(c.url).replace(/^https?:\/\//i, '').replace(/\/$/, '');
    parts.push({ type: 'link', print: label, href: c.url });
  }
  for (const prof of c.profiles || []) {
    parts.push({
      type: 'link',
      print: prof.url || prof.username || prof.network || '',
      href: prof.url
    });
  }
  if (!parts.length) return '';

  const inner = parts.map((part, index) => {
    const sep = index ? `<span class="sep">${NNBSP_PIPE}</span>` : '';
    if (part.type === 'link') {
      return `${sep}<span class="ctc-part"><a class="ctc-link" href="${escapeHtml(part.href)}"><span class="print-link-label">${text(part.print)}</span></a></span>`;
    }
    return `${sep}<span class="ctc-part"><span class="ctc-copy">${text(part.print)}</span></span>`;
  }).join('');
  return `<div id="r-ctc" class="r-ctc">${inner}</div>`;
}

function renderBullets(lines) {
  if (!lines?.length) return '';
  const items = lines.map(line => `<li class="bl-item">${text(line)}</li>`).join('');
  return `<ul class="r-ul r-prose">${items}</ul>`;
}

function renderExperienceHeader(entry, stacked = false) {
  const stackedClass = stacked ? ' r-item-hdr--stacked' : '';
  const headerOrder = entry.headerOrder || 'company-first';
  const { primary, secondary } = experienceLeadParts(entry);
  const secondaryHtml = secondary
    ? `<span class="r-role">${text(secondary)}</span>`
    : '<span class="r-role" hidden></span>';
  return `<div class="r-item-hdr${stackedClass}" data-header-order="${headerOrder}"><div class="r-item-lead"><span class="r-co">${text(primary)}</span>${secondaryHtml}</div><span class="r-date">${text(entry.date)}</span></div>`;
}

function renderExperience(profile) {
  const entries = profile.experience || [];
  if (!entries.length) return '';
  const label = profile.isMasterCV ? 'Professional Experience' : 'Relevant Experience';
  const blocks = entries.map(entry => {
    const stacked = Boolean(entry.stacked);
    return `<article class="exp-block" data-header-order="${entry.headerOrder || 'company-first'}">${renderExperienceHeader(entry, stacked)}${renderBullets(entry.highlights)}</article>`;
  }).join('');
  return `<section id="r-experience" class="r-sec" aria-labelledby="r-experience-label"><h2 id="r-experience-label" class="r-lbl">${label}</h2><div class="r-sec-body">${blocks}</div></section>`;
}

function renderProjects(profile) {
  const entries = profile.projects || [];
  if (!entries.length) return '';
  const label = profile.isMasterCV ? 'Projects' : 'Related Projects';
  const blocks = entries.map(entry => {
    const stacked = Boolean(entry.stacked);
    const stackedClass = stacked ? ' r-item-hdr--stacked' : '';
    const { primary, secondary } = projectLeadParts(entry);
    const title = entry.url
      ? `<a class="r-co" href="${escapeHtml(entry.url)}">${text(primary)}</a>`
      : `<span class="r-co">${text(primary)}</span>`;
    const engagement = secondary
      ? `<span class="r-role">${text(secondary)}</span>`
      : '<span class="r-role" hidden></span>';
    const date = entry.date
      ? `<span class="r-date">${text(entry.date)}</span>`
      : '<span class="r-date" hidden></span>';
    const desc = entry.description
      ? `<div class="r-prose proj-desc">${text(entry.description)}</div>`
      : '';
    return `<article class="proj-block"><div class="r-item-hdr${stackedClass}"><div class="r-item-lead">${title}${engagement}</div>${date}</div>${desc}${renderBullets(entry.highlights)}</article>`;
  }).join('');
  return `<section id="r-projects" class="r-sec" aria-labelledby="r-projects-label"><h2 id="r-projects-label" class="r-lbl">${label}</h2><div class="r-sec-body">${blocks}</div></section>`;
}

function renderEducation(profile) {
  const entries = profile.education || [];
  if (!entries.length) return '';
  const blocks = entries.map(entry => {
    const institution = entry.url
      ? `<a class="edu-institution" href="${escapeHtml(entry.url)}">${text(entry.institution)}</a>`
      : `<span class="edu-institution">${text(entry.institution)}</span>`;
    const location = entry.location
      ? `<span class="edu-location-separator" aria-hidden="true">${NNBSP_PIPE}</span><span class="edu-location">${text(entry.location)}</span>`
      : '<span class="edu-location-separator" hidden></span><span class="edu-location" hidden></span>';
    const school = entry.school
      ? `<span class="edu-school">${text(entry.school)}</span><span class="edu-school-separator" aria-hidden="true">${NNBSP_PIPE}</span>`
      : '<span class="edu-school" hidden></span><span class="edu-school-separator" hidden></span>';
    const facts = [
      { line: 'edu-major-line', label: 'Double Major:', value: entry.area, copy: 'edu-major' },
      { line: 'edu-score-line', label: 'GPA:', value: entry.score, copy: 'edu-score' },
      { line: 'edu-summary-line', label: 'Focus:', value: entry.summary, copy: 'edu-summary' },
      { line: 'edu-honors-line', label: 'Honors:', value: (entry.honors || []).join('; '), copy: 'edu-honors' },
      { line: 'edu-coursework-line', label: 'Relevant Coursework:', value: (entry.courses || []).join('; '), copy: 'edu-coursework' }
    ].map(fact => {
      if (!fact.value) {
        return `<p class="edu-fact ${fact.line}" hidden><span class="edu-fact-label">${fact.label}</span><span class="${fact.copy}"></span></p>`;
      }
      return `<p class="edu-fact ${fact.line}"><span class="edu-fact-label">${fact.label}</span><span class="${fact.copy}">${text(fact.value)}</span></p>`;
    }).join('');
    return `<article class="edu-block"><div class="edu-school-row"><div class="edu-school-main">${institution}${location}</div><span class="r-date edu-date">${text(entry.date)}</span></div><div class="edu-details r-prose"><p class="edu-degree-line">${school}<span class="edu-degree">${text(entry.studyType || '')}</span></p>${facts}</div></article>`;
  }).join('');
  return `<section id="r-education" class="r-sec" aria-labelledby="r-education-label"><h2 id="r-education-label" class="r-lbl">Education</h2><div class="r-sec-body">${blocks}</div></section>`;
}

function renderAdditional(profile) {
  const a = profile.additional || {};
  if (a.visible === false) return '';
  const parts = [];
  if (profile.isMasterCV && a.skillMap?.length) {
    for (const [index, group] of a.skillMap.entries()) {
      parts.push({ key: `skills-${index}`, label: group.label || group.name || 'Skills', value: (group.keywords || []).join(', ') });
    }
  } else if (a.skills?.length) {
    parts.push({ key: 'skills', label: 'Skills', value: a.skills.join(', ') });
  }
  if (a.certifications?.length) parts.push({ key: 'certifications', label: 'Certifications', value: a.certifications.join(', ') });
  if (a.languages?.length) parts.push({ key: 'languages', label: 'Languages', value: a.languages.join(', ') });
  if (a.workAuthorization) parts.push({ key: 'workAuthorization', label: 'Work authorization', value: a.workAuthorization });
  if (a.leadership?.length) parts.push({ key: 'leadership', label: 'Leadership', value: a.leadership.join(` ${NNBSP_PIPE} `) });
  if (!parts.length) return '';

  const lines = parts.map(part => `<p class="r-prose${part.key === 'skills' ? ' skills-text' : ''}"><b>${escapeHtml(part.label)}:</b><span class="info-copy">${text(part.value)}</span></p>`).join('');
  return `<section id="r-additional" class="r-sec" aria-labelledby="r-additional-label"><h2 id="r-additional-label" class="r-lbl">Additional Information</h2><div class="r-sec-body">${lines}</div></section>`;
}

export function renderCompositionBody(profile) {
  const summary = profile.summary
    ? `<section id="r-summary" class="r-sec" aria-labelledby="r-summary-label"><h2 id="r-summary-label" class="r-lbl">${escapeHtml(profile.summaryLabel || 'Professional Summary')}</h2><div class="r-sec-body"><p class="r-prose summary-text">${text(profile.summary)}</p></div></section>`
    : '';
  return [
    `<h1 id="r-name" class="r-name"><span class="r-name-inner">${text(profile.name)}</span></h1>`,
    renderContact(profile),
    summary,
    renderExperience(profile),
    renderProjects(profile),
    renderEducation(profile),
    renderAdditional(profile)
  ].join('\n');
}
