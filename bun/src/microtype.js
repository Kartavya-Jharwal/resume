#!/usr/bin/env bun
/** Unicode and locale typesetting helpers shared by compile, tests, and master CV. */

import { loadCanon } from './typesetting.js';

const canon = loadCanon();
const { enDash, apostrophe, nbsp, nnbsp, pipe } = canon.unicode;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const NNBSP_PIPE = `${nnbsp}${pipe}${nnbsp}`;

export function nfc(value) {
  return String(value ?? '').normalize('NFC');
}

export function typograph(value) {
  return nfc(value)
    .replace(/'/g, apostrophe)
    .replace(/\u2018|\u201B/g, apostrophe)
    .replace(/(\d)\s+(?=[A-Za-z%$€£])/g, `$1${nbsp}`)
    .replace(/(\d)\s+years/gi, `$1${nbsp}years`);
}

export function formatDate(value) {
  if (!value) return 'Present';
  const [year, month] = String(value).split('-');
  if (!month) return year;
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatDateRange(start, end) {
  return `${formatDate(start)}${enDash}${formatDate(end)}`;
}

export function formatExpectedDate(end) {
  return `Expected${nbsp}${formatDate(end)}`;
}

export function formatPhone(value) {
  const raw = nfc(value).trim();
  if (!raw) return '';
  return raw.replace(/ /g, nbsp);
}

export function joinInline(parts) {
  return parts.filter(Boolean).join(NNBSP_PIPE);
}

export { enDash, apostrophe, nbsp, nnbsp, pipe };
