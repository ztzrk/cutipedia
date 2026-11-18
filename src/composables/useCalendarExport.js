import dayjs from 'dayjs'

/**
 * Escape text according to RFC 5545 (iCalendar).
 * @param {string} value
 * @returns {string}
 */
function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/**
 * Group sorted YYYY-MM-DD strings into contiguous [start, end] date ranges.
 * @param {string[]} dates
 * @returns {Array<{ start: string, end: string }>}
 */
export function groupContiguousDates(dates) {
  if (!dates || dates.length === 0) return []
  const sorted = [...new Set(dates)].sort()
  const ranges = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (dayjs(next).diff(dayjs(end), 'day') === 1) {
      end = next
    } else {
      ranges.push({ start, end })
      start = next
      end = next
    }
  }
  ranges.push({ start, end })
  return ranges
}

/**
 * Generate RFC 5545 .ics calendar string for selected leave plans.
 * @param {Array<Object>} plans
 * @param {Object} [options]
 * @param {string} [options.dtstamp]
 * @returns {string}
 */
export function generateIcsContent(plans = [], options = {}) {
  const dtstamp = options.dtstamp || dayjs().format('YYYYMMDD[T]HHmmss[Z]')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CutiPedia//Long Weekend Optimizer//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const plan of plans) {
    const ranges = groupContiguousDates(plan.cutiDates || [])
    const related =
      Array.isArray(plan.relatedHolidays) && plan.relatedHolidays.length > 0
        ? plan.relatedHolidays.join(', ')
        : 'Akhir Pekan'

    for (const range of ranges) {
      const dtStart = dayjs(range.start).format('YYYYMMDD')
      // RFC 5545 all-day DTEND is exclusive (+1 day)
      const dtEnd = dayjs(range.end).add(1, 'day').format('YYYYMMDD')
      const summary = `Cuti Tahunan — Long Weekend (${plan.totalHolidayDays} Hari Libur)`
      const description = [
        `Rencana cuti CutiPedia (${plan.startDate} s.d. ${plan.endDate})`,
        `Total libur: ${plan.totalHolidayDays} hari | Cuti dipakai: ${plan.cutiCount} hari (Rasio ${plan.efficiencyRatio}x)`,
        `Terkait: ${related}`,
      ].join('\n')

      lines.push(
        'BEGIN:VEVENT',
        `UID:cutipedia-${range.start}-${range.end}@cutipedia.local`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        'TRANSP:OPAQUE',
        'END:VEVENT'
      )
    }
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

/**
 * Trigger browser download of a .ics file for the selected leave plans.
 * @param {Array<Object>} plans
 * @param {number|string} year
 */
export function downloadIcsFile(plans, year) {
  const content = generateIcsContent(plans)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `rencana-cuti-${year}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Build a Google Calendar "Add Event" URL for a single recommendation plan.
 * @param {Object} plan
 * @returns {string}
 */
export function buildGoogleCalendarUrl(plan) {
  const ranges = groupContiguousDates(plan?.cutiDates || [])
  const first = ranges[0]
  if (!first) return 'https://calendar.google.com/calendar/render?action=TEMPLATE'

  const startStr = dayjs(first.start).format('YYYYMMDD')
  const endStr = dayjs(first.end).add(1, 'day').format('YYYYMMDD')
  const related =
    Array.isArray(plan.relatedHolidays) && plan.relatedHolidays.length > 0
      ? plan.relatedHolidays.join(', ')
      : 'Akhir Pekan'

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Cuti Tahunan — Long Weekend (${plan.totalHolidayDays} Hari Libur)`,
    dates: `${startStr}/${endStr}`,
    details: `Rencana CutiPedia (${plan.startDate} s.d. ${plan.endDate})\nCuti dipakai: ${plan.cutiCount} hari | Rasio efisiensi: ${plan.efficiencyRatio}x\nTerkait: ${related}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Build a shareable URL encoding current filter state and selected leave dates.
 * @param {Object} state
 * @param {number} state.year
 * @param {number} state.cutiQuota
 * @param {string} state.workPattern
 * @param {string} state.employeeStatus
 * @param {string[]} [state.selectedCutiDates]
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildShareUrl(state, baseUrl) {
  const originAndPath =
    baseUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://cutipedia.local/')

  const params = new URLSearchParams()
  params.set('year', String(state.year))
  params.set('quota', String(state.cutiQuota))
  params.set('pattern', String(state.workPattern))
  params.set('status', String(state.employeeStatus))

  if (Array.isArray(state.selectedCutiDates) && state.selectedCutiDates.length > 0) {
    params.set('cuti', [...new Set(state.selectedCutiDates)].sort().join(','))
  } else {
    params.set('cuti', 'none')
  }

  return `${originAndPath}?${params.toString()}`
}

/**
 * Parse shareable URL query parameters safely.
 * @param {string} search
 * @returns {Object|null}
 */
export function parseShareParams(search) {
  if (!search) return null
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  const hasAny =
    params.has('year') ||
    params.has('quota') ||
    params.has('pattern') ||
    params.has('status') ||
    params.has('cuti')

  if (!hasAny) return null

  const result = {}

  if (params.has('year')) {
    const parsedYear = Number(params.get('year'))
    if (Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100) {
      result.year = parsedYear
    }
  }

  if (params.has('quota')) {
    const parsedQuota = Number(params.get('quota'))
    if (Number.isInteger(parsedQuota) && parsedQuota >= 1 && parsedQuota <= 24) {
      result.cutiQuota = parsedQuota
    }
  }

  const pattern = params.get('pattern')
  if (pattern === '5_days' || pattern === '6_days') {
    result.workPattern = pattern
  }

  const status = params.get('status')
  if (
    status === 'swasta_potong' ||
    status === 'swasta_tidak_potong' ||
    status === 'asn'
  ) {
    result.employeeStatus = status
  }

  if (params.has('cuti')) {
    const rawCuti = params.get('cuti')
    if (rawCuti === 'none' || rawCuti === '') {
      result.cutiDates = []
    } else {
      const validDates = rawCuti
        .split(',')
        .map((d) => d.trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      result.cutiDates = validDates
    }
  }

  return result
}

export function useCalendarExport() {
  return {
    generateIcsContent,
    downloadIcsFile,
    buildGoogleCalendarUrl,
    buildShareUrl,
    parseShareParams,
  }
}
