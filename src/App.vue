<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useStorage, useClipboard } from '@vueuse/core'
import {
  NConfigProvider,
  NButton,
  NSelect,
  darkTheme,
} from 'naive-ui'
import { ArrowLeft, Sun, Moon } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
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

// Navigation state: 'planner' | 'calendar'
const activePage = ref(
  typeof window !== 'undefined' && window.location.hash === '#/kalender'
    ? 'calendar'
    : 'planner'
)

function navigateTo(page) {
  activePage.value = page
  if (typeof window !== 'undefined') {
    const targetHash = page === 'calendar' ? '#/kalender' : ''
    if (window.location.hash !== targetHash) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${targetHash}`
      )
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function handleHashChange() {
  activePage.value = window.location.hash === '#/kalender' ? 'calendar' : 'planner'
}

onMounted(() => {
  window.addEventListener('hashchange', handleHashChange)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange)
})

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
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    primaryColor: isDark.value ? '#4d9e70' : '#1b5e3a',
    primaryColorHover: isDark.value ? '#63b385' : '#237549',
    primaryColorPressed: isDark.value ? '#3c855c' : '#14472c',
    primaryColorSuppl: isDark.value ? '#4d9e70' : '#1b5e3a',
    borderRadius: '4px',
    bodyColor: isDark.value ? '#161513' : '#f5f1e8',
    cardColor: isDark.value ? '#1e1c19' : '#fcfbf8',
    borderColor: isDark.value ? '#332f29' : '#d8d0c1',
  },
}))

const {
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

const yearOptions = computed(() => {
  const options = availableYears.map((y) => ({
    label: `${y} — SKB Resmi`,
    value: Number(y),
  }))
  const nextYear = latestOfficialYear + 1
  if (!availableYears.map(Number).includes(nextYear)) {
    options.push({
      label: `${nextYear} — Belum Rilis`,
      value: nextYear,
    })
  }
  return options
})

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
const focusedCalendarDate = ref('')

async function handleFocusDate(dateStr) {
  focusedCalendarDate.value = dateStr
  navigateTo('calendar')
  await nextTick()
  await calendarBoardRef.value?.moveToDate(dateStr)
}
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : null" :theme-overrides="themeOverrides">
    <div class="cp-shell">
      <header class="cp-masthead">
        <div class="cp-masthead-inner">
          <div class="cp-brand" role="button" tabindex="0" @click="navigateTo('planner')">
            <BrandLogo :size="34" />
            <div>
              <div class="cp-brand-title cp-serif">CutiPedia</div>
              <div class="cp-brand-sub">Almanak Cuti &amp; Libur Nasional</div>
            </div>
          </div>

          <nav class="cp-nav" aria-label="Navigasi halaman">
            <button
              type="button"
              class="cp-nav-link"
              :class="{ 'is-active': activePage === 'planner' }"
              @click="navigateTo('planner')"
            >
              Rekomendasi
            </button>
            <button
              type="button"
              class="cp-nav-link"
              :class="{ 'is-active': activePage === 'calendar' }"
              @click="navigateTo('calendar')"
            >
              Kalender Libur
            </button>
            <button
              type="button"
              class="cp-theme-btn"
              :aria-label="isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'"
              @click="isDark = !isDark"
            >
              <Sun v-if="isDark" :size="16" />
              <Moon v-else :size="16" />
            </button>
          </nav>
        </div>
      </header>

      <main class="cp-container">
        <!-- Halaman 1: Planner & Rekomendasi Cuti -->
        <div v-if="activePage === 'planner'" class="cp-planner-page">
          <div class="cp-intro">
            <h1 class="cp-intro-title cp-serif">Susun Rencana Long Weekend {{ year }}</h1>
            <p class="cp-intro-desc">
              Atur profil kerja dan sisa jatah cuti di sidebar kanan untuk melihat hari kejepit
              nasional paling efisien berdasarkan SKB 3 Menteri.
            </p>
          </div>

          <div class="cp-planner-layout">
            <aside class="cp-planner-sidebar" aria-label="Panel pengaturan dan ringkasan">
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
                :copied="copied"
                @download-ics="handleDownloadIcs"
                @copy-link="handleCopyShareUrl"
              />
            </aside>

            <div class="cp-planner-main">
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
            </div>
          </div>
        </div>

        <!-- Halaman 2: Kalender Libur -->
        <div v-else class="cp-flow-stack">
          <div class="cp-cal-topbar">
            <NButton secondary size="small" @click="navigateTo('planner')">
              <template #icon><ArrowLeft :size="14" /></template>
              Kembali ke Rekomendasi
            </NButton>

            <div class="cp-cal-topbar-right">
              <span class="cp-mono cp-cal-count">{{ selectedCutiUsed }} hari saran cuti</span>
              <NSelect
                v-model:value="year"
                :options="yearOptions"
                size="small"
                style="width: 175px"
              />
            </div>
          </div>

          <CalendarBoard
            ref="calendarBoardRef"
            :year="year"
            :days="days"
            :selected-cuti-dates="selectedCutiDates"
            :is-dark="isDark"
            :has-official-data="hasOfficialData"
            :focused-date="focusedCalendarDate"
          />
        </div>

        <footer class="cp-footer">
          <span>Sumber data: SKB 3 Menteri (Kemenko PMK)</span>
          <span>Berjalan 100% di browser tanpa server</span>
        </footer>
      </main>
    </div>
  </NConfigProvider>
</template>

<style scoped>
.cp-shell {
  min-height: 100vh;
}

.cp-masthead {
  background: var(--cp-surface);
  border-bottom: 1px solid var(--cp-border);
}

.cp-masthead-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 14px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (min-width: 768px) {
  .cp-masthead-inner {
    padding: 16px 24px;
  }
}

.cp-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  cursor: pointer;
}

.cp-brand-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.cp-brand-sub {
  font-size: 12px;
  color: var(--cp-text-muted);
}

.cp-nav {
  display: flex;
  align-items: center;
  gap: 18px;
}

.cp-nav-link {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 6px 0;
  font-family: var(--cp-font-sans);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--cp-text-muted);
  cursor: pointer;
}

.cp-nav-link:hover {
  color: var(--cp-text);
}

.cp-nav-link.is-active {
  color: var(--cp-text);
  border-bottom-color: var(--cp-red);
}

.cp-theme-btn {
  border: 1px solid var(--cp-border);
  background: var(--cp-surface);
  color: var(--cp-text);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.cp-theme-btn:hover {
  background: var(--cp-surface-muted);
}

.cp-intro-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.cp-intro-desc {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--cp-text-muted);
  max-width: 62ch;
}

.cp-planner-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cp-planner-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
}

.cp-planner-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-planner-main {
  min-width: 0;
}

@media (min-width: 960px) {
  .cp-planner-layout {
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 24px;
  }

  .cp-planner-main {
    grid-column: 1;
    grid-row: 1;
  }

  .cp-planner-sidebar {
    grid-column: 2;
    grid-row: 1;
    position: sticky;
    top: 20px;
  }
}

.cp-cal-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cp-cal-topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cp-cal-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--cp-accent);
}

.cp-footer {
  margin-top: 36px;
  padding-top: 16px;
  border-top: 1px solid var(--cp-border);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--cp-text-muted);
}
</style>
