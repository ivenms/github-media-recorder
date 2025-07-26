// Shared Zustand mock for inline use in test files
// This should be imported and used with jest.mock() in each test file

export const zustandMockImplementation = {
  zustand: () => ({
    create: jest.fn((stateCreatorOrConfig: any) => {
      // Handle curried pattern: create<T>()(stateCreator)
      if (!stateCreatorOrConfig || (typeof stateCreatorOrConfig === 'function' && stateCreatorOrConfig.length === 0)) {
        return (actualStateCreator: any) => {
          // Create a simple store mock
          let state: any;
          const listeners = new Set<(state: any) => void>();

          const setState = (updater: any) => {
            const nextState = typeof updater === 'function' ? updater(state) : updater;
            state = { ...state, ...nextState };
            listeners.forEach(listener => listener(state));
          };

          const getState = () => state;

          const subscribe = (listener: (state: any) => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
          };

          const api = { setState, getState, subscribe, destroy: () => { listeners.clear(); } };

          // Initialize state
          state = actualStateCreator(setState, getState, api);
          
          // Return hook function
          const useStore = (selector?: (state: any) => any) => {
            const currentState = getState();
            return selector ? selector(currentState) : currentState;
          };
          
          useStore.getState = getState;
          useStore.setState = setState;
          useStore.subscribe = subscribe;
          useStore.destroy = () => {
            listeners.clear();
          };
          
          return useStore;
        };
      }

      // Direct pattern: create<T>(stateCreator)
      const stateCreator = stateCreatorOrConfig;
      let state: any;
      const listeners = new Set<(state: any) => void>();

      const setState = (updater: any) => {
        const nextState = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...nextState };
        listeners.forEach(listener => listener(state));
      };

      const getState = () => state;
      const subscribe = (listener: (state: any) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };

      const api = { setState, getState, subscribe, destroy: () => { listeners.clear(); } };
      
      // Initialize state
      state = stateCreator(setState, getState, api);
      
      // Return hook function
      const useStore = (selector?: (state: any) => any) => {
        const currentState = getState();
        return selector ? selector(currentState) : currentState;
      };
      
      useStore.getState = getState;
      useStore.setState = setState;
      useStore.subscribe = subscribe;
      useStore.destroy = () => {
        listeners.clear();
      };
      
      return useStore;
    }),
  }),

  'zustand/middleware': () => ({
    persist: jest.fn((stateCreator: any, options: any = {}) => {
      return (set: any, get: any, api: any) => {
        // Wrap set to handle persistence
        const wrappedSet = (updater: any) => {
          set(updater);
          
          // Mock localStorage persistence (simplified for mock factory)
          if (options.name) {
            try {
              const state = get();
              const stateToSave = options.partialize ? options.partialize(state) : state;
              // Use global mock localStorage in tests
              global.localStorage?.setItem(options.name, JSON.stringify({ state: stateToSave, version: 0 }));
            } catch (error) {
              // Ignore persistence errors in tests
            }
          }
        };

        // Get initial state
        const initialState = stateCreator(wrappedSet, get, api);

        // Try to restore from localStorage
        if (options.name) {
          try {
            const stored = global.localStorage?.getItem(options.name);
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
    }),
  }),
};

// Helper function to apply mocks
export const mockZustand = () => {
  jest.mock('zustand', zustandMockImplementation.zustand);
  jest.mock('zustand/middleware', zustandMockImplementation['zustand/middleware']);
};

// Test utilities
export const zustandTestUtils = {
  clearAllStores: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  },
  
  mockPersistence: (storeName: string, state: any) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storeName, JSON.stringify({ state, version: 0 }));
    }
  },
  
  rehydrateStore: (store: any, storeName: string) => {
    try {
      const stored = localStorage.getItem(storeName);
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state) {
          store.setState((current: any) => ({ ...current, ...state }));
        }
      }
    } catch (error) {
      // Ignore errors
    }
  },
};