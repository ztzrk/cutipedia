<script setup>
import { computed, ref, watch, watchEffect } from 'vue'
import { useStorage, useClipboard } from '@vueuse/core'
import {
  NConfigProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NSpace,
  NButton,
  NTag,
  NCard,
  darkTheme,
} from 'naive-ui'
import { Calendar, Sun, Moon, Download, Share2, Check } from 'lucide-vue-next'
import holidaysData from '@/data/holidays.json'
import {
  useCutiOptimizer,
  calculatePlanMetrics,
  WORK_PATTERNS,
  EMPLOYEE_STATUSES,
} from '@/composables/useCutiOptimizer'
import {
  downloadIcsFile,
  buildShareUrl,
  parseShareParams,
} from '@/composables/useCalendarExport'
import FilterBar from '@/components/FilterBar.vue'
import SummaryStats from '@/components/SummaryStats.vue'
import RecommendationList from '@/components/RecommendationList.vue'
import CalendarBoard from '@/components/CalendarBoard.vue'

const availableYears = Object.keys(holidaysData).sort()
const latestOfficialYear = Number(availableYears[availableYears.length - 1] || 2027)

// Persist user preferences in localStorage via VueUse
const year = useStorage('cutipedia:year', latestOfficialYear)
const cutiQuota = useStorage('cutipedia:quota', 12)
const workPattern = useStorage('cutipedia:pattern', WORK_PATTERNS.FIVE_DAYS)
const employeeStatus = useStorage('cutipedia:status', EMPLOYEE_STATUSES.SWASTA_POTONG)
const isDark = useStorage('cutipedia:dark', false)

// Hydrate state from shared URL parameters (?year=...&cuti=...) if present
const sharedParams =
  typeof window !== 'undefined' ? parseShareParams(window.location.search) : null

if (sharedParams) {
  if (sharedParams.year !== undefined) year.value = sharedParams.year
  if (sharedParams.cutiQuota !== undefined) cutiQuota.value = sharedParams.cutiQuota
  if (sharedParams.workPattern !== undefined) workPattern.value = sharedParams.workPattern
  if (sharedParams.employeeStatus !== undefined) {
    employeeStatus.value = sharedParams.employeeStatus
  }
}

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark.value)
  }
})

const themeOverrides = computed(() => ({
  common: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    primaryColor: isDark.value ? '#22c55e' : '#15803d',
    primaryColorHover: isDark.value ? '#4ade80' : '#16a34a',
    primaryColorPressed: isDark.value ? '#16a34a' : '#166534',
    primaryColorSuppl: isDark.value ? '#22c55e' : '#15803d',
    borderRadius: '10px',
    bodyColor: isDark.value ? '#101413' : '#f7f5f0',
    cardColor: isDark.value ? '#171d1b' : '#ffffff',
  },
}))

const {
  result,
  days,
  allOpportunities,
  recommendedPlans,
  naturalLongWeekends,
  stats,
  hasOfficialData,
} = useCutiOptimizer({
  year,
  cutiQuota,
  workPattern,
  employeeStatus,
})

// Manual customization state (null = follow optimal auto-selection)
const customSelectedIds = ref(null)

if (sharedParams && Array.isArray(sharedParams.cutiDates)) {
  const sharedDateSet = new Set(sharedParams.cutiDates)
  if (sharedDateSet.size === 0) {
    customSelectedIds.value = []
  } else {
    const matchedIds = allOpportunities.value
      .filter((opp) => opp.cutiDates.every((d) => sharedDateSet.has(d)))
      .map((opp) => opp.id)
    if (matchedIds.length > 0) {
      customSelectedIds.value = matchedIds
    }
  }
}

watch([year, cutiQuota, workPattern, employeeStatus], () => {
  customSelectedIds.value = null
})

const isCustomized = computed(() => customSelectedIds.value !== null)

const selectedIds = computed(() => {
  if (customSelectedIds.value !== null) {
    return customSelectedIds.value
  }
  return recommendedPlans.value.map((p) => p.id)
})

const selectedPlans = computed(() => {
  const idSet = new Set(selectedIds.value)
  return allOpportunities.value.filter((opp) => idSet.has(opp.id))
})

const selectedCutiUsed = computed(() =>
  selectedPlans.value.reduce((sum, p) => sum + p.cutiCount, 0)
)

const remainingBudget = computed(() =>
  Math.max(0, stats.value.availableForExtraLeave - selectedCutiUsed.value)
)

const selectedCutiDates = computed(() =>
  selectedPlans.value.flatMap((p) => p.cutiDates)
)

const planMetrics = computed(() =>
  calculatePlanMetrics(days.value, new Set(selectedCutiDates.value))
)

function togglePlan(planId) {
  const current = [...selectedIds.value]
  const index = current.indexOf(planId)

  if (index >= 0) {
    current.splice(index, 1)
    customSelectedIds.value = current
    return
  }

  const target = allOpportunities.value.find((o) => o.id === planId)
  if (!target || target.cutiCount > remainingBudget.value) return

  current.push(planId)
  customSelectedIds.value = current
}

function resetOptimal() {
  customSelectedIds.value = null
}

// Export & Share actions
const { copy, copied } = useClipboard({ copiedDuring: 2500 })

