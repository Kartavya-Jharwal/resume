#!/usr/bin/env python3
"""Paginated, root-only PDF for the canonical master CV."""

from pathlib import Path
import json
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'data' / 'resume.json').read_text(encoding='utf-8'))
OUTPUT = ROOT / 'Kartavya_Jharwal_Master_CV_ATS.pdf'
FONT_DIR = ROOT / 'assets' / 'fonts'

pdfmetrics.registerFont(TTFont('ResumeText', str(FONT_DIR / 'source-serif-4-text-regular.ttf')))
pdfmetrics.registerFont(TTFont('ResumeTextSemibold', str(FONT_DIR / 'source-serif-4-text-semibold.ttf')))
pdfmetrics.registerFont(TTFont('ResumeTitle', str(FONT_DIR / 'source-serif-4-title-regular.ttf')))

INK = colors.HexColor('#171918')
MUTED = colors.HexColor('#525957')
RULE = colors.HexColor('#282d2b')
WIDTH = A4[0] - 34 * mm


def clean(value):
    value = str(value or '')
    value = value.replace('\u2013', '-').replace('\u2014', '-').replace('\u2011', '-')
    value = value.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    return escape(re.sub(r'\s+', ' ', value).strip())


def date(value):
    if not value:
        return 'Present'
    year, month, *_ = str(value).split('-')
    if not month:
        return year
    names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return f'{names[int(month) - 1]} {year}'


def date_range(start, end):
    return f'{date(start)} to {date(end)}'


sheet = getSampleStyleSheet()
name = ParagraphStyle('Name', parent=sheet['Normal'], fontName='ResumeTitle', fontSize=23, leading=25, textColor=INK, spaceAfter=2)
contact = ParagraphStyle('Contact', parent=sheet['Normal'], fontName='ResumeText', fontSize=8.3, leading=10, textColor=MUTED, spaceAfter=4)
summary = ParagraphStyle('Summary', parent=sheet['Normal'], fontName='ResumeText', fontSize=9.2, leading=12.2, textColor=INK, spaceAfter=0)
section = ParagraphStyle('Section', parent=sheet['Normal'], fontName='ResumeTextSemibold', fontSize=11.2, leading=13.5, textColor=INK, spaceBefore=10, spaceAfter=3, keepWithNext=True)
company = ParagraphStyle('Company', parent=sheet['Normal'], fontName='ResumeTextSemibold', fontSize=9.2, leading=11.4, textColor=INK)
right_date = ParagraphStyle('Date', parent=sheet['Normal'], fontName='ResumeText', fontSize=8.2, leading=11.4, textColor=MUTED, alignment=TA_RIGHT)
role = ParagraphStyle('Role', parent=sheet['Normal'], fontName='ResumeTitle', fontSize=9.2, leading=11.4, textColor=INK, spaceAfter=1, keepWithNext=True)
prose = ParagraphStyle('Prose', parent=sheet['Normal'], fontName='ResumeText', fontSize=8.8, leading=11.3, textColor=INK, spaceAfter=1, keepWithNext=True)
bullet = ParagraphStyle('Bullet', parent=sheet['Normal'], fontName='ResumeText', fontSize=8.7, leading=11.15, textColor=INK, leftIndent=13, firstLineIndent=-8, bulletFontName='ResumeText', bulletFontSize=6.8, spaceAfter=1.2)
project = ParagraphStyle('Project', parent=sheet['Normal'], fontName='ResumeTextSemibold', fontSize=9.2, leading=11.4, textColor=INK, keepWithNext=True)
education = ParagraphStyle('Education', parent=sheet['Normal'], fontName='ResumeText', fontSize=8.7, leading=10.9, textColor=INK, leftIndent=12, spaceAfter=0)


def divider():
    table = Table([['']], colWidths=[WIDTH], rowHeights=[0.45])
    table.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, -1), 0.45, RULE), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return table


def heading(left, right):
    table = Table([[Paragraph(clean(left), company), Paragraph(clean(right), right_date)]], colWidths=[WIDTH - 38 * mm, 38 * mm])
    table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'BOTTOM'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return table


def bullet_lines(items):
    output = []
    for item in items or []:
        text = item.get('text', '') if isinstance(item, dict) else item
        if text:
            output.append(KeepTogether([Paragraph(clean(text), bullet, bulletText='•')]))
    return output


def section_title(label):
    return [Paragraph(clean(label), section), divider(), Spacer(1, 2.5)]


