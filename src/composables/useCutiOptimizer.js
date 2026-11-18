import { computed, unref } from 'vue'
import dayjs from 'dayjs'
import holidaysData from '@/data/holidays.json'

export const WORK_PATTERNS = {
  FIVE_DAYS: '5_days',
  SIX_DAYS: '6_days',
}

export const EMPLOYEE_STATUSES = {
  SWASTA_POTONG: 'swasta_potong',
  SWASTA_TIDAK_POTONG: 'swasta_tidak_potong',
  ASN: 'asn',
}

/**
 * Check whether a dayjs date falls on a weekend for the given work pattern.
 * @param {import('dayjs').Dayjs} date
 * @param {string} workPattern
 * @returns {boolean}
 */
function isWeekendForPattern(date, workPattern) {
  const day = date.day() // 0 = Minggu, 6 = Sabtu
  if (workPattern === WORK_PATTERNS.SIX_DAYS) {
    return day === 0
  }
  return day === 0 || day === 6
}

/**
 * Group consecutive calendar days into contiguous LIBUR or KERJA blocks.
 * @param {Array<Object>} days
 * @returns {Array<Object>}
 */
function buildContiguousBlocks(days) {
  if (!days.length) return []

  const blocks = []
  let current = {
    isOff: days[0].isOff,
    startIdx: 0,
    endIdx: 0,
    days: [days[0]],
  }

  for (let i = 1; i < days.length; i++) {
    const day = days[i]
    if (day.isOff === current.isOff) {
      current.endIdx = i
      current.days.push(day)
    } else {
      blocks.push(current)
      current = {
        isOff: day.isOff,
        startIdx: i,
        endIdx: i,
        days: [day],
      }
    }
  }
  blocks.push(current)

  return blocks
}

/**
 * Compute unique merged long-weekend days and longest streak for a set of selected gap IDs.
 * @param {Array<Object>} days
 * @param {Set<string>} selectedCutis - Set of YYYY-MM-DD dates chosen as annual leave
 * @returns {{ totalLongWeekendDays: number, totalOffDaysInYear: number, longestStreak: number }}
 */
export function calculatePlanMetrics(days, selectedCutis) {
  let totalOffDaysInYear = 0
  let longestStreak = 0
  let currentStreak = 0
  let currentStreakHasCuti = false
  let totalLongWeekendDays = 0

  for (const day of days) {
    const isSelectedCuti = !day.isOff && selectedCutis.has(day.date)
    const effectiveOff = day.isOff || isSelectedCuti

    if (effectiveOff) {
      totalOffDaysInYear += 1
      currentStreak += 1
      if (isSelectedCuti) {
        currentStreakHasCuti = true
      }
    } else {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
      }
      if (currentStreakHasCuti) {
        totalLongWeekendDays += currentStreak
      }
      currentStreak = 0
      currentStreakHasCuti = false
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }
  if (currentStreakHasCuti) {
    totalLongWeekendDays += currentStreak
  }

  return {
    totalLongWeekendDays,
    totalOffDaysInYear,
    longestStreak,
  }
}

/**
 * Pure optimization engine for a given year and work profile.
 *
 * @param {Object} options
 * @param {number|string} options.year
 * @param {number} options.cutiQuota
 * @param {string} [options.workPattern='5_days']
 * @param {string} [options.employeeStatus='swasta_potong']
 * @param {number} [options.maxGapDays=3]
 * @param {Object} [options.dataset=holidaysData]
 * @returns {Object}
 */
