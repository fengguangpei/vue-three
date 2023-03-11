export const mutableCollectionHandlers = {
  get: createInstrumentationGetter(false, false),
}
export const shallowCollectionHandlers = {
  get: createInstrumentationGetter(false, true),
}
export const readOnlyCollectionHandlers = {
  get: createInstrumentationGetter(true, false),
}
export const shallowReadOnlyCollectionHandlers = {
  get: createInstrumentationGetter(true, true),
}
function createInstrumentationGetter(isReadOnly, shallow) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations
  return (target, key, receiver) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }
    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}
const [
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations,
] = createInstrumentations()
function createInstrumentations() {
  const mutableInstrumentations = {
    get(this, key) {
      return get(this, key)
    },
    get size() {
      return size(this)
    },
    has,
    add,
    set,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, false)
  }

  const shallowInstrumentations = {
    get(this, key) {
      return get(this, key, false, true)
    },
    get size() {
      return size(this)
    },
    has,
    add,
    set,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, true)
  }

  const readonlyInstrumentations = {
    get(this, key) {
      return get(this, key, true)
    },
    get size() {
      return size(this, true)
    },
    has(this, key) {
      return has.call(this, key, true)
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, false)
  }

  const shallowReadonlyInstrumentations = {
    get(this, key) {
      return get(this, key, true, true)
    },
    get size() {
      return size(this, true)
    },
    has(this, key) {
      return has.call(this, key, true)
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, true)
  }
  // Symbol.iterator处理for of遍历
  const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator]
  iteratorMethods.forEach(method => {
    mutableInstrumentations[method] = createIterableMethod(
      method,
      false,
      false
    )
    readonlyInstrumentations[method] = createIterableMethod(
      method,
      true,
      false
    )
    shallowInstrumentations[method] = createIterableMethod(
      method,
      false,
      true
    )
    shallowReadonlyInstrumentations[method] = createIterableMethod(
      method,
      true,
      true
    )
  })

  return [
    // reactive使用
    mutableInstrumentations,
    // readonly使用
    readonlyInstrumentations,
    // shallow使用
    shallowInstrumentations,
    // shallowReadonly使用
    shallowReadonlyInstrumentations
  ]
}
// 自定义迭代器
function createIterableMethod(
  method,
  isReadonly,
  isShallow
) {
  return function (
    this,
    ...args
  ) {
    const target = this[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const targetIsMap = isMap(rawTarget)
    const isPair =
      method === 'entries' || (method === Symbol.iterator && targetIsMap)
    const isKeyOnly = method === 'keys' && targetIsMap
    const innerIterator = target[method](...args)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly &&
      track(
        rawTarget,
        TrackOpTypes.ITERATE,
        isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
      )
    return {
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}