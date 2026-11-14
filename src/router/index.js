import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'CheckGD: Tra cứu số tài khoản ngân hàng và hồ sơ shop giao dịch' }
  },
  {
    path: '/shops',
    name: 'shops',
    component: () => import('@/views/TrustedShopsView.vue'),
    meta: { title: 'Shop đã xác minh — CheckGD' }
  },
  {
    path: '/alerts',
    name: 'alerts',
    component: () => import('@/views/AlertsView.vue'),
    meta: { title: 'Hồ sơ cảnh báo lừa đảo — CheckGD' }
  },
  {
    path: '/report',
    name: 'report',
    component: () => import('@/views/SubmitReportView.vue'),
    meta: { title: 'Gửi hồ sơ tố cáo lừa đảo — CheckGD' }
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
