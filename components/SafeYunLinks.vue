<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  links: Array,
  random: Boolean
})

const data = ref([])

onMounted(() => {
  if (props.random) {
    data.value = [...props.links].sort(() => Math.random() - 0.5)
  } else {
    data.value = [...props.links]
  }
})
</script>

<template>
  <YunLinks :links="data.length ? data : links" :random="false" />
</template>
