// 创建依赖
export const createDep = (activeEffects) => new Set(activeEffects)
// 依赖容器
export const targetMap = new WeakMap()
// 激活的副作用函数
export let activeEffect = null
// 清空副作用函数的依赖
export const cleanupEffect = (effect) => {
  const { deps } = effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect)
  }
  deps.length = 0
}
// 是否要收集依赖
export let shouldTrack = true
// 依赖栈
export const trackStack = []
// 暂停依赖收集
export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}
// 开启依赖收集
export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}
// 复位依赖收集
export function resetTracking() {
  const last = trackStack.pop()
  return last === undefined ? true : last
}
// 追踪依赖
export function track(target, type, key) {}
export function trackEffects(dep, info) {}
// 触发依赖更新
export function trigger(target, type, key, newVal, oldVal, oldTarget) {}
export function triggerEffects(dep, info) {}
export function triggerEffect(effect, info) {}
