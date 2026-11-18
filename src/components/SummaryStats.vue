<script setup>
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { Download, Share2, Check } from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, required: true },
  selectedPlansCount: { type: Number, required: true },
  selectedCutiUsed: { type: Number, required: true },
  planMetrics: { type: Object, required: true },
  hasOfficialData: { type: Boolean, required: true },
  copied: { type: Boolean, default: false },
})

const emit = defineEmits(['download-ics', 'copy-link'])

const averageEfficiency = computed(() => {
  if (!props.selectedCutiUsed) return '0'
  return (props.planMetrics.totalLongWeekendDays / props.selectedCutiUsed).toFixed(1)
})
</script>

<template>
  <section class="cp-panel cp-ledger" aria-label="Ringkasan hasil optimasi">
    <div class="cp-ledger-grid">
      <div class="cp-ledger-cell">
        <div class="cp-ledger-label">Total Long Weekend</div>
        <div class="cp-ledger-number cp-serif">
          {{ hasOfficialData ? planMetrics.totalLongWeekendDays : 0 }}
          <span class="cp-ledger-unit">hari</span>
        </div>
        <div class="cp-ledger-meta">
          {{ planMetrics.totalOffDaysInYear }} hari libur dalam setahun
        </div>
      </div>

      <div class="cp-ledger-cell">
        <div class="cp-ledger-label">Cuti Saran Dipakai</div>
        <div class="cp-ledger-number cp-serif">
          {{ selectedCutiUsed }}
          <span class="cp-ledger-unit">/ {{ stats.availableForExtraLeave }} hari</span>
        </div>
        <div class="cp-ledger-meta">
          <template v-if="stats.cutiBersamaDeducted > 0">
            +{{ stats.cutiBersamaDeducted }} cuti bersama terpotong
          </template>
          <template v-else>
            Sisa {{ Math.max(0, stats.availableForExtraLeave - selectedCutiUsed) }} hari bebas
          </template>
        </div>
      </div>

      <div class="cp-ledger-cell">
        <div class="cp-ledger-label">Libur Terpanjang</div>
        <div class="cp-ledger-number cp-serif">
          {{ planMetrics.longestStreak }}
          <span class="cp-ledger-unit">hari</span>
        </div>
        <div class="cp-ledger-meta">
          Dari {{ selectedPlansCount }} paket cuti terpilih
        </div>
      </div>

      <div class="cp-ledger-cell">
        <div class="cp-ledger-label">Rasio Efisiensi</div>
        <div class="cp-ledger-number cp-serif">{{ averageEfficiency }}&times;</div>
        <div class="cp-ledger-meta">
          {{ stats.totalLiburNasional }} nasional &middot; {{ stats.totalCutiBersama }} cuti bersama
        </div>
      </div>
    </div>

    <div class="cp-ledger-actions">
      <span class="cp-ledger-hint">
        Ekspor jadwal ke Google/Apple Calendar atau bagikan tautan pengaturan ini.
      </span>
      <div class="cp-ledger-buttons">
        <NButton
          size="small"
          type="primary"
          :disabled="!hasOfficialData || selectedPlansCount === 0"
          @click="emit('download-ics')"
        >
          <template #icon><Download :size="14" /></template>
          Unduh .ics ({{ selectedCutiUsed }} hari)
        </NButton>
        <NButton
          size="small"
          secondary
          :type="copied ? 'success' : 'default'"
          @click="emit('copy-link')"
        >
          <template #icon>
            <Check v-if="copied" :size="14" />
            <Share2 v-else :size="14" />
          </template>
          {{ copied ? 'Link Tersalin' : 'Salin Link' }}
        </NButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cp-ledger {
  overflow: hidden;
}

.cp-ledger-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cp-ledger-cell {
  padding: 14px 16px;
  border-bottom: 1px solid var(--cp-border);
  border-right: 1px solid var(--cp-border);
}

.cp-ledger-cell:nth-child(2n) {
  border-right: none;
}

.cp-ledger-label {
  font-family: var(--cp-font-mono);
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cp-text-muted);
}

.cp-ledger-number {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--cp-text);
}

.cp-ledger-unit {
  font-family: var(--cp-font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--cp-text-muted);
}

.cp-ledger-meta {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--cp-text-muted);
}

.cp-ledger-actions {
  padding: 12px 16px;
  background: var(--cp-surface-muted);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.cp-ledger-hint {
  font-size: 11.5px;
  color: var(--cp-text-muted);
}

.cp-ledger-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cp-ledger-buttons > :first-child {
  flex: 1;
}
</style>
