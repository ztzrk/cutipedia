import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import {
  optimizeCuti,
  useCutiOptimizer,
  calculatePlanMetrics,
  WORK_PATTERNS,
  EMPLOYEE_STATUSES,
} from '@/composables/useCutiOptimizer'

dayjs.locale('id')

describe('optimizeCuti', () => {
  it('memetakan seluruh 365 hari pada tahun 2026 dan 2027 dengan benar', () => {
    const res2026 = optimizeCuti({ year: 2026, cutiQuota: 12 })
    const res2027 = optimizeCuti({ year: 2027, cutiQuota: 12 })

    expect(res2026.hasOfficialData).toBe(true)
    expect(res2026.days).toHaveLength(365)
    expect(res2026.stats.totalLiburNasional).toBe(17)
    expect(res2026.stats.totalCutiBersama).toBe(8)

    expect(res2027.hasOfficialData).toBe(true)
    expect(res2027.days).toHaveLength(365)
    expect(res2027.stats.totalLiburNasional).toBe(18)
    expect(res2027.stats.totalCutiBersama).toBe(8)
  })

  it('memetakan 366 hari untuk tahun kabisat (misal 2028) walau SKB belum rilis', () => {
    const res2028 = optimizeCuti({ year: 2028, cutiQuota: 12 })

    expect(res2028.hasOfficialData).toBe(false)
    expect(res2028.days).toHaveLength(366)
    expect(res2028.allOpportunities).toEqual([])
    expect(res2028.recommendedPlans).toEqual([])
  })

  it('tidak pernah merekomendasikan jumlah cuti melebihi batas input pengguna', () => {
    for (const quota of [0, 1, 3, 5, 8, 12, 24]) {
      for (const status of Object.values(EMPLOYEE_STATUSES)) {
        for (const pattern of Object.values(WORK_PATTERNS)) {
          const res = optimizeCuti({
            year: 2027,
            cutiQuota: quota,
            workPattern: pattern,
            employeeStatus: status,
          })

          expect(res.stats.recommendedCutiUsed).toBeLessThanOrEqual(quota)
          expect(res.stats.recommendedCutiUsed).toBeLessThanOrEqual(
            res.stats.availableForExtraLeave
          )

          const summedCuti = res.recommendedPlans.reduce((sum, p) => sum + p.cutiCount, 0)
          expect(summedCuti).toBe(res.stats.recommendedCutiUsed)
        }
      }
    }
  })

  it('menerapkan aturan pemotongan cuti bersama untuk Swasta Potong vs ASN & Swasta Tidak Potong', () => {
    const swastaPotong = optimizeCuti({
      year: 2026,
      cutiQuota: 12,
      workPattern: WORK_PATTERNS.FIVE_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.SWASTA_POTONG,
    })
    const swastaTidakPotong = optimizeCuti({
      year: 2026,
      cutiQuota: 12,
      workPattern: WORK_PATTERNS.FIVE_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.SWASTA_TIDAK_POTONG,
    })
    const asn = optimizeCuti({
      year: 2026,
      cutiQuota: 12,
      workPattern: WORK_PATTERNS.FIVE_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.ASN,
    })

    // 8 hari cuti bersama di 2026 seluruhnya jatuh di hari kerja (Senin-Jumat)
    expect(swastaPotong.stats.cutiBersamaDeducted).toBe(8)
    expect(swastaPotong.stats.availableForExtraLeave).toBe(4)
    expect(swastaPotong.stats.recommendedCutiUsed).toBeLessThanOrEqual(4)

    expect(swastaTidakPotong.stats.cutiBersamaDeducted).toBe(0)
    expect(swastaTidakPotong.stats.availableForExtraLeave).toBe(12)

    expect(asn.stats.cutiBersamaDeducted).toBe(0)
    expect(asn.stats.availableForExtraLeave).toBe(12)
  })

  it('menangani kondisi jatah cuti lebih kecil daripada total cuti bersama (Swasta Potong)', () => {
    const res = optimizeCuti({
      year: 2027,
      cutiQuota: 5,
      workPattern: WORK_PATTERNS.FIVE_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.SWASTA_POTONG,
    })

    expect(res.stats.cutiBersamaDeducted).toBe(8)
    expect(res.stats.availableForExtraLeave).toBe(0)
    expect(res.stats.quotaExceededByCutiBersama).toBe(true)
    expect(res.stats.recommendedCutiUsed).toBe(0)
    expect(res.recommendedPlans).toEqual([])
  })

  it('membedakan pola kerja 5 hari (Senin-Jumat) vs 6 hari (Senin-Sabtu)', () => {
    // 1 Jan 2026 (Kamis, libur nasional), 2 Jan 2026 (Jumat), 3 Jan 2026 (Sabtu), 4 Jan 2026 (Minggu)
    const fiveDays = optimizeCuti({
      year: 2026,
      cutiQuota: 12,
      workPattern: WORK_PATTERNS.FIVE_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.ASN,
    })
    const sixDays = optimizeCuti({
      year: 2026,
      cutiQuota: 12,
      workPattern: WORK_PATTERNS.SIX_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.ASN,
    })

    const janOpp5 = fiveDays.allOpportunities.find((o) => o.cutiDates.includes('2026-01-02'))
    const janOpp6 = sixDays.allOpportunities.find((o) => o.cutiDates.includes('2026-01-02'))

    expect(janOpp5).toBeDefined()
    expect(janOpp5.cutiDates).toEqual(['2026-01-02'])
    expect(janOpp5.cutiCount).toBe(1)
    expect(janOpp5.totalHolidayDays).toBe(4)
    expect(janOpp5.efficiencyRatio).toBe(4)

    expect(janOpp6).toBeDefined()
    expect(janOpp6.cutiDates).toEqual(['2026-01-02', '2026-01-03'])
    expect(janOpp6.cutiCount).toBe(2)
    expect(janOpp6.totalHolidayDays).toBe(4)
    expect(janOpp6.efficiencyRatio).toBe(2)
  })

  it('mendeteksi harpitnas dengan rasio efisiensi tertinggi dan mengurutkannya dari tertinggi', () => {
    const res = optimizeCuti({
      year: 2026,
      cutiQuota: 12,
      workPattern: WORK_PATTERNS.FIVE_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.ASN,
    })

    // 27 Mei (Idul Adha), 28 Mei (Cuti Bersama), 29 Mei (Jumat KERJA), 30-31 Mei (Sabtu-Minggu, Waisak), 1 Jun (Senin Pancasila)
    // 1 hari cuti -> 6 hari libur (rasio 6.0)
    const top = res.allOpportunities[0]
    expect(top.cutiDates).toEqual(['2026-05-29'])
    expect(top.totalHolidayDays).toBe(6)
    expect(top.efficiencyRatio).toBe(6)

    // Pastikan terurut menurun berdasarkan efficiencyRatio
    for (let i = 1; i < res.allOpportunities.length; i++) {
      expect(res.allOpportunities[i - 1].efficiencyRatio).toBeGreaterThanOrEqual(
        res.allOpportunities[i].efficiencyRatio
      )
    }
  })

  it('tidak menghitung ganda hari libur pada calculatePlanMetrics jika dua rekomendasi berdekatan', () => {
    const res = optimizeCuti({
      year: 2027,
      cutiQuota: 12,
      workPattern: WORK_PATTERNS.FIVE_DAYS,
      employeeStatus: EMPLOYEE_STATUSES.ASN,
    })

    // Pilih dua celah yang mengapit libur yang sama atau berdekatan
    const selectedSet = new Set(res.recommendedPlans.flatMap((p) => p.cutiDates))
    const metrics = calculatePlanMetrics(res.days, selectedSet)

    expect(metrics.totalOffDaysInYear).toBeLessThanOrEqual(res.days.length)
    expect(metrics.longestStreak).toBeGreaterThanOrEqual(3)
    expect(metrics.totalLongWeekendDays).toBeGreaterThan(0)
  })
})

describe('useCutiOptimizer composable', () => {
  it('bereaksi secara reaktif ketika filter berubah', () => {
    const year = ref(2026)
    const cutiQuota = ref(6)
    const workPattern = ref(WORK_PATTERNS.FIVE_DAYS)
    const employeeStatus = ref(EMPLOYEE_STATUSES.ASN)

    const { stats, recommendedPlans } = useCutiOptimizer({
      year,
      cutiQuota,
      workPattern,
      employeeStatus,
    })

    expect(stats.value.year).toBe(2026)
    expect(stats.value.recommendedCutiUsed).toBeLessThanOrEqual(6)
    expect(recommendedPlans.value.length).toBeGreaterThan(0)

    cutiQuota.value = 1
    expect(stats.value.recommendedCutiUsed).toBeLessThanOrEqual(1)

    year.value = 2027
    expect(stats.value.year).toBe(2027)
  })
})