function handleDownloadIcs() {
  if (selectedPlans.value.length === 0) return
  downloadIcsFile(selectedPlans.value, year.value)
}

async function handleCopyShareUrl() {
  const url = buildShareUrl({
    year: year.value,
    cutiQuota: cutiQuota.value,
    workPattern: workPattern.value,
    employeeStatus: employeeStatus.value,
    selectedCutiDates: selectedCutiDates.value,
  })
  await copy(url)
}

const calendarBoardRef = ref(null)

async function handleFocusDate(dateStr) {
  await calendarBoardRef.value?.moveToDate(dateStr)
  if (typeof window !== 'undefined' && window.innerWidth < 992) {
    calendarBoardRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : null" :theme-overrides="themeOverrides">
    <NLayout style="min-height: 100vh; background: transparent">
      <NLayoutHeader bordered class="cp-header">
        <div class="cp-header-inner">
          <div class="cp-brand">
            <div class="cp-logo-box">
              <Calendar :size="20" />
            </div>
            <div>
              <div class="cp-brand-title">CutiPedia</div>
              <div class="cp-brand-sub">Optimasi Long Weekend SKB 3 Menteri</div>
            </div>
          </div>

          <NSpace align="center" :size="10">
            <NTag v-if="result.sumber" size="small" :bordered="false" class="cp-hide-xs">
              {{ result.sumber }}
            </NTag>
            <NButton
              circle
              secondary
              :aria-label="isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'"
              @click="isDark = !isDark"
            >
              <template #icon>
                <Sun v-if="isDark" :size="18" />
                <Moon v-else :size="18" />
              </template>
            </NButton>
          </NSpace>
        </div>
      </NLayoutHeader>

      <NLayoutContent style="background: transparent">
        <main class="cp-container">
          <NSpace vertical :size="18">
            <FilterBar
              v-model:year="year"
              v-model:cuti-quota="cutiQuota"
              v-model:work-pattern="workPattern"
              v-model:employee-status="employeeStatus"
              :available-years="availableYears"
              :stats="stats"
              :has-official-data="hasOfficialData"
            />

            <SummaryStats
              :stats="stats"
              :selected-plans-count="selectedPlans.length"
              :selected-cuti-used="selectedCutiUsed"
              :plan-metrics="planMetrics"
              :has-official-data="hasOfficialData"
            />

            <!-- Export & Share bar -->
            <NCard size="small" class="cp-export-card">
              <div class="cp-export-bar">
                <div class="cp-export-info">
                  <strong>Ekspor &amp; Bagikan Rencana</strong>
                  <span class="cp-export-hint">
                    Unduh file <code>.ics</code> untuk Google/Apple/Outlook Calendar atau salin tautan rencana Anda.
                  </span>
                </div>
                <NSpace :size="10" wrap>
                  <NButton
                    type="primary"
                    :disabled="!hasOfficialData || selectedPlans.length === 0"
                    @click="handleDownloadIcs"
                  >
                    <template #icon><Download :size="16" /></template>
                    Unduh .ics ({{ selectedCutiUsed }} hari)
                  </NButton>
                  <NButton
                    secondary
                    :type="copied ? 'success' : 'default'"
                    @click="handleCopyShareUrl"
                  >
                    <template #icon>
                      <Check v-if="copied" :size="16" />
                      <Share2 v-else :size="16" />
                    </template>
                    {{ copied ? 'Link Tersalin!' : 'Salin Link Rencana' }}
                  </NButton>
                </NSpace>
              </div>
            </NCard>

            <div class="cp-main-grid">
              <RecommendationList
                :year="year"
                :has-official-data="hasOfficialData"
                :latest-official-year="latestOfficialYear"
                :all-opportunities="allOpportunities"
                :natural-long-weekends="naturalLongWeekends"
                :selected-ids="selectedIds"
                :remaining-budget="remainingBudget"
                :available-for-extra-leave="stats.availableForExtraLeave"
                :is-customized="isCustomized"
                @toggle-plan="togglePlan"
                @reset-optimal="resetOptimal"
                @focus-date="handleFocusDate"
                @switch-year="year = $event"
              />

              <CalendarBoard
                ref="calendarBoardRef"
                :year="year"
                :days="days"
                :selected-cuti-dates="selectedCutiDates"
                :is-dark="isDark"
                :has-official-data="hasOfficialData"
              />
            </div>
          </NSpace>
        </main>
      </NLayoutContent>
    </NLayout>
  </NConfigProvider>
</template>

<style scoped>
.cp-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(10px);
}

.cp-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (min-width: 768px) {
  .cp-header-inner {
    padding: 14px 24px;
  }
}

.cp-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cp-logo-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--cp-accent-soft);
  color: var(--cp-accent);
  display: grid;
  place-items: center;
}

.cp-brand-title {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.cp-brand-sub {
  font-size: 12px;
  color: var(--cp-text-muted);
}

.cp-export-card {
  border-radius: 12px;
}

.cp-export-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cp-export-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.cp-export-hint {
  font-size: 12px;
  color: var(--cp-text-muted);
}

@media (max-width: 540px) {
  .cp-hide-xs {
    display: none;
  }
}
</style>
