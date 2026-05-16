/**
 * Composable for exporting project data to PDF.
 * Used in AIProjectSuggestionsView and ProjectDetailView.
 */
import { jsPDF } from 'jspdf'

// ─── Color palette ───────────────────────────────────────────────
const COLORS = {
  primary: [124, 58, 237],    // #7c3aed  violet
  dark: [15, 23, 42],         // #0f172a  slate-900
  text: [30, 41, 59],         // #1e293b  slate-800
  muted: [100, 116, 139],     // #64748b  slate-500
  light: [241, 245, 249],     // #f1f5f9  slate-100
  white: [255, 255, 255],
  border: [226, 232, 240],    // #e2e8f0
  green: [22, 163, 74],       // #16a34a
  red: [220, 38, 38],         // #dc2626
  amber: [217, 119, 6],       // #d97706
  blue: [37, 99, 235],        // #2563eb
}

const PRIORITY_COLORS = {
  critical: COLORS.red,
  high: [234, 88, 12],        // orange-600
  medium: COLORS.amber,
  low: COLORS.green,
}

const SEVERITY_COLORS = {
  critical: COLORS.red,
  high: [234, 88, 12],
  medium: COLORS.amber,
  low: COLORS.green,
}

// ─── Slovak diacritics not in Latin-1 / jsPDF Helvetica ──────────
// These characters are silently dropped by jsPDF's built-in font:
// ľ ĺ č š ž ť ď ň ŕ (and uppercase variants)
const DIACRITIC_MAP = {
  'ľ':'l','Ľ':'L','ĺ':'l','Ĺ':'L',
  'č':'c','Č':'C','š':'s','Š':'S',
  'ž':'z','Ž':'Z','ť':'t','Ť':'T',
  'ď':'d','Ď':'D','ň':'n','Ň':'N',
  'ŕ':'r','Ŕ':'R',
}
function st(text) {
  // "safe text" — transliterate unsupported chars for jsPDF Helvetica
  if (!text) return ''
  return String(text).replace(/[ľĽĺĹčČšŠžŽťŤďĎňŇŕŔ]/g, ch => DIACRITIC_MAP[ch] || ch)
}

// ─── Fetch image URL as base64 data URL ──────────────────────────
async function fetchImageAsBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function getImageNaturalSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 1800, h: 900 })
    img.src = dataUrl
  })
}

