<script setup>
import { computed } from 'vue'
import {
  NSelect,
  NSlider,
  NInputNumber,
  NRadioGroup,
  NRadioButton,
  NAlert,
} from 'naive-ui'
import { WORK_PATTERNS, EMPLOYEE_STATUSES } from '@/composables/useCutiOptimizer'

const props = defineProps({
  year: { type: Number, required: true },
  cutiQuota: { type: Number, required: true },
  workPattern: { type: String, required: true },
  employeeStatus: { type: String, required: true },
  availableYears: { type: Array, required: true },
  stats: { type: Object, required: true },
  hasOfficialData: { type: Boolean, required: true },
})

const emit = defineEmits([
  'update:year',
  'update:cutiQuota',
  'update:workPattern',
  'update:employeeStatus',
])

const yearOptions = computed(() => {
  const options = props.availableYears.map((y) => ({
    label: `${y} — SKB 3 Menteri Resmi`,
    value: Number(y),
  }))
  const nextYear = Math.max(...props.availableYears.map(Number)) + 1
  if (!props.availableYears.map(Number).includes(nextYear)) {
    options.push({
      label: `${nextYear} — Belum Rilis`,
      value: nextYear,
    })
  }
  return options
})

const employeeStatusOptions = [
  {
    label: 'Swasta — Cuti bersama memotong jatah cuti',
    value: EMPLOYEE_STATUSES.SWASTA_POTONG,
  },
  {
    label: 'Swasta — Cuti bersama tidak memotong',
    value: EMPLOYEE_STATUSES.SWASTA_TIDAK_POTONG,
  },
  {
    label: 'ASN (PNS / PPPK)',
    value: EMPLOYEE_STATUSES.ASN,
  },
]

function handleQuotaChange(val) {
  const num = Math.min(24, Math.max(1, Math.floor(Number(val) || 1)))
  emit('update:cutiQuota', num)
}
</script>

<template>
  <section class="cp-panel cp-filter-panel" aria-label="Profil kerja dan jatah cuti">
    <div class="cp-panel-head">
      <span class="cp-section-kicker">01 / Profil Kerja</span>
      <span class="cp-status-note" :class="hasOfficialData ? 'is-ok' : 'is-warn'">
        {{ hasOfficialData ? `Data resmi ${year}` : `SKB ${year} belum rilis` }}
      </span>
    </div>

    <div class="cp-filter-rows">
      <!-- Tahun -->
      <div class="cp-filter-row">
        <label class="cp-row-label" for="cp-year-select">Tahun kalender</label>
        <div class="cp-row-control">
          <NSelect
            id="cp-year-select"
            :value="year"
            :options="yearOptions"
            @update:value="emit('update:year', $event)"
          />
        </div>
      </div>

      <!-- Sisa Jatah Cuti -->
      <div class="cp-filter-row">
        <div class="cp-row-label-split">
          <label class="cp-row-label" for="cp-quota-input">Sisa jatah cuti tahunan</label>
          <span class="cp-mono cp-quota-readout">{{ cutiQuota }} hari</span>
        </div>
        <div class="cp-row-control cp-quota-control">
          <NSlider
            :value="cutiQuota"
            :min="1"
            :max="24"
            :step="1"
            style="flex: 1"
            @update:value="handleQuotaChange"
          />
          <NInputNumber
            id="cp-quota-input"
            :value="cutiQuota"
            :min="1"
            :max="24"
            size="small"
            style="width: 82px"
            @update:value="handleQuotaChange"
          />
        </div>
      </div>

      <!-- Pola Hari Kerja -->
      <div class="cp-filter-row">
        <span class="cp-row-label">Pola hari kerja</span>
        <div class="cp-row-control">
          <NRadioGroup
            :value="workPattern"
            name="work-pattern"
            style="width: 100%; display: flex"
            @update:value="emit('update:workPattern', $event)"
          >
            <NRadioButton :value="WORK_PATTERNS.FIVE_DAYS" style="flex: 1; text-align: center">
              5 Hari (Sen–Jum)
            </NRadioButton>
            <NRadioButton :value="WORK_PATTERNS.SIX_DAYS" style="flex: 1; text-align: center">
              6 Hari (Sen–Sab)
            </NRadioButton>
          </NRadioGroup>
        </div>
      </div>

      <!-- Status Kepegawaian -->
      <div class="cp-filter-row">
        <label class="cp-row-label" for="cp-status-select">Status kepegawaian</label>
        <div class="cp-row-control">
          <NSelect
            id="cp-status-select"
            :value="employeeStatus"
            :options="employeeStatusOptions"
            @update:value="emit('update:employeeStatus', $event)"
          />
        </div>
      </div>
    </div>

    <div
      v-if="hasOfficialData && employeeStatus === EMPLOYEE_STATUSES.SWASTA_POTONG"
      class="cp-filter-footnote"
    >
      <NAlert
        v-if="stats.quotaExceededByCutiBersama"
        type="warning"
        :show-icon="true"
        title="Jatah cuti habis terpotong Cuti Bersama"
      >
        Pada {{ year }}, ada <strong>{{ stats.cutiBersamaDeducted }} hari</strong> Cuti Bersama di
        hari kerja, melebihi input jatah cuti Anda (<strong>{{ cutiQuota }} hari</strong>). Sisa
        cuti bebas menjadi <strong>0 hari</strong>.
      </NAlert>
      <p v-else class="cp-footnote-text">
        Catatan: <strong>{{ stats.cutiBersamaDeducted }} hari</strong> Cuti Bersama memotong jatah
        tahunan. Tersisa <strong class="cp-mono">{{ stats.availableForExtraLeave }} hari</strong>
        cuti bebas untuk dioptimalkan.
      </p>
    </div>
  </section>
</template>

<style scoped>
.cp-filter-panel {
  padding: 16px 18px;
}

.cp-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cp-border);
}

.cp-status-note {
  font-family: var(--cp-font-mono);
  font-size: 11px;
  font-weight: 500;
}

.cp-status-note.is-ok {
  color: var(--cp-accent);
}

.cp-status-note.is-warn {
  color: var(--cp-amber);
}

.cp-filter-rows {
  display: flex;
  flex-direction: column;
}

.cp-filter-row {
  padding: 11px 0;
  border-bottom: 1px solid var(--cp-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cp-filter-row:last-child {
  border-bottom: none;
  padding-bottom: 4px;
}

.cp-row-label-split {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.cp-row-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--cp-text);
}

.cp-quota-readout {
  font-size: 13px;
  font-weight: 600;
  color: var(--cp-accent);
}

.cp-row-control {
  width: 100%;
}

.cp-quota-control {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cp-filter-footnote {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--cp-border-strong);
}

.cp-footnote-text {
  margin: 0;
  font-size: 13px;
  color: var(--cp-text-muted);
}

.cp-footnote-text strong {
  color: var(--cp-text);
}
</style>
