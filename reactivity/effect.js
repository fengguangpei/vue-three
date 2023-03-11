// 副作用函数

import { activeEffect, cleanupEffect, shouldTrack } from './dep'

/**
 * options: {
 *  lazy: boolean,
 *  scheduler
 *  scope
 *  allowRecurse
 *  onStop
 *  onTrack
 *  onTrigger
 * }
 */
export function effect(fn, options) {
  if (fn.effect) {
    fn = fn.effect.fn
  }
  const _effect = new ReactiveEffect(fn)
  if (options) {
    extend(_effect, options)
    if (options.scope) recordEffectScope(_effect, options.scope)
  }
  if (!options || !options.lazy) {
    _effect.run()
  }
  const runner = _effect.runner.bind(_effect)
  runner.effect = _effect
  return runner
}
// 副作用函数包装
class ReactiveEffect {
  fn
  scheduler
  active = true
  deps = []
  parent
  computed
  allowRecurse
  deferStop
  onStop
  onTrack
  onTrigger
  constructor(fn, scheduler, scope) {
    this.fn = fn
    this.scheduler = scheduler
    if (scope) {
      recordEffectScope(scope, this)
    }
  }
  run() {
    if (!this.active) {
      return this.fn()
    }
    let parent = activeEffect
    let lastShouldTrack = shouldTrack
    while (parent) {
      if (parent === this) {
        return
      }
      parent = parent.parent
    }
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true
      cleanupEffect(this)
      return this.fn()
    } finally {
      activeEffect = this.parent
      shouldTrack = lastShouldTrack
      this.parent = undefined
      if (this.deferStop) {
        this.stop()
      }
    }
  }
  stop() {
    if (activeEffect === this) {
      this.deferStop = true
    } else if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}
// 暂停effect的依赖追踪
export function stop(runner) {
  return runner.effect.stop()
}
