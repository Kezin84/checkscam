import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'CHECK LỪA ĐẢO: Tra cứu Shop Việt tại Philippines & Danh sách lừa đảo' }
  },
  {
    path: '/shops/:id?',
    name: 'shops',
    component: () => import('@/views/TrustedShopsView.vue'),
    meta: { title: 'Shop uy tín tại Philippines — CHECK LỪA ĐẢO' }
  },
  {
    path: '/alerts/:id?',
    name: 'alerts',
    component: () => import('@/views/AlertsView.vue'),
    meta: { title: 'Danh sách lừa đảo cộng đồng Việt tại Philippines — CHECK LỪA ĐẢO' }
  },
  {
    path: '/report',
    name: 'report',
    component: () => import('@/views/SubmitReportView.vue'),
    meta: { title: 'Gửi hồ sơ tố cáo lừa đảo — CHECK LỪA ĐẢO' }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { title: 'Quản trị hệ thống — CHECK LỪA ĐẢO' }
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
