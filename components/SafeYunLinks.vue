<script setup>
import { computed, onMounted, ref } from 'vue'

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

// Compute the links to display, reactive to props changes.
// If random is true, we sort it only after client mount to prevent SSR mismatch.
const displayLinks = computed(() => {
  const currentLinks = props.links || []
  if (currentLinks.length === 0) {
    return []
  }

  // Perform random sort on the client to avoid SSR mismatch
  if (props.random && isClient.value) {
    return [...currentLinks].sort(() => Math.random() - 0.5)
  }
  
  return currentLinks
})

// Forces YunLinks to recreate. Valaxy's internal YunLinks does not have a watcher
// on its links prop. Without changing the key, if frontmatter is delayed on GitHub Pages,
// YunLinks will render blank when the page hydrates and never update. 
const componentKey = computed(() => {
  // Update key when data finally arrives (length > 0) AND when client mounts to randomize
  return `${isClient.value}-${displayLinks.value.length}`
})
</script>

<template>
  <YunLinks :key="componentKey" :links="displayLinks" :random="false" />
</template>