def work(item):
    output = [heading(item.get('name'), date_range(item.get('startDate'), item.get('endDate'))), Paragraph(clean(item.get('position')), role)]
    if item.get('summary'):
        output.append(Paragraph(clean(item.get('summary')), prose))
    output.extend(bullet_lines(item.get('highlights')))
    output.append(Spacer(1, 4.5))
    return output


def project_entry(item):
    output = [Paragraph(clean(item.get('displayName') or item.get('name')), project)]
    if item.get('description'):
        output.append(Paragraph(clean(item.get('description')), prose))
    output.extend(bullet_lines(item.get('highlights')))
    output.append(Spacer(1, 4.5))
    return output


def education_entry(item):
    when = f'Expected {date(item.get("endDate"))}' if item.get('expected') else date_range(item.get('startDate'), item.get('endDate'))
    output = [heading(f"{item.get('institution', '')} - {item.get('location', '')}", when)]
    school_degree = ' | '.join(value for value in [item.get('school'), item.get('studyType')] if value)
    if school_degree:
        output.append(Paragraph(clean(school_degree), education))
    majors = item.get('majors') or []
    if majors:
        output.append(Paragraph(f'<b>Double Major:</b> {clean(" and ".join(majors))}', education))
    standing = ' | '.join(value for value in [item.get('score'), item.get('academicStanding')] if value)
    if standing:
        output.append(Paragraph(f'<b>{clean(standing)}</b>', education))
    courses = [*(item.get('canvasCourses') or []), *(item.get('additionalCourses') or [])]
    if courses:
        output.append(Paragraph(f'<i>Relevant Coursework:</i> {clean("; ".join(courses))}', education))
    honors = item.get('highlights') or []
    if honors:
        output.append(Paragraph(f'<i>Honors:</i> {clean("; ".join(honors))}', education))
    output.append(Spacer(1, 4.5))
    return output


def footer(canvas, document):
    canvas.saveState()
    canvas.setFont('ResumeText', 7.4)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(A4[0] - 17 * mm, 9.5 * mm, f'Kartavya Jharwal | Canonical Master CV | {document.page}')
    canvas.restoreState()


story = []
basics = DATA['basics']
story.append(Paragraph(clean(basics['name']), name))
contacts = [basics.get('location', {}).get('city', ''), basics.get('email', ''), basics.get('phone', '')]
contacts.extend(profile.get('username', '') for profile in basics.get('profiles', []))
story.append(Paragraph(clean(' | '.join(value for value in contacts if value)), contact))
story.append(Paragraph(clean(basics.get('summary')), summary))

story.extend(section_title('Professional Experience'))
for entry in DATA.get('work', []):
    story.extend(work(entry))

if DATA.get('volunteer'):
    story.extend(section_title('Leadership and Teaching'))
    for entry in DATA['volunteer']:
        story.extend(work({'name': entry.get('organization'), 'position': entry.get('position'), 'startDate': entry.get('startDate'), 'endDate': entry.get('endDate'), 'summary': entry.get('summary'), 'highlights': []}))

story.extend(section_title('Selected Projects and Case Work'))
for entry in sorted(DATA.get('projects', []), key=lambda item: item.get('masterOrder', 0)):
    story.extend(project_entry(entry))

story.extend(section_title('Education'))
for entry in DATA.get('education', []):
    story.extend(education_entry(entry))

story.extend(section_title('Skills'))
for group in DATA.get('skills', []):
    label = group.get('label') or group.get('name')
    story.append(Paragraph(f'<b>{clean(label)}:</b> {clean(", ".join(group.get("keywords") or []))}', prose))

if DATA.get('languages'):
    language_text = ', '.join('{} ({})'.format(item.get('language', ''), item.get('fluency', '')) for item in DATA['languages'])
    story.append(Paragraph(f'<b>Languages:</b> {clean(language_text)}', prose))
if DATA.get('certificates'):
    certificate_text = '; '.join(item.get('name', '') for item in DATA['certificates'])
    story.append(Paragraph(f'<b>Certifications:</b> {clean(certificate_text)}', prose))
if basics.get('workAuthorization'):
    story.append(Paragraph(f'<b>Work authorization:</b> {clean(basics["workAuthorization"])}', prose))

document = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=17 * mm, rightMargin=17 * mm, topMargin=15 * mm, bottomMargin=15 * mm, title='Kartavya Jharwal - Canonical Master CV', author='Kartavya Jharwal')
document.build(story, onFirstPage=footer, onLaterPages=footer)
print(f'Wrote {OUTPUT.name}')
