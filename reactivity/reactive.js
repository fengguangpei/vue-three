import { toRawType, isObject } from './utils.js'
import {
  mutableHandlers,
  shallowReactiveHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers.js'
import {
  mutableCollectionHandlers,
  shallowCollectionHandlers,
  readonlyCollectionHandlers,
  shallowReadonlyCollectionHandlers,
} from './.js'
// 缓存处理过的target
export const reactiveMap = new WeakMap()
export const readonlyMap = new WeakMap()
export const shallowReactiveMap = new WeakMap()
export const shallowReadonlyMap = new WeakMap()
// reactive类型
const ReactiveFlags = {
  SKIP: '__v_skip',
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadOnly',
  IS_SHALLOWED: '__v_isShallow',
  RAW: '__v_raw',
}
// 对象类型
const TargetType = {
  INVALID: 0,
  COMMON: 1,
  COLLECTION: 2,
}
function targetTypeMap(rawType) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}
function getTargetType(obj) {
  return obj[reactiveMap.SKIP] || !Object.isExtensible(obj)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(obj))
}
// reactive API
export function reactive(target) {
  if (isReadonly(target)) {
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}
// shallowReactive API
export function shallowReactive(target) {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}
// readonly API
export function readonly(target) {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  )
}
// shallowReadonly API
export function shallowReadonly(target) {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  )
}
function createReactiveObject(
  target,
  isReadonly,
  baseHandlers,
  collectionHandlers,
  proxyMap
) {
  if (!isObject(target)) {
    return target
  }
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  const proxy = new Proxy(
    target,
    // 根据target类型的不同，使用不同的handlers
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  // 缓存对象的代理
  proxyMap.set(target, proxy)
  return proxy
}
// 工具函数
export function toReactive(value) {}
export function toReadonly(value) {}
export function isReadonly(value) {}
export function isReactive(value) {}
export function isShallow(value) {}
export function isProxy(value) {}
export function toRaw(value) {}
export function markRaw(value) {}
