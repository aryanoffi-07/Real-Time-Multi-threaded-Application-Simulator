import { useReducer, useEffect, useCallback } from 'react';

const INITIAL_STATE = {
  threads: [], // { id, name, state, progress, totalWork, requiredResource: null, quantum: 0 }
  cores: [
    { id: 'CPU 1', threadId: null },
    { id: 'CPU 2', threadId: null },
    { id: 'CPU 3', threadId: null },
    { id: 'CPU 4', threadId: null },
  ],
  resources: {
    sem1: { value: 1, max: 1, name: 'Semaphore (Mutex)', queue: [] },
    mon1: { value: 1, max: 1, name: 'Monitor (Signal)', queue: [] }
  },
  model: 'MANY_TO_MANY', // 'ONE_TO_ONE', 'MANY_TO_ONE', 'MANY_TO_MANY'
  kernelThreads: 3, // Effective maximum cores
  isRunning: false,
  tickSpeed: 800, // ms per tick
  tickCount: 0,
  quantumLimit: 2, // Round-robin quantum
};

function simulatorReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_RUN':
      return { ...state, isRunning: !state.isRunning };
    case 'SET_SPEED':
      return { ...state, tickSpeed: action.payload };
    case 'SET_MODEL': {
      let kThreads = 4;
      if (action.payload === 'MANY_TO_ONE') kThreads = 1;
      else if (action.payload === 'MANY_TO_MANY') kThreads = 2; // configurable or fixed
      else kThreads = 4; // ONE_TO_ONE

      return { ...state, model: action.payload, kernelThreads: kThreads };
    }
    case 'ADD_THREAD': {
      const newId = `T${state.threads.length + 1}`;
      // By default, let's randomly assign some threads a need for a resource half-way
      const needsResource = Math.random() > 0.5 ? 'sem1' : null;
      
      const newThread = {
        id: newId,
        name: `Thread ${state.threads.length + 1}`,
        state: 'READY',
        progress: 0,
        totalWork: Math.floor(Math.random() * 5) + 5, // 5 to 9 ticks of work
        requiredResource: needsResource,
        resourceHoldTick: 0, // When it acquires, we track
        quantum: 0,
        arrivalTime: state.tickCount,
        turnaroundTime: 0,
        waitingTime: 0,
      };
      return { ...state, threads: [...state.threads, newThread] };
    }
    case 'ADD_MONITOR_THREAD': {
      // Special thread that specifically uses the Monitor
      const newId = `T${state.threads.length + 1}`;
      const newThread = {
        id: newId,
        name: `Monitor T${state.threads.length + 1}`,
        state: 'READY',
        progress: 0,
        totalWork: 6,
        requiredResource: 'mon1',
        quantum: 0,
        arrivalTime: state.tickCount,
        turnaroundTime: 0,
        waitingTime: 0,
      };
      return { ...state, threads: [...state.threads, newThread] };
    }
    case 'TICK': {
      let nextThreads = state.threads.map(t => ({ ...t }));
      let nextCores = state.cores.map(c => ({ ...c }));
      let nextResources = JSON.parse(JSON.stringify(state.resources)); // deep copy

      // 1. Process Currently Running Threads
      nextCores.forEach(core => {
        if (core.threadId) {
          const tIndex = nextThreads.findIndex(t => t.id === core.threadId);
          if (tIndex === -1) {
            core.threadId = null;
            return;
          }
          let t = nextThreads[tIndex];

          // Check if it requests a resource mid-way
          if (t.requiredResource && t.progress === Math.floor(t.totalWork / 2)) {
            const res = nextResources[t.requiredResource];
            if (res.value > 0) {
              // Acquire resource
              res.value -= 1;
              t.requiredResource = null; // No longer waiting, acquired
              t.holdingResource = t.requiredResource; // Track what it holds
              t.progress += 1; // Continue running
              t.quantum += 1;
            } else {
              // Block thread
              t.state = 'BLOCKED';
              core.threadId = null; // Free core
              res.queue.push(t.id);
            }
          } else {
            // Normal execution
            t.progress += 1;
            t.quantum += 1;

            if (t.progress >= t.totalWork) {
              // Terminate
              t.state = 'TERMINATED';
              core.threadId = null; // Free core
              // Release any held resources
              if (t.holdingResource) {
                const res = nextResources[t.holdingResource];
                res.value += 1;
                t.holdingResource = null;
                // If queue has threads, pop one and make it READY
                if (res.queue.length > 0) {
                  const unblockedId = res.queue.shift();
                  const unblockedT = nextThreads.find(x => x.id === unblockedId);
                  if (unblockedT) {
                    unblockedT.state = 'READY';
                    // Need to reset their resource requirements so they don't block again immediately
                    unblockedT.holdingResource = unblockedT.requiredResource;
                    unblockedT.requiredResource = null; 
                    res.value -= 1; // It immediately acquires it
                  }
                }
              }
            } else if (t.quantum >= state.quantumLimit) {
              // Preempt (Round-Robin)
              t.state = 'READY';
              t.quantum = 0;
              core.threadId = null; // Free core
            }
          }
        }
      });

      // 2. Schedule READY Threads to free cores
      // Find all ready threads
      let readyThreads = nextThreads.filter(t => t.state === 'READY');
      
      // For each available core (limited by kernelThreads model)
      for (let i = 0; i < state.kernelThreads; i++) {
        const core = nextCores[i];
        if (!core.threadId && readyThreads.length > 0) {
          const scheduledThread = readyThreads.shift(); // FCFS within ready queue
          scheduledThread.state = 'RUNNING';
          scheduledThread.quantum = 0;
          core.threadId = scheduledThread.id;
        }
      }

      // If we are strictly mapping models:
      // In M:1, kernelThreads is 1. Only Core 1 can be used.
      // Other cores remain idle.

      let nextTickCount = state.tickCount + 1;
      nextThreads = nextThreads.map(t => {
        if (t.state !== 'TERMINATED') {
          t.turnaroundTime = nextTickCount - t.arrivalTime;
        }
        // Always calculate waiting time since progress updates even on the final terminating tick
        t.waitingTime = t.turnaroundTime - t.progress;
        return t;
      });

      return {
        ...state,
        threads: nextThreads,
        cores: nextCores,
        resources: nextResources,
        tickCount: nextTickCount,
      };
    }
    case 'RESET':
      return { ...INITIAL_STATE, model: state.model, kernelThreads: state.kernelThreads };
    default:
      return state;
  }
}

export function useSimulator() {
  const [state, dispatch] = useReducer(simulatorReducer, INITIAL_STATE);

  useEffect(() => {
    let interval;
    if (state.isRunning) {
      interval = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, state.tickSpeed);
    }
    return () => clearInterval(interval);
  }, [state.isRunning, state.tickSpeed]);

  const toggleRun = useCallback(() => dispatch({ type: 'TOGGLE_RUN' }), []);
  const addThread = useCallback(() => dispatch({ type: 'ADD_THREAD' }), []);
  const addMonitorThread = useCallback(() => dispatch({ type: 'ADD_MONITOR_THREAD' }), []);
  const setModel = useCallback((model) => dispatch({ type: 'SET_MODEL', payload: model }), []);
  const setSpeed = useCallback((speed) => dispatch({ type: 'SET_SPEED', payload: speed }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const manualTick = useCallback(() => dispatch({ type: 'TICK' }), []);

  return {
    state,
    toggleRun,
    addThread,
    addMonitorThread,
    setModel,
    setSpeed,
    reset,
    manualTick
  };
}
