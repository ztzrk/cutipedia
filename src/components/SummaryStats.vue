<script setup>
import { computed } from 'vue'
import { NGrid, NGi, NCard, NTag } from 'naive-ui'
import { Sparkles, CalendarCheck, Flame, TrendingUp } from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, required: true },
  selectedPlansCount: { type: Number, required: true },
  selectedCutiUsed: { type: Number, required: true },
  planMetrics: { type: Object, required: true },
  hasOfficialData: { type: Boolean, required: true },
})

const averageEfficiency = computed(() => {
  if (!props.selectedCutiUsed) return '0'
  return (props.planMetrics.totalLongWeekendDays / props.selectedCutiUsed).toFixed(1)
})
</script>

<template>
  <NGrid cols="2 s:2 m:4" :x-gap="12" :y-gap="12" responsive="screen">
    <NGi>
      <NCard class="cp-stat-card cp-stat-highlight" size="small">
        <div class="cp-stat-head">
          <span class="cp-stat-label">Total Long Weekend</span>
          <Sparkles :size="16" class="cp-icon-green" />
        </div>
        <div class="cp-stat-value cp-mono">
          {{ hasOfficialData ? planMetrics.totalLongWeekendDays : 0 }}
          <span class="cp-stat-unit">hari</span>
        </div>
        <div class="cp-stat-sub">
          Total libur setahun: <strong class="cp-mono">{{ planMetrics.totalOffDaysInYear }}</strong> hari
        </div>
      </NCard>
    </NGi>

    <NGi>
      <NCard class="cp-stat-card" size="small">
        <div class="cp-stat-head">
          <span class="cp-stat-label">Cuti Saran Dipakai</span>
          <CalendarCheck :size="16" class="cp-icon-amber" />
        </div>
        <div class="cp-stat-value cp-mono">
          {{ selectedCutiUsed }}
          <span class="cp-stat-unit">/ {{ stats.availableForExtraLeave }} hari</span>
        </div>
        <div class="cp-stat-sub">
          <span v-if="stats.cutiBersamaDeducted > 0">
            +{{ stats.cutiBersamaDeducted }} cuti bersama terpotong
          </span>
          <span v-else>
            Sisa cuti bebas: <strong class="cp-mono">{{ Math.max(0, stats.availableForExtraLeave - selectedCutiUsed) }}</strong> hari
          </span>
        </div>
      </NCard>
    </NGi>

    <NGi>
      <NCard class="cp-stat-card" size="small">
        <div class="cp-stat-head">
          <span class="cp-stat-label">Rekor Libur Beruntun</span>
          <Flame :size="16" class="cp-icon-red" />
        </div>
        <div class="cp-stat-value cp-mono">
          {{ planMetrics.longestStreak }}
          <span class="cp-stat-unit">hari</span>
        </div>
        <div class="cp-stat-sub">
          <NTag size="tiny" :bordered="false" type="info">
            {{ selectedPlansCount }} paket cuti terpilih
          </NTag>
        </div>
      </NCard>
    </NGi>

    <NGi>
      <NCard class="cp-stat-card" size="small">
        <div class="cp-stat-head">
          <span class="cp-stat-label">Rasio Efisiensi</span>
          <TrendingUp :size="16" class="cp-icon-green" />
        </div>
        <div class="cp-stat-value cp-mono">
          {{ averageEfficiency }}x
        </div>
        <div class="cp-stat-sub">
          {{ stats.totalLiburNasional }} libur nas. &bull; {{ stats.totalCutiBersama }} cuti bersama
        </div>
      </NCard>
    </NGi>
  </NGrid>
</template>

<style scoped>
.cp-stat-card {
  border-radius: 12px;
  height: 100%;
}

.cp-stat-highlight {
  border-color: rgba(22, 163, 74, 0.35);
}

.cp-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.cp-stat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--cp-text-muted);
}

.cp-stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--cp-text);
}

.cp-stat-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--cp-text-muted);
}

.cp-stat-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--cp-text-muted);
}

.cp-icon-green {
  color: var(--cp-green);
}

.cp-icon-amber {
  color: var(--cp-amber);
}

.cp-icon-red {
  color: var(--cp-red);
}
</style>
