import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'CheckGD: Tra cứu Shop Việt tại Philippines & Cảnh báo lừa đảo' }
  },
  {
    path: '/shops',
    name: 'shops',
    component: () => import('@/views/TrustedShopsView.vue'),
    meta: { title: 'Shop Việt đã xác minh tại Philippines — CheckGD' }
  },
  {
    path: '/alerts',
    name: 'alerts',
    component: () => import('@/views/AlertsView.vue'),
    meta: { title: 'Cảnh báo lừa đảo cộng đồng Việt tại Philippines — CheckGD' }
  },
  {
    path: '/report',
    name: 'report',
    component: () => import('@/views/SubmitReportView.vue'),
    meta: { title: 'Gửi hồ sơ tố cáo lừa đảo — CheckGD Philippines' }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { title: 'Quản trị hệ thống — CheckGD' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path && to.query.q !== from.query.q) return false
    return { top: 0 }
  }
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
})

export default router
