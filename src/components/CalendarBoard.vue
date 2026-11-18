<script setup>
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useElementSize } from '@vueuse/core'
import { NScrollbar } from 'naive-ui'

const props = defineProps({
  year: { type: Number, required: true },
  days: { type: Array, required: true },
  selectedCutiDates: { type: Array, required: true },
  isDark: { type: Boolean, default: false },
  hasOfficialData: { type: Boolean, required: true },
  focusedDate: { type: String, default: '' },
})

const calendarRef = ref(null)
const vcalWrapRef = ref(null)
const { width: wrapWidth } = useElementSize(vcalWrapRef)

const calendarColumns = computed(() => {
  if (wrapWidth.value >= 800) return 3
  if (wrapWidth.value >= 540) return 2
  return 1
})

function toLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const initialPage = computed(() => {
  if (props.focusedDate && /^\d{4}-\d{2}-\d{2}$/.test(props.focusedDate)) {
    const [y, m] = props.focusedDate.split('-').map(Number)
    if (y === props.year) {
      return { month: m, year: y }
    }
  }
  return { month: 1, year: props.year }
})

const minDate = computed(() => new Date(props.year, 0, 1))
const maxDate = computed(() => new Date(props.year, 11, 31))

const selectedCutiSet = computed(() => new Set(props.selectedCutiDates))

const attributes = computed(() => {
  const attrs = []

  for (const day of props.days) {
    const localDate = toLocalDate(day.date)

    if (day.holidayType === 'libur_nasional') {
      attrs.push({
        key: `nasional-${day.date}`,
        dates: localDate,
        highlight: {
          color: 'red',
          fillMode: 'solid',
        },
        popover: {
          label: `Libur Nasional: ${day.holidayName}`,
          visibility: 'hover-focus',
        },
      })
    } else if (day.holidayType === 'cuti_bersama') {
      attrs.push({
        key: `bersama-${day.date}`,
        dates: localDate,
        highlight: {
          color: 'yellow',
          fillMode: 'solid',
        },
        popover: {
          label: `${day.holidayName}`,
          visibility: 'hover-focus',
        },
      })
    } else if (selectedCutiSet.value.has(day.date)) {
      attrs.push({
        key: `saran-${day.date}`,
        dates: localDate,
        highlight: {
          color: 'green',
          fillMode: 'solid',
        },
        popover: {
          label: 'Saran Cuti Tahunan (Harpitnas)',
          visibility: 'hover-focus',
        },
      })
    }
  }

  return attrs
})

const officialHolidays = computed(() =>
  props.days
    .filter((d) => d.isHoliday)
    .map((d) => ({
      date: d.date,
      formattedDate: dayjs(d.date).format('ddd, D MMM YYYY'),
      name: d.holidayName,
      type: d.holidayType,
    }))
)

async function moveToDate(dateStr) {
  if (!calendarRef.value || !dateStr) return
  const [y, m] = dateStr.split('-').map(Number)
  await calendarRef.value.move({ month: m, year: y })
}

watch(
  () => props.year,
  async (newYear) => {
    if (!calendarRef.value) return
    await calendarRef.value.move({ month: 1, year: newYear })
  }
)

defineExpose({
  moveToDate,
})
</script>

<template>
  <section class="cp-panel cp-cal-panel" aria-label="Kalender hari libur">
    <div class="cp-cal-head">
      <div>
        <div class="cp-section-kicker">Kalender Libur {{ year }}</div>
        <h2 class="cp-cal-title cp-serif">Penanggalan Resmi &amp; Saran Cuti</h2>
      </div>

      <div class="cp-legend">
        <div class="cp-legend-item">
          <span class="cp-swatch cp-swatch-red" />
          <span>Libur Nasional</span>
        </div>
        <div class="cp-legend-item">
          <span class="cp-swatch cp-swatch-yellow" />
          <span>Cuti Bersama</span>
        </div>
        <div class="cp-legend-item">
          <span class="cp-swatch cp-swatch-green" />
          <span>Saran Cuti</span>
        </div>
      </div>
    </div>

    <div ref="vcalWrapRef" class="cp-vcal-wrap">
      <VCalendar
        ref="calendarRef"
        locale="id"
        :columns="calendarColumns"
        :rows="1"
        :initial-page="initialPage"
        :min-date="minDate"
        :max-date="maxDate"
        :attributes="attributes"
        :is-dark="isDark"
        expanded
      />
    </div>

    <!-- Daftar tanggal resmi SKB -->
    <div v-if="hasOfficialData && officialHolidays.length > 0" class="cp-holiday-table-wrap">
      <div class="cp-holiday-table-head">
        Daftar Tanggal Resmi SKB {{ year }} ({{ officialHolidays.length }} hari)
      </div>
      <NScrollbar style="max-height: 260px">
        <div class="cp-holiday-table">
          <button
            v-for="item in officialHolidays"
            :key="item.date"
            type="button"
            class="cp-holiday-row"
            @click="moveToDate(item.date)"
          >
            <span class="cp-mono cp-holiday-date">{{ item.formattedDate }}</span>
            <span class="cp-holiday-name">{{ item.name }}</span>
            <span
              class="cp-holiday-kind"
              :class="item.type === 'libur_nasional' ? 'is-red' : 'is-amber'"
            >
              {{ item.type === 'libur_nasional' ? 'Nasional' : 'Cuti Bersama' }}
            </span>
          </button>
        </div>
      </NScrollbar>
    </div>
  </section>
</template>

<style scoped>
.cp-cal-panel {
  padding: 18px 20px;
}

.cp-cal-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--cp-border);
  margin-bottom: 16px;
}

.cp-cal-title {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
}

.cp-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--cp-text-muted);
}

.cp-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cp-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}

.cp-swatch-red {
  background: var(--cp-red);
}

.cp-swatch-yellow {
  background: #eab308;
}

.cp-swatch-green {
  background: var(--cp-green);
}

.cp-vcal-wrap {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.cp-holiday-table-wrap {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--cp-border);
}

.cp-holiday-table-head {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
}

.cp-holiday-table {
  display: flex;
  flex-direction: column;
}

.cp-holiday-row {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--cp-border);
  background: transparent;
  font-family: var(--cp-font-sans);
  text-align: left;
  display: grid;
  grid-template-columns: 124px 1fr auto;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  padding: 8px 6px;
  cursor: pointer;
  color: var(--cp-text);
}

.cp-holiday-row:hover {
  background: var(--cp-surface-muted);
}

.cp-holiday-date {
  color: var(--cp-text-muted);
}

.cp-holiday-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-holiday-kind {
  font-family: var(--cp-font-mono);
  font-size: 11px;
  font-weight: 600;
}

.cp-holiday-kind.is-red {
  color: var(--cp-red);
}

.cp-holiday-kind.is-amber {
  color: var(--cp-amber);
}
</style>