// ─── Helpers ─────────────────────────────────────────────────────
function setColor(doc, rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

function setFill(doc, rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}

function drawLine(doc, y, margin, pageWidth) {
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
}

function checkPage(doc, y, needed, margin, pageHeight) {
  if (y + needed > pageHeight - margin) {
    doc.addPage()
    return margin + 10
  }
  return y
}

function drawBadge(doc, x, y, text, color) {
  const w = doc.getTextWidth(text) + 6
  setFill(doc, color)
  doc.roundedRect(x, y - 3.5, w, 5.5, 1.5, 1.5, 'F')
  doc.setFontSize(7)
  setColor(doc, COLORS.white)
  doc.text(text, x + 3, y)
  return w + 2
}

function drawSectionTitle(doc, y, title, margin, pageWidth, pageHeight) {
  y = checkPage(doc, y, 16, margin, pageHeight)
  y += 4
  setFill(doc, COLORS.primary)
  doc.roundedRect(margin, y - 4, pageWidth - 2 * margin, 10, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor(doc, COLORS.white)
  doc.text(st(title), margin + 4, y + 2.5)
  return y + 12
}

// ─── Common header (logo / title / date) ─────────────────────────
function drawHeader(doc, title, subtitle, margin, pageWidth) {
  setFill(doc, COLORS.dark)
  doc.rect(0, 0, pageWidth, 32, 'F')
  setFill(doc, COLORS.primary)
  doc.rect(0, 32, pageWidth, 2, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  setColor(doc, COLORS.white)
  doc.text(st(title), margin, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 220)
  doc.text(st(subtitle), margin, 23)

  const dateStr = new Date().toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.setFontSize(8)
  doc.text(dateStr, pageWidth - margin, 15, { align: 'right' })

  return 42
}

// ─── Footer on every page ────────────────────────────────────────
function addFooters(doc, margin, pageWidth, pageHeight) {
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    setColor(doc, COLORS.muted)
    doc.text('AI Project Management', margin, pageHeight - 6)
    doc.text(`${i} / ${pages}`, pageWidth - margin, pageHeight - 6, { align: 'right' })
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
    doc.setLineWidth(0.2)
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
  }
}

// ─── Wrap text with transliteration ──────────────────────────────
function wrapText(doc, text, maxWidth) {
  if (!text) return []
  return doc.splitTextToSize(st(String(text)), maxWidth)
}

// ═══════════════════════════════════════════════════════════════════
// AI SUGGESTIONS PDF
// ═══════════════════════════════════════════════════════════════════
export async function exportAISuggestionsPdf(project, suggestions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - 2 * margin

  // ── Header
  let y = drawHeader(
    doc,
    'AI Project Analysis',
    project?.name || 'Project',
    margin,
    pageWidth
  )

  // ── Summary
  if (suggestions.summary) {
    y = drawSectionTitle(doc, y, 'Summary', margin, pageWidth, pageHeight)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    setColor(doc, COLORS.text)

    const summaryItems = [
      ['Total Estimated Hours', `${suggestions.summary.totalHours || 0} h`],
      ['Budget Utilization', suggestions.summary.budgetUtilization || '—'],
      ['Team Members', String(Object.keys(suggestions.summary.teamUtilization || {}).length)],
    ]

    summaryItems.forEach(([label, value]) => {
      y = checkPage(doc, y, 7, margin, pageHeight)
      doc.setFont('helvetica', 'bold')
      setColor(doc, COLORS.muted)
      doc.text(label + ':', margin + 2, y)
      doc.setFont('helvetica', 'normal')
      setColor(doc, COLORS.text)
      doc.text(value, margin + 52, y)
      y += 6
    })

    // Team utilization table
    if (suggestions.summary.teamUtilization) {
      y += 2
      y = checkPage(doc, y, 10, margin, pageHeight)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      setColor(doc, COLORS.text)
      doc.text('Team Workload', margin + 2, y)
      y += 5

      Object.entries(suggestions.summary.teamUtilization).forEach(([member, hours]) => {
        y = checkPage(doc, y, 6, margin, pageHeight)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        setColor(doc, COLORS.text)
        const name = st(member.includes('(') ? member.split('(')[0].trim() : member)
        doc.text(`• ${name}`, margin + 4, y)
        setColor(doc, COLORS.primary)
        const h = typeof hours === 'object' ? (hours.hours || hours) : hours
        doc.text(`${h} h`, margin + 80, y)
        y += 5
      })
    }
    y += 4
  }

  // ── Tasks
  if (suggestions.tasks?.length) {
    y = drawSectionTitle(doc, y, `Tasks (${suggestions.tasks.length})`, margin, pageWidth, pageHeight)

    suggestions.tasks.forEach((task, idx) => {
      y = checkPage(doc, y, 32, margin, pageHeight)

      // Card background
      setFill(doc, idx % 2 === 0 ? COLORS.light : COLORS.white)
      doc.roundedRect(margin, y - 2, contentWidth, 28, 2, 2, 'F')

      // Priority badge
      const prioColor = PRIORITY_COLORS[task.priority?.toLowerCase()] || COLORS.muted
      drawBadge(doc, margin + 2, y + 1, (task.priority || 'Medium').toUpperCase(), prioColor)

      // Phase badge
      if (task.phase) {
        const prioW = doc.getTextWidth((task.priority || 'Medium').toUpperCase()) + 10
        drawBadge(doc, margin + 2 + prioW, y + 1, task.phase, COLORS.muted)
      }

      // Task name
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      setColor(doc, COLORS.text)
      const nameLines = wrapText(doc, task.name, contentWidth - 4)
      doc.text(nameLines[0] || '', margin + 2, y + 8)

      // Details row
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      setColor(doc, COLORS.muted)
      const assignee = st(task.assignedTo
        ? (task.assignedTo.includes('(') ? task.assignedTo.split('(')[0].trim() : task.assignedTo)
        : '—')
      const detailsText = `Assignee: ${assignee}  •  ${task.estimatedHours || 0}h  •  ${st(task.assignedRole || '—')}`
      doc.text(detailsText, margin + 2, y + 13)

      // Description (truncated)
      if (task.description) {
        doc.setFontSize(7)
        setColor(doc, COLORS.muted)
        const descLines = wrapText(doc, task.description, contentWidth - 6)
        doc.text(descLines.slice(0, 2).join('\n'), margin + 2, y + 18)
      }

      y += 30
    })
    y += 2
  }

  // ── Risks
  if (suggestions.risks?.length) {
    y = drawSectionTitle(doc, y, `Risks (${suggestions.risks.length})`, margin, pageWidth, pageHeight)

    suggestions.risks.forEach((risk) => {
      y = checkPage(doc, y, 28, margin, pageHeight)

      // Severity badge
      const sevColor = SEVERITY_COLORS[risk.severity?.toLowerCase()] || COLORS.muted
      drawBadge(doc, margin + 2, y + 1, (risk.severity || '—').toUpperCase(), sevColor)

      // Probability
      const sevW = doc.getTextWidth((risk.severity || '—').toUpperCase()) + 10
      doc.setFontSize(7)
      setColor(doc, COLORS.muted)
      doc.text(`${risk.probability || '—'} probability`, margin + 2 + sevW, y + 1)

      // Title
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      setColor(doc, COLORS.text)
      doc.text(st(risk.title || ''), margin + 2, y + 8)

      // Description
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      setColor(doc, COLORS.muted)
      const riskDesc = wrapText(doc, risk.description, contentWidth - 6)
      doc.text(riskDesc.slice(0, 2).join('\n'), margin + 2, y + 13)

      // Mitigation
      if (risk.mitigation) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        setColor(doc, COLORS.green)
        const mitLines = wrapText(doc, `Mitigation: ${risk.mitigation}`, contentWidth - 6)
        const mitY = y + 13 + Math.min(riskDesc.length, 2) * 3.5
        doc.text(mitLines.slice(0, 2).join('\n'), margin + 2, mitY)
      }

      y += 28
    })
    y += 2
  }

  // ── Gantt Chart PNG
  if (suggestions.ganttChart?.imagePath) {
    y = drawSectionTitle(doc, y, 'Gantt Chart', margin, pageWidth, pageHeight)
    try {
      const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:9801'
      const imgUrl = `${baseUrl}${suggestions.ganttChart.imagePath}`
      const imgData = await fetchImageAsBase64(imgUrl)
      const { w: imgW, h: imgH } = await getImageNaturalSize(imgData)
      // Scale to fit content width, cap height at 110mm
      const scale = Math.min(contentWidth / imgW, 110 / imgH)
      const drawW = imgW * scale
      const drawH = imgH * scale
      y = checkPage(doc, y, drawH + 6, margin, pageHeight)
      const imgX = margin + (contentWidth - drawW) / 2
      // White background so transparent PNG areas don't show as transparent
      setFill(doc, COLORS.white)
      doc.rect(imgX, y, drawW, drawH, 'F')
      doc.addImage(imgData, 'PNG', imgX, y, drawW, drawH)
      y += drawH + 8
    } catch (e) {
      console.warn('[PDF] Could not embed Gantt chart image:', e.message)
      doc.setFontSize(7)
      setColor(doc, COLORS.muted)
      doc.text('(Gantt chart image could not be loaded)', margin + 2, y)
      y += 8
    }
  }

  // ── Timeline (plain text version of markdown)
  const timelineText = Array.isArray(suggestions.timeline)
    ? suggestions.timeline.join('\n')
    : suggestions.timeline
  if (timelineText) {
    y = drawSectionTitle(doc, y, 'Timeline', margin, pageWidth, pageHeight)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setColor(doc, COLORS.text)
    const plain = String(timelineText)
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
    const timelineLines = wrapText(doc, plain, contentWidth - 4)
    timelineLines.forEach(line => {
      y = checkPage(doc, y, 5, margin, pageHeight)
      doc.text(line, margin + 2, y)
      y += 4
    })
  }

  // ── Footers
  addFooters(doc, margin, pageWidth, pageHeight)

  const filename = `AI_Analysis_${(project?.name || 'project').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(filename)
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT DETAIL PDF
// ═══════════════════════════════════════════════════════════════════
export function exportProjectDetailPdf(project, tasks, members) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - 2 * margin

  // ── Header
  let y = drawHeader(
    doc,
    st(project.name || 'Project'),
    st(`Status: ${formatStatus(project.status)}  •  Priority: ${project.priority || '—'}`),
    margin,
    pageWidth
  )

  // ── Project Info
  y = drawSectionTitle(doc, y, 'Project Information', margin, pageWidth, pageHeight)

  const infoRows = [
    ['Description', String(project.description || '—')],
    ['Status', formatStatus(project.status)],
    ['Priority', capitalize(project.priority)],
    ['Start Date', formatDatePdf(project.startDate)],
    ['End Date', formatDatePdf(project.endDate)],
    ['Budget', project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'],
    ['Progress', `${project.progress || 0}%`],
  ]

  if (project.tags?.length) {
    infoRows.push(['Tags', project.tags.map(t => typeof t === 'object' ? (t.name || t.label || String(t)) : String(t)).join(', ')])
  }

  doc.setFontSize(8.5)
  infoRows.forEach(([label, value]) => {
    y = checkPage(doc, y, 7, margin, pageHeight)
    doc.setFont('helvetica', 'bold')
    setColor(doc, COLORS.muted)
    doc.text(label + ':', margin + 2, y)
    doc.setFont('helvetica', 'normal')
    setColor(doc, COLORS.text)
    const valLines = wrapText(doc, value, contentWidth - 46)
    doc.text(valLines[0] || '—', margin + 42, y)
    if (valLines.length > 1) {
      for (let i = 1; i < Math.min(valLines.length, 3); i++) {
        y += 4
        doc.text(valLines[i], margin + 42, y)
      }
    }
    y += 6
  })

  // ── Progress bar
  y = checkPage(doc, y, 10, margin, pageHeight)
  const barWidth = contentWidth - 4
  const progress = Math.min(100, Math.max(0, project.progress || 0))
  setFill(doc, COLORS.light)
  doc.roundedRect(margin + 2, y, barWidth, 4, 2, 2, 'F')
  if (progress > 0) {
    const pColor = progress >= 100 ? COLORS.green : progress >= 50 ? COLORS.blue : COLORS.amber
    setFill(doc, pColor)
    doc.roundedRect(margin + 2, y, barWidth * (progress / 100), 4, 2, 2, 'F')
  }
  doc.setFontSize(7)
  setColor(doc, COLORS.muted)
  doc.text(`${progress}% complete`, margin + 2, y + 8)
  y += 14

  // ── Team Members
  if (members?.length || project.owner) {
    y = drawSectionTitle(doc, y, 'Team', margin, pageWidth, pageHeight)

    const allMembers = []
    if (project.owner) {
      allMembers.push({ name: project.owner.name, email: project.owner.email, role: 'Owner' })
    }
    if (members?.length) {
      members.forEach(m => {
        const user = m.user || m
        allMembers.push({ name: user.name, email: user.email, role: capitalize(m.role || 'member') })
      })
    }

    // Table header
    y = checkPage(doc, y, 8, margin, pageHeight)
    setFill(doc, COLORS.dark)
    doc.roundedRect(margin, y - 3, contentWidth, 7, 1, 1, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    setColor(doc, COLORS.white)
    doc.text('Name', margin + 3, y + 1)
    doc.text('Email', margin + 55, y + 1)
    doc.text('Role', margin + 130, y + 1)
    y += 7

    allMembers.forEach((member, idx) => {
      y = checkPage(doc, y, 7, margin, pageHeight)
      if (idx % 2 === 0) {
        setFill(doc, COLORS.light)
        doc.rect(margin, y - 3, contentWidth, 6, 'F')
      }
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      setColor(doc, COLORS.text)
      doc.text(String(member.name || '—'), margin + 3, y)
      setColor(doc, COLORS.muted)
      doc.text(String(member.email || '—'), margin + 55, y)
      setColor(doc, COLORS.primary)
      doc.text(String(member.role || '—'), margin + 130, y)
      y += 6
    })
    y += 6
  }

  // ── Tasks
  if (tasks?.length) {
    y = drawSectionTitle(doc, y, `Tasks (${tasks.length})`, margin, pageWidth, pageHeight)

    // Table header
    y = checkPage(doc, y, 8, margin, pageHeight)
    setFill(doc, COLORS.dark)
    doc.roundedRect(margin, y - 3, contentWidth, 7, 1, 1, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    setColor(doc, COLORS.white)
    doc.text('Task', margin + 3, y + 1)
    doc.text('Status', margin + 85, y + 1)
    doc.text('Priority', margin + 110, y + 1)
    doc.text('Assignee', margin + 132, y + 1)
    doc.text('Hours', margin + 165, y + 1)
    y += 7

    tasks.forEach((task, idx) => {
      y = checkPage(doc, y, 12, margin, pageHeight)
      if (idx % 2 === 0) {
        setFill(doc, COLORS.light)
        doc.rect(margin, y - 3.5, contentWidth, 10, 'F')
      }

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      setColor(doc, COLORS.text)
      // Truncate long task names
      const taskName = wrapText(doc, task.name || task.title || '—', 78)
      doc.text(taskName[0], margin + 3, y)

      // Status
      doc.setFont('helvetica', 'normal')
      const statusColor = task.status === 'completed' ? COLORS.green
        : task.status === 'in_progress' ? COLORS.blue
          : COLORS.muted
      setColor(doc, statusColor)
      doc.text(formatStatus(task.status), margin + 85, y)

      // Priority
      const priStr = typeof task.priority === 'string' ? task.priority : ''
      const pColor = PRIORITY_COLORS[priStr.toLowerCase()] || COLORS.muted
      setColor(doc, pColor)
      doc.text(capitalize(priStr), margin + 110, y)

      // Assignee
      setColor(doc, COLORS.muted)
      const rawAssignee = task.assigneeName
        || (task.assignedTo && typeof task.assignedTo === 'object' ? task.assignedTo.name : task.assignedTo)
        || '—'
      const assignee = String(rawAssignee)
      const shortAssignee = assignee.length > 16 ? assignee.substring(0, 15) + '…' : assignee
      doc.text(shortAssignee, margin + 132, y)

      // Hours
      setColor(doc, COLORS.text)
      doc.text(String(task.estimatedHours ? `${task.estimatedHours}h` : '—'), margin + 165, y)

      // Description (small, below)
      if (task.description) {
        doc.setFontSize(6.5)
        setColor(doc, COLORS.muted)
        const descLine = wrapText(doc, task.description, contentWidth - 8)
        doc.text(descLine[0] || '', margin + 3, y + 4)
      }

      y += 11
    })
  }

  // ── Footers
  addFooters(doc, margin, pageWidth, pageHeight)

  const filename = `Project_${(project.name || 'export').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(filename)
}

// ─── Small utils ─────────────────────────────────────────────────
function formatStatus(s) {
  if (!s || typeof s !== 'string') return '—'
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function capitalize(s) {
  if (!s || typeof s !== 'string') return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDatePdf(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return String(d)
  }
}
