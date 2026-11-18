<script setup>
import { NConfigProvider, NLayout, NLayoutHeader, NLayoutContent, NCard, NTag, NSpace } from 'naive-ui'
import { Calendar } from 'lucide-vue-next'
import holidays from '@/data/holidays.json'

const availableYears = Object.keys(holidays)
</script>

<template>
  <NConfigProvider>
    <NLayout style="min-height: 100vh">
      <NLayoutHeader bordered style="padding: 16px 24px">
        <NSpace align="center" justify="space-between">
          <NSpace align="center" :size="10">
            <Calendar :size="22" />
            <strong>CutiPedia</strong>
          </NSpace>
          <NTag type="success" size="small">Fase 1 Siap</NTag>
        </NSpace>
      </NLayoutHeader>
      <NLayoutContent style="padding: 24px; max-width: 1120px; margin: 0 auto">
        <NCard title="Inisialisasi Proyek Vue 3 + Vite + Naive UI">
          <p>Data SKB 3 Menteri tersedia untuk tahun: {{ availableYears.join(', ') }}.</p>
        </NCard>
      </NLayoutContent>
    </NLayout>
  </NConfigProvider>
</template>