export function optimizeCuti(options = {}) {
  const yearNum = Number(options.year) || new Date().getFullYear()
  const yearKey = String(yearNum)
  const cutiQuota = Math.max(0, Math.floor(Number(options.cutiQuota) || 0))
  const workPattern =
    options.workPattern === WORK_PATTERNS.SIX_DAYS
      ? WORK_PATTERNS.SIX_DAYS
      : WORK_PATTERNS.FIVE_DAYS
  const employeeStatus = Object.values(EMPLOYEE_STATUSES).includes(options.employeeStatus)
    ? options.employeeStatus
    : EMPLOYEE_STATUSES.SWASTA_POTONG
  const maxGapDays = Math.max(1, Math.floor(Number(options.maxGapDays) || 3))
  const dataset = options.dataset || holidaysData

  const yearRecord = dataset[yearKey] || null
  const hasOfficialData = Boolean(yearRecord && Array.isArray(yearRecord.daftar))
  const holidayList = hasOfficialData ? yearRecord.daftar : []

  // Map date -> holiday entries (libur_nasional takes priority over cuti_bersama if both exist)
  const holidayMap = new Map()
  for (const item of holidayList) {
    const existing = holidayMap.get(item.tanggal)
    if (!existing || item.jenis === 'libur_nasional') {
      holidayMap.set(item.tanggal, item)
    }
  }

  const startOfYear = dayjs(`${yearKey}-01-01`)
  const endOfYear = dayjs(`${yearKey}-12-31`)
  const totalDaysInYear = endOfYear.diff(startOfYear, 'day') + 1

  const days = []
  let totalLiburNasional = 0
  let totalCutiBersama = 0
  let cutiBersamaDeducted = 0

  for (let i = 0; i < totalDaysInYear; i++) {
    const current = startOfYear.add(i, 'day')
    const dateStr = current.format('YYYY-MM-DD')
    const isWeekend = isWeekendForPattern(current, workPattern)
    const holiday = holidayMap.get(dateStr) || null
    const jenis = holiday ? holiday.jenis : null

    if (jenis === 'libur_nasional') totalLiburNasional += 1
    if (jenis === 'cuti_bersama') totalCutiBersama += 1

    const isHoliday = Boolean(holiday)
    const isOff = isWeekend || isHoliday

    // Cuti bersama hanya memotong jatah jika status Swasta Potong dan jatuh pada hari kerja biasa
    const deductsQuota =
      employeeStatus === EMPLOYEE_STATUSES.SWASTA_POTONG &&
      jenis === 'cuti_bersama' &&
      !isWeekend

    if (deductsQuota) {
      cutiBersamaDeducted += 1
    }

    days.push({
      date: dateStr,
      dayOfWeek: current.day(),
      dayName: current.format('dddd'),
      isWeekend,
      isHoliday,
      holidayType: jenis,
      holidayName: holiday ? holiday.nama : null,
      deductsQuota,
      isOff,
      status: isOff ? 'LIBUR' : 'KERJA',
    })
  }

  const availableForExtraLeave = Math.max(0, cutiQuota - cutiBersamaDeducted)
  const quotaExceededByCutiBersama =
    employeeStatus === EMPLOYEE_STATUSES.SWASTA_POTONG && cutiBersamaDeducted > cutiQuota

  const blocks = buildContiguousBlocks(days)

  // Natural long weekends (3+ consecutive LIBUR days with 0 cuti)
  const naturalLongWeekends = blocks
    .filter((b) => b.isOff && b.days.length >= 3)
    .map((b) => ({
      id: `natural-${b.days[0].date}`,
      startDate: b.days[0].date,
      endDate: b.days[b.days.length - 1].date,
      totalHolidayDays: b.days.length,
      holidayNames: b.days.filter((d) => d.holidayName).map((d) => d.holidayName),
    }))

  // Scan KERJA gaps of length 1..maxGapDays flanked by LIBUR blocks on both sides
  const allOpportunities = []
  for (let i = 1; i < blocks.length - 1; i++) {
    const gap = blocks[i]
    const prevLibur = blocks[i - 1]
    const nextLibur = blocks[i + 1]

    if (gap.isOff || !prevLibur.isOff || !nextLibur.isOff) continue
    if (gap.days.length < 1 || gap.days.length > maxGapDays) continue

    const cutiCount = gap.days.length
    const totalHolidayDays = prevLibur.days.length + cutiCount + nextLibur.days.length
    const efficiencyRatio = Number((totalHolidayDays / cutiCount).toFixed(2))

    const relatedHolidays = [...prevLibur.days, ...nextLibur.days]
      .filter((d) => d.holidayName)
      .map((d) => d.holidayName)

    allOpportunities.push({
      id: `gap-${gap.days[0].date}`,
      startDate: prevLibur.days[0].date,
      endDate: nextLibur.days[nextLibur.days.length - 1].date,
      cutiDates: gap.days.map((d) => d.date),
      cutiCount,
      totalHolidayDays,
      efficiencyRatio,
      relatedHolidays: [...new Set(relatedHolidays)],
      month: dayjs(gap.days[0].date).format('MMMM'),
    })
  }

  // Sort by highest efficiency ratio, then longest total holiday, then earliest date
  allOpportunities.sort((a, b) => {
    if (b.efficiencyRatio !== a.efficiencyRatio) {
      return b.efficiencyRatio - a.efficiencyRatio
    }
    if (b.totalHolidayDays !== a.totalHolidayDays) {
      return b.totalHolidayDays - a.totalHolidayDays
    }
    return a.startDate.localeCompare(b.startDate)
  })

  // Greedily pick recommendations without exceeding availableForExtraLeave
  let remainingBudget = availableForExtraLeave
  const recommendedPlans = []

  for (const opp of allOpportunities) {
    if (opp.cutiCount <= remainingBudget) {
      recommendedPlans.push(opp)
      remainingBudget -= opp.cutiCount
    }
    if (remainingBudget === 0) break
  }

  const recommendedCutiUsed = recommendedPlans.reduce((sum, p) => sum + p.cutiCount, 0)
  const selectedCutiSet = new Set(recommendedPlans.flatMap((p) => p.cutiDates))
  const metrics = calculatePlanMetrics(days, selectedCutiSet)

  return {
    year: yearNum,
    hasOfficialData,
    skbResmi: hasOfficialData ? Boolean(yearRecord.skb_resmi) : false,
    sumber: hasOfficialData ? yearRecord.sumber || null : null,
    days,
    naturalLongWeekends,
    allOpportunities,
    recommendedPlans,
    stats: {
      year: yearNum,
      totalDaysInYear,
      totalLiburNasional,
      totalCutiBersama,
      cutiBersamaDeducted,
      cutiQuota,
      availableForExtraLeave,
      quotaExceededByCutiBersama,
      recommendedCutiUsed,
      remainingQuotaAfterPlan: Math.max(0, availableForExtraLeave - recommendedCutiUsed),
      totalLongWeekendDays: metrics.totalLongWeekendDays,
      totalOffDaysInYear: metrics.totalOffDaysInYear,
      longestStreak: metrics.longestStreak,
    },
  }
}

/**
 * Vue composable wrapper around optimizeCuti.
 * @param {Object} reactiveOptions
 */
export function useCutiOptimizer(reactiveOptions) {
  const result = computed(() => {
    const opts = {
      year: unref(reactiveOptions.year),
      cutiQuota: unref(reactiveOptions.cutiQuota),
      workPattern: unref(reactiveOptions.workPattern),
      employeeStatus: unref(reactiveOptions.employeeStatus),
      maxGapDays: unref(reactiveOptions.maxGapDays) ?? 3,
    }
    return optimizeCuti(opts)
  })

  return {
    result,
    days: computed(() => result.value.days),
    allOpportunities: computed(() => result.value.allOpportunities),
    recommendedPlans: computed(() => result.value.recommendedPlans),
    naturalLongWeekends: computed(() => result.value.naturalLongWeekends),
    stats: computed(() => result.value.stats),
    hasOfficialData: computed(() => result.value.hasOfficialData),
  }
}
