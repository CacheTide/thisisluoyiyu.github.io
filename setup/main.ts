import { useHead } from '@unhead/vue'
import { computed } from 'vue'
import { defineAppSetup } from 'valaxy'

interface NoindexFrontMatter {
  noindex?: boolean | 'true' | 'false'
}

export default defineAppSetup(({ app, router }) => {
  app.runWithContext(() => {
    useHead(computed(() => ({
      meta: isNoindexEnabled(getRouteFrontmatter(router).noindex)
        ? [
            {
              name: 'robots',
              content: 'noindex, nofollow',
            },
          ]
        : [],
    })))
  })
})

function getRouteFrontmatter(router: { currentRoute?: { value?: { meta?: { frontmatter?: NoindexFrontMatter } } } }) {
  return router.currentRoute?.value?.meta?.frontmatter || {}
}

function isNoindexEnabled(value: NoindexFrontMatter['noindex']) {
  return value === true || value === 'true'
}
