<script setup>
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { NButton, NEmpty } from 'naive-ui'
import { RotateCcw, CalendarPlus, ArrowRight, ExternalLink, Check } from 'lucide-vue-next'
import { buildGoogleCalendarUrl } from '@/composables/useCalendarExport'

const props = defineProps({
  year: { type: Number, required: true },
  hasOfficialData: { type: Boolean, required: true },
  latestOfficialYear: { type: Number, required: true },
  allOpportunities: { type: Array, required: true },
  naturalLongWeekends: { type: Array, required: true },
  selectedIds: { type: Array, required: true },
  remainingBudget: { type: Number, required: true },
  availableForExtraLeave: { type: Number, required: true },
  isCustomized: { type: Boolean, required: true },
})

const emit = defineEmits(['toggle-plan', 'reset-optimal', 'focus-date', 'switch-year'])

const filterMode = ref('all') // 'all' | 'selected'
const showNatural = ref(false)

const selectedSet = computed(() => new Set(props.selectedIds))

const displayedOpportunities = computed(() => {
  if (filterMode.value === 'selected') {
    return props.allOpportunities.filter((opp) => selectedSet.value.has(opp.id))
  }
  return props.allOpportunities
})

function formatDateRange(start, end) {
  const s = dayjs(start)
  const e = dayjs(end)
  if (s.month() === e.month()) {
    return `${s.format('D')}–${e.format('D MMM YYYY')}`
  }
  return `${s.format('D MMM')}–${e.format('D MMM YYYY')}`
}

function formatCutiDate(dateStr) {
  return dayjs(dateStr).format('ddd, D MMM')
}

function canToggle(opp) {
  if (selectedSet.value.has(opp.id)) return true
  return opp.cutiCount <= props.remainingBudget
}
</script>

<template>
  <section class="cp-panel cp-rec-panel" aria-label="Daftar rekomendasi strategi cuti">
    <div class="cp-rec-head">
      <div>
        <div class="cp-section-kicker">02 / Daftar Rekomendasi {{ year }}</div>
        <h2 class="cp-rec-title cp-serif">Celah Hari Kejepit &amp; Strategi Cuti</h2>
      </div>

      <div class="cp-rec-controls">
        <NButton
          v-if="isCustomized && hasOfficialData"
          size="tiny"
          secondary
          type="primary"
          @click="emit('reset-optimal')"
        >
          <template #icon><RotateCcw :size="12" /></template>
          Reset Optimal
        </NButton>
        <NButton
          v-if="hasOfficialData && allOpportunities.length > 0"
          size="tiny"
          quaternary
          @click="filterMode = filterMode === 'all' ? 'selected' : 'all'"
        >
          {{ filterMode === 'all' ? `Hanya terpilih (${selectedIds.length})` : `Tampilkan semua (${allOpportunities.length})` }}
        </NButton>
      </div>
    </div>

    <!-- Empty State jika SKB tahun belum rilis -->
    <div v-if="!hasOfficialData" class="cp-empty-wrap">
      <NEmpty
        :description="`SKB 3 Menteri untuk tahun ${year} belum tersedia di database aplikasi.`"
        size="large"
      >
        <template #extra>
          <div class="cp-empty-actions">
            <NButton type="primary" @click="emit('switch-year', latestOfficialYear)">
              Buka Data Resmi {{ latestOfficialYear }}
            </NButton>
            <NButton
              tag="a"
              href="https://www.kemenkopmk.go.id/"
              target="_blank"
              rel="noopener noreferrer"
              secondary
            >
              <template #icon><ExternalLink :size="14" /></template>
              Situs Kemenko PMK
            </NButton>
          </div>
        </template>
      </NEmpty>
    </div>

    <!-- Daftar agenda harpitnas -->
    <template v-else>
      <div v-if="displayedOpportunities.length === 0" class="cp-empty-wrap">
        <NEmpty
          :description="
            filterMode === 'selected'
              ? 'Belum ada paket cuti yang dipilih.'
              : 'Tidak ada celah harpitnas 1–3 hari kerja pada konfigurasi ini.'
          "
        >
          <template #extra>
            <NButton
              v-if="filterMode === 'selected'"
              size="small"
              type="primary"
              @click="filterMode = 'all'"
            >
              Tampilkan Semua Opsi
            </NButton>
          </template>
        </NEmpty>
      </div>

      <div v-else v-auto-animate class="cp-agenda-list">
        <article
          v-for="opp in displayedOpportunities"
          :key="opp.id"
          class="cp-agenda-row"
          :class="{
            'is-selected': selectedSet.has(opp.id),
            'is-disabled': !canToggle(opp),
          }"
          role="button"
          tabindex="0"
          @click="canToggle(opp) && emit('toggle-plan', opp.id)"
          @keydown.enter.prevent="canToggle(opp) && emit('toggle-plan', opp.id)"
          @keydown.space.prevent="canToggle(opp) && emit('toggle-plan', opp.id)"
        >
          <div class="cp-agenda-main">
            <div class="cp-agenda-check" :class="{ 'is-checked': selectedSet.has(opp.id) }">
              <Check v-if="selectedSet.has(opp.id)" :size="13" :stroke-width="3" />
            </div>

            <div class="cp-agenda-body">
              <div class="cp-agenda-top">
                <h3 class="cp-agenda-range">{{ formatDateRange(opp.startDate, opp.endDate) }}</h3>
                <span class="cp-mono cp-ratio-text">
                  {{ opp.totalHolidayDays }} hari libur &middot; {{ opp.efficiencyRatio }}&times;
                </span>
              </div>

              <p class="cp-agenda-summary">
                Ambil <strong class="cp-mono">{{ opp.cutiCount }} hari</strong> cuti:
                <span class="cp-cuti-dates">
                  {{ opp.cutiDates.map(formatCutiDate).join(', ') }}
                </span>
              </p>

              <p v-if="opp.relatedHolidays.length > 0" class="cp-agenda-holidays">
                {{ opp.relatedHolidays.join(' · ') }}
              </p>

              <p v-if="!canToggle(opp)" class="cp-agenda-warn">
                Sisa cuti tidak cukup ({{ remainingBudget }} hari tersisa)
              </p>
            </div>
          </div>

          <div class="cp-agenda-actions">
            <NButton
              size="tiny"
              quaternary
              tag="a"
              :href="buildGoogleCalendarUrl(opp)"
              target="_blank"
              rel="noopener noreferrer"
              @click.stop
            >
              <template #icon><CalendarPlus :size="13" /></template>
              Google Calendar
            </NButton>
            <NButton
              size="tiny"
              quaternary
              type="primary"
              @click.stop="emit('focus-date', opp.cutiDates[0])"
            >
              Lihat Kalender
              <template #icon><ArrowRight :size="13" /></template>
            </NButton>
          </div>
        </article>
      </div>

      <!-- Long weekend alami (0 cuti) -->
      <div v-if="naturalLongWeekends.length > 0" class="cp-natural-section">
        <button
          type="button"
          class="cp-natural-toggle"
          @click="showNatural = !showNatural"
        >
          <span>Long weekend alami tanpa ambil cuti ({{ naturalLongWeekends.length }})</span>
          <span class="cp-mono">{{ showNatural ? 'Tutup' : 'Lihat daftar' }}</span>
        </button>

        <div v-if="showNatural" class="cp-natural-list">
          <div
            v-for="item in naturalLongWeekends"
            :key="item.id"
            class="cp-natural-row"
            @click="emit('focus-date', item.startDate)"
          >
            <div>
              <div class="cp-natural-range">
                {{ formatDateRange(item.startDate, item.endDate) }}
              </div>
              <div class="cp-natural-names">
                {{ item.holidayNames.join(' · ') }}
              </div>
            </div>
            <span class="cp-mono cp-natural-days">{{ item.totalHolidayDays }} hari</span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.cp-rec-panel {
  overflow: hidden;
}

