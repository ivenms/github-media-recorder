// Zustand mock for testing
import { useState, useEffect } from 'react';

// Type definitions
type StateCreator<T> = (
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  get: () => T,
  api: StoreApi<T>
) => T;

type StoreApi<T> = {
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  getState: () => T;
  subscribe: (listener: (state: T) => void) => () => void;
  destroy: () => void;
};

// Global registry to track store instances
const storeRegistry = new Map<string, any>();
let storeCounter = 0;

// Mock store implementation that works with React Testing Library
const createMockStore = <T>(initializer: StateCreator<T>): StoreApi<T> & (() => T) => {
  const storeId = `store-${++storeCounter}`;
  let state: T;
  const listeners = new Set<(state: T) => void>();

  const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...nextState };
    
    // Store the latest state in the registry
    storeRegistry.set(storeId, state);
    
    // Notify all listeners synchronously for testing
    listeners.forEach((listener) => listener(state));
  };

  const getState = () => state;

  const subscribe = (listener: (state: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const destroy = () => {
    listeners.clear();
    storeRegistry.delete(storeId);
  };

  const api: StoreApi<T> = {
    setState,
    getState,
    subscribe,
    destroy,
  };

  // Initialize state
  state = initializer(setState, getState, api);
  storeRegistry.set(storeId, state);

  // Return a function that can be called as a hook and has store methods
  // This uses React state to trigger rerenders when the store updates
  const useStore = ((selector?: (state: T) => any) => {
    const [, forceUpdate] = useState({});
    
    useEffect(() => {
      const unsubscribe = subscribe(() => {
        // Force a rerender when store state changes
        forceUpdate({});
      });
      
      return unsubscribe;
    }, []);

    // Get the latest state from the registry or fallback to getState
    const currentState = storeRegistry.get(storeId) || getState();
    return selector ? selector(currentState) : currentState;
  }) as StoreApi<T> & (() => T);

  // Attach store methods
  useStore.setState = setState;
  useStore.getState = getState;
  useStore.subscribe = subscribe;
  useStore.destroy = destroy;

  return useStore;
};

// Mock create function that returns a store hook or a curried function
export const create = jest.fn(<T>() => {
  // Return a curried function that can accept middleware or store creator
  return (initializer: StateCreator<T> | any) => {
    // Handle cases where initializer might be wrapped in middleware
    if (typeof initializer === 'function') {
      return createMockStore(initializer);
    }
    
    // Direct store creation without middleware
    return createMockStore(() => initializer);
  };
});

// Mock subscribeWithSelector (for advanced store features)
export const subscribeWithSelector = (fn: any) => fn;

// Mock persist middleware
export const persist = jest.fn((config: any, options: any = {}) => {
  return (set: any, get: any, api: any) => {
    // Create a wrapper for set that handles persistence
    const wrappedSet = (updater: any) => {
      // Call the original set function first
      set(updater);
      
      // Mock persistence - save to localStorage after state update
      if (options.name) {
        try {
          const state = get();
          // Only persist properties defined in partialize if it exists
          const stateToSave = options.partialize ? options.partialize(state) : state;
          localStorage.setItem(options.name, JSON.stringify({ state: stateToSave, version: 0 }));
        } catch (error) {
          // Ignore persistence errors in tests
        }
      }
    };

    // Initialize the store with the config first
    const store = config(wrappedSet, get, api);

    // Then check for persisted state and rehydrate if necessary
    if (options.name) {
      try {
        const persisted = localStorage.getItem(options.name);
        if (persisted) {
          const { state: persistedState } = JSON.parse(persisted);
          if (persistedState && typeof persistedState === 'object') {
            // Always rehydrate persisted state in tests - let the tests control what's persisted
            set((currentState: any) => ({ ...currentState, ...persistedState }));
          }
        }
      } catch (error) {
        // Ignore persistence errors in tests
      }
    }

    return store;
  };
});

// Mock devtools middleware
export const devtools = jest.fn((fn: any, options?: any) => fn);

// Mock combine for multiple stores
export const combine = jest.fn((stores: any) => {
  return (set: any, get: any, api: any) => {
    const combinedState: any = {};
    const combinedActions: any = {};

    Object.keys(stores).forEach((key) => {
      const store = stores[key](set, get, api);
      if (typeof store === 'object' && store !== null) {
        Object.assign(combinedState, store);
      }
    });

    return {
      ...combinedState,
      ...combinedActions,
    };
  };
});

// Mock shallow for performance optimization
export const shallow = jest.fn((a: any, b: any) => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every((key) => a[key] === b[key]);
});

// Test utilities for Zustand stores
export const zustandTestUtils = {
  // Clear all mock stores
  clearAllStores: () => {
    create.mockClear();
    localStorage.clear();
    storeRegistry.clear();
    storeCounter = 0;
  },

  // Get store state for testing
  getStoreState: (store: any) => {
    return store.getState();
  },

  // Set store state for testing
  setStoreState: (store: any, state: any) => {
    store.setState(state);
  },

  // Mock persistence
  mockPersistence: (storeName: string, initialState: any) => {
    localStorage.setItem(storeName, JSON.stringify({ state: initialState, version: 0 }));
  },

  // Force rehydration for a store
  rehydrateStore: (store: any, storeName: string) => {
    try {
      const persisted = localStorage.getItem(storeName);
      if (persisted) {
        const { state: persistedState } = JSON.parse(persisted);
        if (persistedState && typeof persistedState === 'object') {
          store.setState((currentState: any) => ({ ...currentState, ...persistedState }));
        }
      }
    } catch (error) {
      // Ignore persistence errors in tests
    }
  },

  // Clear persistence
  clearPersistence: (storeName?: string) => {
    if (storeName) {
      localStorage.removeItem(storeName);
    } else {
      localStorage.clear();
    }
  },

  // Wait for store updates (no-op in sync testing)
  waitForStoreUpdate: async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  },
};

// Default export
export default {
  create,
  persist,
  devtools,
  combine,
  shallow,
  subscribeWithSelector,
};