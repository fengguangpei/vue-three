import { createDep } from './dep'
import { toReactive } from './reactive'
// ref API
export function ref(value) {
  return createRef(value)
}
// shallowRef API
export function shallowRef(value) {
  return createRef(value, true)
}
function createRef(value, shallow) {
  if (isRef(value)) {
    return value
  }
  return new RefImpl(value, shallow)
}
// Ref类
class RefImpl {
  _value
  _rawValue
  dep
  __v_isRef = true
  __v_isShallow = false
  constructor(value, shallow) {
    this._rawValue = this.__v_isShallow ? value : toRaw(value)
    this._value = this.__v_isShallow ? value : toReactive(value)
  }
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(value) {
    const useDirectValue =
      this.__v_isShallow || isShallow(value) || isReadOnly(value)
    value = useDirectValue ? value : toRaw(value)
    if (hasChanged(value, this._rawValue)) {
      this._rawValue = value
      this._value = useDirectValue ? value : toReactive(value)
      triggerRefValue(this, value)
    }
  }
}
// ref追踪依赖
function trackRefValue(ref) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref)
    trackEffects(ref.dep || (ref.dep = createDep()))
  }
}
function trackEffects(dep) {
  let shouldTrack = !dep.has(activeEffect)
  if (shouldTrack) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}
// ref触发依赖更新
function triggerRefValue(ref, newVal) {
  ref = toRaw(ref)
  if (ref.dep) {
    triggerEffects(ref.dep)
  }
}
function triggerEffects(dep) {
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect)
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect)
    }
  }
}
function triggerEffect(effect) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
// toRef
function toRef(object, key, defaultValue) {
  const val = object[key]
  return isRef(val) ? val : new ObjectRefImpl(object, key, defaultValue)
}
class ObjectRefImpl {
  __v_isRef = true
  _object
  _key
  _defaultValue
  constructor(_object, _key, _defaultValue) {
    this._object = _object
    this._key = _key
    this._defaultValue = _defaultValue
  }
  get value() {
    const val = this._object[this._key]
    return val === undefined ? this._defaultValue : val
  }
  set value(newVal) {
    this._object[this._key] = newVal
  }
}
// toRefs
export function toRefs(object) {
  const ret = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
}
// customRef API
export function customRef(factory) {
  return new CustomRefImpl(factory)
}
// customRef 实现
class CustomRefImpl {
  dep
  _get
  _set
  constructor(factory) {
    const { get, set } = factory(
      () => this.trackRefValue(this),
      () => this.triggerRefValue(this)
    )
    this._get = get
    this._set = set
  }
  get value() {
    return this._get()
  }
  set value(newVal) {
    this._set(newVal)
  }
}
// Ref工具函数
export function isRef(value) {
  return value && value.__v_isRef === true
}
export function unref(value) {
  return isRef(value) ? value.value : value
}
function toRaw(value) {}
function hasChanged() {}
