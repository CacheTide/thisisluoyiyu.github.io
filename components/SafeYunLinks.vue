<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  links: {
    type: Array,
    default: () => []
  },
  random: Boolean
})

const isClient = ref(false)

onMounted(() => {
  isClient.value = true
})
</script>

<template>
  <!-- Only render when on client to avoid hydration mismatch with random sorting -->
  <ClientOnly>
    <YunLinks v-if="isClient" :links="links" :random="random" />
  </ClientOnly>
</template>
