<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  links: {
    type: Array,
    default: () => []
  },
  random: Boolean
})

const data = ref([])

onMounted(() => {
  if (props.links && props.links.length) {
    if (props.random) {
      data.value = [...props.links].sort(() => Math.random() - 0.5)
    } else {
      data.value = [...props.links]
    }
  }
})

watch(() => props.links, (newVal) => {
  if (newVal && newVal.length && data.value.length === 0) {
    if (props.random) {
      data.value = [...newVal].sort(() => Math.random() - 0.5)
    } else {
      data.value = [...newVal]
    }
  }
})
</script>

<template>
  <YunLinks :links="data.length ? data : props.links" :random="false" />
</template>
