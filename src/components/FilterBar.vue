<script setup>
import { computed } from 'vue'
import {
  NCard,
  NGrid,
  NGi,
  NSelect,
  NSlider,
  NInputNumber,
  NRadioGroup,
  NRadioButton,
  NSpace,
  NTag,
  NAlert,
} from 'naive-ui'
import { SlidersHorizontal, CalendarRange, Briefcase, Users } from 'lucide-vue-next'
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
    label: `${y} (SKB Resmi)`,
    value: Number(y),
  }))
  const nextYear = Math.max(...props.availableYears.map(Number)) + 1
  if (!props.availableYears.map(Number).includes(nextYear)) {
    options.push({
      label: `${nextYear} (Belum Rilis)`,
      value: nextYear,
    })
  }
  return options
})

const employeeStatusOptions = [
  {
    label: 'Swasta — Cuti Bersama Memotong Jatah',
    value: EMPLOYEE_STATUSES.SWASTA_POTONG,
  },
  {
    label: 'Swasta — Cuti Bersama Tidak Memotong',
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
  <NCard class="cp-filter-card" :bordered="true" size="medium">
    <template #header>
      <NSpace align="center" :size="8">
        <SlidersHorizontal :size="18" />
        <span>Profil Kerja &amp; Jatah Cuti</span>
      </NSpace>
    </template>
    <template #header-extra>
      <NTag v-if="hasOfficialData" type="success" size="small" round>
        SKB 3 Menteri {{ year }}
      </NTag>
      <NTag v-else type="warning" size="small" round>
        Data {{ year }} Belum Tersedia
      </NTag>
    </template>

    <NGrid cols="1 s:2 l:4" :x-gap="16" :y-gap="16" responsive="screen">
      <!-- Tahun -->
      <NGi>
        <div class="cp-field-label">
          <CalendarRange :size="14" />
          <span>Tahun Kalender</span>
        </div>
        <NSelect
          :value="year"
          :options="yearOptions"
          @update:value="emit('update:year', $event)"
        />
      </NGi>

      <!-- Sisa Jatah Cuti -->
      <NGi>
        <div class="cp-field-label">
          <span>Sisa Jatah Cuti Tahunan</span>
          <span class="cp-mono cp-quota-pill">{{ cutiQuota }} hari</span>
        </div>
        <div class="cp-quota-control">
          <NSlider
            :value="cutiQuota"
            :min="1"
            :max="24"
            :step="1"
            style="flex: 1"
            @update:value="handleQuotaChange"
          />
          <NInputNumber
            :value="cutiQuota"
            :min="1"
            :max="24"
            size="small"
            style="width: 78px"
            @update:value="handleQuotaChange"
          />
        </div>
      </NGi>

      <!-- Pola Hari Kerja -->
      <NGi>
        <div class="cp-field-label">
          <Briefcase :size="14" />
          <span>Pola Hari Kerja</span>
        </div>
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
      </NGi>

      <!-- Status Pegawai -->
      <NGi>
        <div class="cp-field-label">
          <Users :size="14" />
          <span>Status Kepegawaian</span>
        </div>
        <NSelect
          :value="employeeStatus"
          :options="employeeStatusOptions"
          @update:value="emit('update:employeeStatus', $event)"
        />
      </NGi>
    </NGrid>

    <!-- Catatan pemotongan cuti bersama -->
    <div v-if="hasOfficialData && employeeStatus === EMPLOYEE_STATUSES.SWASTA_POTONG" class="cp-alert-wrap">
      <NAlert
        v-if="stats.quotaExceededByCutiBersama"
        type="warning"
        :show-icon="true"
        title="Sisa cuti habis oleh Cuti Bersama"
      >
        Tahun {{ year }} memiliki
        <strong>{{ stats.cutiBersamaDeducted }} hari</strong> Cuti Bersama pada hari kerja,
        melebihi input jatah cuti Anda (<strong>{{ cutiQuota }} hari</strong>). Sisa cuti bebas
        untuk saran tambahan adalah <strong>0 hari</strong>.
      </NAlert>
      <NAlert v-else type="info" :show-icon="true">
        Sebanyak <strong>{{ stats.cutiBersamaDeducted }} hari</strong> Cuti Bersama otomatis
        memotong jatah cuti Anda. Tersisa
        <strong>{{ stats.availableForExtraLeave }} hari</strong> cuti bebas untuk dioptimalkan.
      </NAlert>
    </div>
  </NCard>
</template>

<style scoped>
.cp-filter-card {
  border-radius: 14px;
}

.cp-field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cp-text-muted);
  margin-bottom: 8px;
}

.cp-field-label > span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cp-quota-pill {
  font-size: 12px;
  font-weight: 700;
  color: var(--cp-accent);
  background: var(--cp-accent-soft);
  padding: 1px 8px;
  border-radius: 999px;
}

.cp-quota-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cp-alert-wrap {
  margin-top: 16px;
}
</style>
