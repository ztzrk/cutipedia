<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 34,
  },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="6" y="10" width="52" height="48" rx="4" fill="#FCFBF8" stroke="#1C1B18" stroke-width="4" />
    <path d="M6 14C6 11.7909 7.79086 10 10 10H54C56.2091 10 58 11.7909 58 14V23H6V14Z" fill="#B91C1C" />
    <rect x="17" y="4" width="5" height="11" rx="2" fill="#1C1B18" />
    <rect x="42" y="4" width="5" height="11" rx="2" fill="#1C1B18" />
    <rect x="14" y="31" width="10" height="10" rx="1.5" fill="#B91C1C" />
    <rect x="27" y="31" width="10" height="10" rx="1.5" fill="#1B5E3A" />
    <rect x="40" y="31" width="10" height="10" rx="1.5" fill="#D97706" />
    <line x1="14" y1="48" x2="50" y2="48" stroke="#1C1B18" stroke-width="3" stroke-linecap="round" />
  </svg>
</template>
