import { describe, it, expect } from 'vitest'
import {
  groupContiguousDates,
  generateIcsContent,
  buildGoogleCalendarUrl,
  buildShareUrl,
  parseShareParams,
} from '@/composables/useCalendarExport'

describe('useCalendarExport', () => {
  const samplePlan = {
    id: 'gap-2026-05-29',
    startDate: '2026-05-27',
    endDate: '2026-06-01',
    cutiDates: ['2026-05-29'],
    cutiCount: 1,
    totalHolidayDays: 6,
    efficiencyRatio: 6,
    relatedHolidays: ['Hari Raya Idul Adha 1447 Hijriah', 'Hari Raya Waisak 2570 BE'],
  }

  it('mengelompokkan tanggal berurutan dengan benar', () => {
    const ranges = groupContiguousDates([
      '2026-03-27',
      '2026-03-25',
      '2026-03-26',
      '2026-05-29',
    ])
    expect(ranges).toEqual([
      { start: '2026-03-25', end: '2026-03-27' },
      { start: '2026-05-29', end: '2026-05-29' },
    ])
  })

  it('menghasilkan konten .ics sesuai RFC 5545 dengan DTEND eksklusif', () => {
    const ics = generateIcsContent([samplePlan], { dtstamp: '20261118T120000Z' })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260529')
    expect(ics).toContain('DTEND;VALUE=DATE:20260530')
    expect(ics).toContain('SUMMARY:Cuti Tahunan — Long Weekend (6 Hari Libur)')
    expect(ics).toContain('Hari Raya Idul Adha 1447 Hijriah\\, Hari Raya Waisak 2570 BE')
  })

  it('membuat tautan Google Calendar yang valid untuk satu paket cuti', () => {
    const url = buildGoogleCalendarUrl(samplePlan)
    const parsed = new URL(url)

    expect(parsed.origin).toBe('https://calendar.google.com')
    expect(parsed.pathname).toBe('/calendar/render')
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE')
    expect(parsed.searchParams.get('dates')).toBe('20260529/20260530')
    expect(parsed.searchParams.get('text')).toContain('6 Hari Libur')
  })

  it('membuat dan mem-parsing shareable URL secara konsisten', () => {
    const url = buildShareUrl(
      {
        year: 2027,
        cutiQuota: 12,
        workPattern: '5_days',
        employeeStatus: 'asn',
        selectedCutiDates: ['2027-01-04', '2027-05-07'],
      },
      'https://cutipedia.pages.dev/'
    )

    const parsedUrl = new URL(url)
    const state = parseShareParams(parsedUrl.search)

    expect(state).toEqual({
      year: 2027,
      cutiQuota: 12,
      workPattern: '5_days',
      employeeStatus: 'asn',
      cutiDates: ['2027-01-04', '2027-05-07'],
    })
  })

  it('menangani parameter URL tidak valid atau kosong dengan aman', () => {
    expect(parseShareParams('')).toBeNull()
    const bad = parseShareParams('?year=1800&quota=99&pattern=invalid&status=xyz&cuti=abc')
    expect(bad).toEqual({ cutiDates: [] })
  })
})
