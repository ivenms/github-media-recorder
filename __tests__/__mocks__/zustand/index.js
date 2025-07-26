// Simple Zustand mock that actually works with React Testing Library
const React = require('react');

// Create a functional Zustand mock
const create = (stateCreatorOrConfig) => {
  // Handle curried pattern: create<T>()(stateCreator)
  if (typeof stateCreatorOrConfig === 'undefined' || 
      (typeof stateCreatorOrConfig === 'function' && stateCreatorOrConfig.length === 0)) {
    // Return a function that accepts the actual state creator
    return (stateCreator) => createStore(stateCreator);
  }
  
  // Direct usage: create<T>(stateCreator)
  return createStore(stateCreatorOrConfig);
};

function createStore(stateCreator) {
  let state;
  const listeners = new Set();

  const setState = (updater) => {
    const prevState = state;
    const nextState = typeof updater === 'function' ? updater(prevState) : updater;
    state = { ...prevState, ...nextState };
    
    // Notify all listeners
    listeners.forEach(listener => {
      try {
        listener(state, prevState);
      } catch (error) {
        // Ignore listener errors
      }
    });
  };

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const destroy = () => {
    listeners.clear();
  };

  const api = { setState, getState, subscribe, destroy };

  // Initialize state
  state = stateCreator(setState, getState, api);

  // Create the hook that works with renderHook
  const useStore = (selector) => {
    // Simple approach that works with React Testing Library
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    
    React.useEffect(() => {
      return subscribe(() => {
        forceUpdate();
      });
    }, []);
    
    const currentState = getState();
    return selector ? selector(currentState) : currentState;
  };

  // Attach store methods for testing
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;
  useStore.destroy = destroy;

  return useStore;
};

// Mock persist middleware
const persist = (stateCreator, options = {}) => {
  return (set, get, api) => {
    // Wrap set to handle persistence
    const wrappedSet = (updater) => {
      set(updater);
      
      // Mock localStorage persistence
      if (options.name && typeof localStorage !== 'undefined') {
        try {
          const state = get();
          const stateToSave = options.partialize ? options.partialize(state) : state;
          localStorage.setItem(options.name, JSON.stringify({ state: stateToSave, version: 0 }));
        } catch (error) {
          // Ignore persistence errors in tests
        }
      }
    };

    // Get initial state
    const initialState = stateCreator(wrappedSet, get, api);

    // Try to restore from localStorage
    if (options.name && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(options.name);
        if (stored) {
          const { state: persistedState } = JSON.parse(stored);
          if (persistedState && typeof persistedState === 'object') {
            return { ...initialState, ...persistedState };
          }
        }
      } catch (error) {
        // Return initial state on error
      }
    }

    return initialState;
  };
};

// Mock other middleware
const devtools = (fn) => fn;
const subscribeWithSelector = (fn) => fn;
const combine = (stores) => stores;
const shallow = (a, b) => a === b;

// Test utilities
const zustandTestUtils = {
  clearAllStores: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  },

  getStoreState: (store) => store.getState(),
  setStoreState: (store, state) => store.setState(state),

  mockPersistence: (storeName, state) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storeName, JSON.stringify({ state, version: 0 }));
    }
  },

  clearPersistence: (storeName) => {
    if (typeof localStorage !== 'undefined') {
      if (storeName) {
        localStorage.removeItem(storeName);
      } else {
        localStorage.clear();
      }
    }
  },
};

// Export everything
module.exports = {
  create,
  persist,
  devtools,
  subscribeWithSelector,
  combine,
  shallow,
  zustandTestUtils,
  default: create
};