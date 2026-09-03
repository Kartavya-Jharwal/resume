/** On-the-record engagement credibility labels for firm-named or brief-shaped projects. */

export const ENGAGEMENT_LABELS = new Set([
  'Applied Consulting',
  'Client Advisory',
  'Pro Bono Advisor',
  'Spec Strategy',
  'Independent Strategic Teardown'
]);

/** Short disclosure shown on PDFs when a label is set (even if projectDescriptions is off). */
export const ENGAGEMENT_DISCLOSURE = {
  'Applied Consulting': 'Applied consulting advisory; not a commissioned client engagement.',
  'Client Advisory': 'Client brief with stakeholder delivery.',
  'Pro Bono Advisor': 'Pro bono advisory; not a paid client engagement.',
  'Spec Strategy': 'Spec strategy exercise; firm named as analysis subject, not as client.',
  'Independent Strategic Teardown': 'Independent analysis; not commissioned by the named company.'
};

export function engagementDisclosure(label) {
  return ENGAGEMENT_DISCLOSURE[label] || '';
}
