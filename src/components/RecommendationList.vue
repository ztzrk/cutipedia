<script setup>
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import {
  NCard,
  NTag,
  NSpace,
  NButton,
  NEmpty,
  NCollapse,
  NCollapseItem,
  NDivider,
} from 'naive-ui'
import {
  Sparkles,
  CheckCircle2,
  Circle,
  RotateCcw,
  CalendarSearch,
  CalendarPlus,
  ExternalLink,
  Sun,
} from 'lucide-vue-next'
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

function ratioTagType(ratio) {
  if (ratio >= 5) return 'success'
  if (ratio >= 3) return 'info'
  return 'default'
}
</script>

<template>
  <NCard class="cp-rec-card" :bordered="true" size="medium">
    <template #header>
      <NSpace align="center" :size="8">
        <Sparkles :size="18" class="cp-accent-icon" />
        <span>Rekomendasi Strategi Cuti {{ year }}</span>
      </NSpace>
    </template>

    <template #header-extra>
      <NSpace align="center" :size="8">
        <NButton
          v-if="isCustomized && hasOfficialData"
          size="tiny"
          secondary
          type="primary"
          @click="emit('reset-optimal')"
        >
          <template #icon><RotateCcw :size="13" /></template>
          Reset Optimal
        </NButton>
        <NButton
          v-if="hasOfficialData && allOpportunities.length > 0"
          size="tiny"
          quaternary
          @click="filterMode = filterMode === 'all' ? 'selected' : 'all'"
        >
          {{ filterMode === 'all' ? `Terpilih (${selectedIds.length})` : `Semua (${allOpportunities.length})` }}
        </NButton>
      </NSpace>
    </template>

    <!-- Empty State jika SKB tahun belum rilis -->
    <div v-if="!hasOfficialData" class="cp-empty-wrap">
      <NEmpty
        :description="`SKB 3 Menteri untuk tahun ${year} belum tersedia di database aplikasi.`"
        size="large"
      >
        <template #extra>
          <NSpace justify="center" :size="10">
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
              Cek Kemenko PMK
            </NButton>
          </NSpace>
        </template>
      </NEmpty>
    </div>

    <!-- Daftar peluang harpitnas -->
    <template v-else>
      <div v-if="displayedOpportunities.length === 0" class="cp-empty-wrap">
        <NEmpty
          :description="
            filterMode === 'selected'
              ? 'Belum ada paket cuti yang dipilih. Klik Reset Optimal atau tampilkan semua opsi.'
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

      <div v-else v-auto-animate class="cp-opp-list">
        <div
          v-for="opp in displayedOpportunities"
          :key="opp.id"
          class="cp-opp-item"
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
          <div class="cp-opp-top">
            <div class="cp-opp-title-row">
              <CheckCircle2
                v-if="selectedSet.has(opp.id)"
                :size="18"
                class="cp-check-active"
              />
              <Circle v-else :size="18" class="cp-check-idle" />
              <span class="cp-opp-range">{{ formatDateRange(opp.startDate, opp.endDate) }}</span>
            </div>

            <NSpace :size="6" align="center">
              <NTag :type="ratioTagType(opp.efficiencyRatio)" size="small" round class="cp-mono">
                Rasio {{ opp.efficiencyRatio }}x
              </NTag>
            </NSpace>
          </div>

          <div class="cp-opp-metrics">
            <span>
              Dapat <strong class="cp-mono">{{ opp.totalHolidayDays }} hari</strong> libur
            </span>
            <span class="cp-dot">&bull;</span>
            <span>
              Ambil <strong class="cp-mono">{{ opp.cutiCount }} hari</strong> cuti:
              <span class="cp-cuti-dates">
                {{ opp.cutiDates.map(formatCutiDate).join(', ') }}
              </span>
            </span>
          </div>

          <div class="cp-opp-bottom">
            <NSpace :size="4" wrap>
              <NTag
                v-for="holidayName in opp.relatedHolidays"
                :key="holidayName"
                size="tiny"
                :bordered="false"
              >
                {{ holidayName }}
              </NTag>
              <NTag v-if="!canToggle(opp)" size="tiny" type="warning" :bordered="false">
                Sisa cuti kurang ({{ remainingBudget }} hari tersisa)
              </NTag>
            </NSpace>

            <NSpace :size="6" align="center">
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
                <template #icon><CalendarSearch :size="13" /></template>
                Lihat Kalender
              </NButton>
            </NSpace>
          </div>
        </div>
      </div>

      <!-- Long weekend alami (0 cuti) -->
      <template v-if="naturalLongWeekends.length > 0">
        <NDivider style="margin: 18px 0 12px" />
        <NCollapse>
          <NCollapseItem name="natural">
            <template #header>
              <NSpace align="center" :size="6">
                <Sun :size="15" />
                <span>Long Weekend Alami — Tanpa Cuti ({{ naturalLongWeekends.length }})</span>
              </NSpace>
            </template>
            <div class="cp-natural-list">
              <div
                v-for="item in naturalLongWeekends"
                :key="item.id"
                class="cp-natural-item"
                @click="emit('focus-date', item.startDate)"
              >
                <div>
                  <div class="cp-natural-range">
                    {{ formatDateRange(item.startDate, item.endDate) }}
                  </div>
                  <div class="cp-natural-names">
                    {{ item.holidayNames.join(' + ') }}
                  </div>
                </div>
                <NTag size="small" type="info" round class="cp-mono">
                  {{ item.totalHolidayDays }} hari
                </NTag>
              </div>
            </div>
          </NCollapseItem>
        </NCollapse>
      </template>
    </template>
  </NCard>
</template>

<style scoped>
.cp-rec-card {
  border-radius: 14px;
}

.cp-accent-icon {
  color: var(--cp-accent);
}

.cp-empty-wrap {
  padding: 28px 12px;
}

.cp-opp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cp-opp-item {
  border: 1px solid var(--cp-border);
  background: var(--cp-surface);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.15s ease;
}

.cp-opp-item:hover:not(.is-disabled) {
  border-color: var(--cp-accent);
}

.cp-opp-item.is-selected {
  border-color: var(--cp-green);
  background: var(--cp-accent-soft);
}

.cp-opp-item.is-disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.cp-opp-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cp-opp-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cp-check-active {
  color: var(--cp-green);
  flex-shrink: 0;
}

.cp-check-idle {
  color: var(--cp-text-muted);
  flex-shrink: 0;
}

.cp-opp-range {
  font-weight: 700;
  font-size: 15px;
  color: var(--cp-text);
}

.cp-opp-metrics {
  margin-top: 6px;
  padding-left: 26px;
  font-size: 13px;
  color: var(--cp-text-muted);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.cp-cuti-dates {
  color: var(--cp-text);
  font-weight: 600;
}

.cp-opp-bottom {
  margin-top: 10px;
  padding-left: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.cp-natural-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cp-natural-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--cp-surface-muted);
  cursor: pointer;
}

.cp-natural-range {
  font-size: 13px;
  font-weight: 700;
}

.cp-natural-names {
  font-size: 12px;
  color: var(--cp-text-muted);
}
</style>
