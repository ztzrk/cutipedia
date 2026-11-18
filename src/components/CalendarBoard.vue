<script setup>
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useWindowSize } from '@vueuse/core'
import { NCard, NSpace, NTag, NScrollbar } from 'naive-ui'
import { CalendarDays } from 'lucide-vue-next'

const props = defineProps({
  year: { type: Number, required: true },
  days: { type: Array, required: true },
  selectedCutiDates: { type: Array, required: true },
  isDark: { type: Boolean, default: false },
  hasOfficialData: { type: Boolean, required: true },
})

const calendarRef = ref(null)
const { width } = useWindowSize()

const calendarColumns = computed(() => (width.value >= 640 ? 2 : 1))

function toLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const initialPage = computed(() => ({
  month: 1,
  year: props.year,
}))

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
  <NCard class="cp-cal-card" :bordered="true" size="medium">
    <template #header>
      <NSpace align="center" :size="8">
        <CalendarDays :size="18" />
        <span>Kalender Interaktif {{ year }}</span>
      </NSpace>
    </template>

    <!-- Legenda warna sesuai plan -->
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

    <div class="cp-vcal-wrap">
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

    <!-- Daftar singkat tanggal merah SKB -->
    <div v-if="hasOfficialData && officialHolidays.length > 0" class="cp-holiday-list-wrap">
      <div class="cp-holiday-list-title">
        Daftar Tanggal Resmi SKB {{ year }} ({{ officialHolidays.length }})
      </div>
      <NScrollbar style="max-height: 220px">
        <div class="cp-holiday-list">
          <div
            v-for="item in officialHolidays"
            :key="item.date"
            class="cp-holiday-row"
            @click="moveToDate(item.date)"
          >
            <span class="cp-mono cp-holiday-date">{{ item.formattedDate }}</span>
            <span class="cp-holiday-name">{{ item.name }}</span>
            <NTag
              size="tiny"
              :type="item.type === 'libur_nasional' ? 'error' : 'warning'"
              :bordered="false"
            >
              {{ item.type === 'libur_nasional' ? 'Nasional' : 'Cuti Bersama' }}
            </NTag>
          </div>
        </div>
      </NScrollbar>
    </div>
  </NCard>
</template>

<style scoped>
.cp-cal-card {
  border-radius: 14px;
}

.cp-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cp-text-muted);
}

.cp-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cp-swatch {
  width: 11px;
  height: 11px;
  border-radius: 999px;
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
}

.cp-holiday-list-wrap {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--cp-border);
}

.cp-holiday-list-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--cp-text);
}

.cp-holiday-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 8px;
}

.cp-holiday-row {
  display: grid;
  grid-template-columns: 118px 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cp-holiday-row:hover {
  background: var(--cp-surface-muted);
}

.cp-holiday-date {
  color: var(--cp-text-muted);
}

.cp-holiday-name {
  color: var(--cp-text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