.cp-rec-head {
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--cp-border);
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.cp-rec-title {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
}

.cp-rec-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cp-empty-wrap {
  padding: 32px 20px;
}

.cp-empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.cp-agenda-list {
  display: flex;
  flex-direction: column;
}

.cp-agenda-row {
  padding: 16px 20px;
  border-bottom: 1px solid var(--cp-border);
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background-color 0.14s ease, border-left-color 0.14s ease;
}

.cp-agenda-row:last-child {
  border-bottom: none;
}

.cp-agenda-row:hover:not(.is-disabled) {
  background: var(--cp-surface-muted);
}

.cp-agenda-row.is-selected {
  border-left-color: var(--cp-accent);
  background: var(--cp-accent-soft);
}

.cp-agenda-row.is-disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.cp-agenda-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cp-agenda-check {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border-radius: 3px;
  border: 1.5px solid var(--cp-border-strong);
  background: var(--cp-surface);
  color: #ffffff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.cp-agenda-check.is-checked {
  border-color: var(--cp-accent);
  background: var(--cp-accent);
}

.cp-agenda-body {
  flex: 1;
  min-width: 0;
}

.cp-agenda-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.cp-agenda-range {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--cp-text);
}

.cp-ratio-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--cp-accent);
}

.cp-agenda-summary {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--cp-text-muted);
}

.cp-cuti-dates {
  color: var(--cp-text);
  font-weight: 600;
}

.cp-agenda-holidays {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--cp-text-muted);
}

.cp-agenda-warn {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--cp-amber);
}

.cp-agenda-actions {
  margin-top: 10px;
  padding-left: 30px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.cp-natural-section {
  border-top: 1px solid var(--cp-border);
  background: var(--cp-surface-muted);
}

.cp-natural-toggle {
  width: 100%;
  padding: 12px 20px;
  border: 0;
  background: transparent;
  color: var(--cp-text);
  font-family: var(--cp-font-sans);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.cp-natural-toggle .cp-mono {
  font-size: 12px;
  color: var(--cp-accent);
}

.cp-natural-list {
  padding: 0 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cp-natural-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid var(--cp-border);
  border-radius: 4px;
  background: var(--cp-surface);
  cursor: pointer;
}

.cp-natural-range {
  font-size: 13px;
  font-weight: 600;
}

.cp-natural-names {
  font-size: 12px;
  color: var(--cp-text-muted);
}

.cp-natural-days {
  font-size: 12px;
  font-weight: 600;
  color: var(--cp-text-muted);
  flex-shrink: 0;
}
</style>
