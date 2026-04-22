import { create, type StoreApi, type UseBoundStore } from 'zustand'

type ResettableStore = {
  reset: () => void
}

type PartialStateUpdater<T> = Partial<T> | ((state: T) => Partial<T>)

type StoreHelpers<TState extends object, TStore extends object> = {
  get: () => TStore
  initialState: TState
  set: (value: PartialStateUpdater<TStore>) => void
}

export function createResettableStore<
  TState extends object,
  TActions extends object,
>(options: {
  initialState: TState
  createActions: (
    helpers: StoreHelpers<TState, TState & TActions & ResettableStore>,
  ) => TActions
}): UseBoundStore<StoreApi<TState & TActions & ResettableStore>> {
  return create<TState & TActions & ResettableStore>((set, get) => {
    const setPartial = (
      value: PartialStateUpdater<TState & TActions & ResettableStore>,
    ) => {
      set((state) => (typeof value === 'function' ? value(state) : value))
    }

    return {
      ...options.initialState,
      ...options.createActions({
        get,
        initialState: options.initialState,
        set: setPartial,
      }),
      reset: () => set(options.initialState),
    }
  })
}
