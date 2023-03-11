import { ReactiveEffect, trackOpBit } from './effect'

export type Dep = Set<ReactiveEffect> & TrackedMarkers

/**
 * wasTracked and newTracked maintain the status for several levels of effect
 * tracking recursion. One bit per level is used to define whether the dependency
 * was/is tracked.
 */
// 表示依赖集合的状态
type TrackedMarkers = {
  /**
   * wasTracked
   * 已经被收集
   */
  w: number
  /**
   * newTracked
   * 新收集的
   */
  n: number
}
// 创建依赖
export const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  dep.w = 0
  dep.n = 0
  return dep
}
// 判断依赖是否收集过
export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0
// 判断是否是新的依赖
export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0
// 遍历effect的deps，标记依赖状态
export const initDepMarkers = ({ deps }: ReactiveEffect) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      // 标记已经收集
      deps[i].w |= trackOpBit // set was tracked
    }
  }
}

export const finalizeDepMarkers = (effect: ReactiveEffect) => {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i]
      // 曾经收集过但不是新的依赖，需要删除
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // clear bits
      // 清除状态
      dep.w &= ~trackOpBit
      dep.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}
