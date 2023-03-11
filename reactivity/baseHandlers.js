// 不可追踪的key访问
const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)
// 对象的内建key
const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    .filter((key) => key !== 'arguments' && key !== 'caller')
    .map((key) => Symbol[key])
    .filter(isSymbol)
)

// get
const createInstrumentations = createArrayInstrumentations()
function createArrayInstrumentations() {
  const instrumentations = {}
  ['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
    instrumentations[key] = function (this, ...args: unknown[]) {
      const arr = toRaw(this)
      // 因为数组的每一个元素都会影响includes、indexOf、lastIndexOf的结果
      // 所以要遍历收集依赖
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '')
      }
      // we run the method using the original args first (which may be reactive)
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })
  // instrument length-altering mutation methods to avoid length being tracked
  // which leads to infinite loops in some cases (#2137)
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      pauseTracking()
      const res = toRaw(this)[key].apply(this, args)
      resetTracking()
      return res
    }
  })
  return instrumentations
}
function hasOwnProperty(key) {
  const obj = toRaw(this)
  track(obj, TrackOpTypes.HAS, key)
  return obj.hasOwnProperty(key)
}
function createGetter(isReadOnly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadOnly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadOnly
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadOnly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      return target
    }
    const targetIsArray = isArray(target)
    if (!isReadOnly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    }
    const res = Reflect.get(target, key, receiver)
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(keys)) {
      return res
    }
    if (!isReadOnly) {
      track(target, TrackOpTypes.GET, key)
    }
    if (shallow) {
      return res
    }
    if (isRef(res)) {
      return targetIsArray && isIntegerKey(key) ? res : res.val
    }
    // 深度readonly、深度reactive
    if (isObject(res)) {
      return isReadOnly ? readonly(res) : reactive(res)
    }
    return res
  }
}
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)
// set
const set = createSetter()
const shallowSet = createSetter(true)
function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {
    let oldValue = target[key]
    if (isReadOnly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false
    }
    if (!shallow) {
      if(!isShallow(value) && !isReadOnly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if(!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
    }
    else {}
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    // 修改原型上的属性时，不通知依赖更新
    if (target === toRaw(receiver)) {
      // 新增属性
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    // 返回操作的结果
    return result
  }
}
// delete
function deleteProperty(target, key) {
  const hadKey = hasOwn(target, key)
  const oldValue = target[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}
// has
function has(target, key) {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}
// ownKeys
function ownKeys(target) {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}
export const mutableHandlers = {
  get,
  set,
  has,
  deleteProperty,
  ownKeys,
}
export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  }
}
export const shallowReactiveHandlers = extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet
  }
)
export const shallowReadonlyHandlers = extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
)