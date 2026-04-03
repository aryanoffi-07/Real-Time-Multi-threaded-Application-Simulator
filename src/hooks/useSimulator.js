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
  autoSpawn: false,
  scheduler: 'ROUND_ROBIN', // 'ROUND_ROBIN' or 'EDF'
  deadlineAlerts: [], // thread IDs that just missed their deadline, awaiting user decision
};

function simulatorReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_RUN':
      return { ...state, isRunning: !state.isRunning };
    case 'SET_SPEED':
      return { ...state, tickSpeed: action.payload };
    case 'TOGGLE_AUTO_SPAWN':
      return { ...state, autoSpawn: !state.autoSpawn };
    case 'SET_SCHEDULER':
      return { ...state, scheduler: action.payload };
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
      
      const totalWork = Math.floor(Math.random() * 5) + 5; // 5 to 9 ticks of work
      const buffer = Math.floor(Math.random() * 10) + 5; // buffer of 5 to 14 ticks to finish

      const newThread = {
        id: newId,
        name: `Thread ${state.threads.length + 1}`,
        state: 'READY',
        progress: 0,
        totalWork: totalWork,
        requiredResource: needsResource,
        resourceHoldTick: 0, // When it acquires, we track
        quantum: 0,
        arrivalTime: state.tickCount,
        deadline: state.tickCount + totalWork + buffer,
        missedDeadline: false,
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

      // Randomly auto spawn threads if enabled
      if (state.autoSpawn && Math.random() < 0.08) {
        const newId = `T${nextThreads.length + 1}`;
        const needsResource = Math.random() > 0.5 ? 'sem1' : null;
        const totalWork = Math.floor(Math.random() * 5) + 5;
        const buffer = Math.floor(Math.random() * 15) + 10;
        
        nextThreads.push({
          id: newId,
          name: `Auto Thread ${newId}`,
          state: 'READY',
          progress: 0,
          totalWork: totalWork,
          requiredResource: needsResource,
          resourceHoldTick: 0,
          quantum: 0,
          arrivalTime: state.tickCount,
          deadline: state.tickCount + totalWork + buffer,
          missedDeadline: false,
          turnaroundTime: 0,
          waitingTime: 0,
        });
      }

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
              t.holdingResource = t.requiredResource; // Track what it holds FIRST
              t.requiredResource = null; // No longer waiting, acquired
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
      let readyThreads = nextThreads.filter(t => t.state === 'READY');
      
      // If EDF, explicitly sort readyThreads by deadline
      if (state.scheduler === 'EDF') {
        readyThreads.sort((a, b) => a.deadline - b.deadline);
        
        // Check for preemptions
        // In EDF, a highly critical (early deadline) ready thread can preempt a running thread
        if (readyThreads.length > 0) {
           for (let i = 0; i < state.kernelThreads; i++) {
             const core = nextCores[i];
             if (core.threadId) {
                const runningT = nextThreads.find(t => t.id === core.threadId);
                // If there's a ready thread with a strictly earlier deadline than the running thread
                if (runningT && readyThreads[0].deadline < runningT.deadline) {
                   // Preempt
                   runningT.state = 'READY';
                   runningT.quantum = 0;
                   core.threadId = null;
                   
                   // Push back into ready queue, sort again
                   readyThreads.push(runningT);
                   readyThreads.sort((a, b) => a.deadline - b.deadline);
                }
             }
           }
        }
      }

      // For each available core (limited by kernelThreads model)
      for (let i = 0; i < state.kernelThreads; i++) {
        const core = nextCores[i];
        if (!core.threadId && readyThreads.length > 0) {
          const scheduledThread = readyThreads.shift(); // FCFS or already sorted EDF
          scheduledThread.state = 'RUNNING';
          scheduledThread.quantum = 0;
          core.threadId = scheduledThread.id;
        }
      }

      // If we are strictly mapping models:
      // In M:1, kernelThreads is 1. Only Core 1 can be used.
      // Other cores remain idle.

      let nextTickCount = state.tickCount + 1;
      const newAlerts = [];
      nextThreads = nextThreads.map(t => {
        if (t.state !== 'TERMINATED') {
          t.turnaroundTime = nextTickCount - t.arrivalTime;
          // Detect the FIRST tick where deadline is crossed
          if (!t.missedDeadline && nextTickCount > t.deadline) {
            t.missedDeadline = true;
            newAlerts.push(t.id); // queue for user decision
          }
        }
        t.waitingTime = t.turnaroundTime - t.progress;
        return t;
      });

      const shouldPause = newAlerts.length > 0; // auto-pause when deadline hit

      return {
        ...state,
        threads: nextThreads,
        cores: nextCores,
        resources: nextResources,
        tickCount: nextTickCount,
        // Merge new alerts (avoid duplicates)
        deadlineAlerts: [...state.deadlineAlerts, ...newAlerts.filter(id => !state.deadlineAlerts.includes(id))],
        isRunning: shouldPause ? false : state.isRunning,
      };
    }
    case 'TERMINATE_THREAD': {
      const id = action.payload;
      const nextCores = state.cores.map(c => c.threadId === id ? { ...c, threadId: null } : { ...c });
      // Release any held resource
      let nextResources = JSON.parse(JSON.stringify(state.resources));
      const nextThreads = state.threads.map(t => {
        if (t.id !== id) return t;
        if (t.holdingResource) {
          const res = nextResources[t.holdingResource];
          res.value += 1;
          if (res.queue.length > 0) {
            const unblockedId = res.queue.shift();
            const ub = nextThreads ? nextThreads.find(x => x.id === unblockedId) : state.threads.find(x => x.id === unblockedId);
            if (ub) { ub.state = 'READY'; ub.holdingResource = t.holdingResource; ub.requiredResource = null; res.value -= 1; }
          }
        }
        // Remove from any resource queue
        Object.values(nextResources).forEach(res => {
          res.queue = res.queue.filter(qId => qId !== id);
        });
        return { ...t, state: 'TERMINATED', holdingResource: null };
      });
      return { ...state, threads: nextThreads, cores: nextCores, resources: nextResources };
    }
    case 'CONTINUE_THREAD': {
      // Unblock a BLOCKED thread — push it back to READY
      const id = action.payload;
      let nextResources = JSON.parse(JSON.stringify(state.resources));
      // Remove from resource queues
      Object.values(nextResources).forEach(res => {
        res.queue = res.queue.filter(qId => qId !== id);
      });
      const nextThreads = state.threads.map(t =>
        t.id === id && (t.state === 'BLOCKED' || t.state === 'READY')
          ? { ...t, state: 'READY', requiredResource: null, quantum: 0 }
          : t
      );
      return { ...state, threads: nextThreads, resources: nextResources };
    }
    case 'RESCHEDULE_THREAD': {
      // Reset a thread back to READY with a fresh deadline & zero progress
      const id = action.payload;
      let nextResources = JSON.parse(JSON.stringify(state.resources));
      const nextCores = state.cores.map(c => c.threadId === id ? { ...c, threadId: null } : { ...c });
      Object.values(nextResources).forEach(res => {
        res.queue = res.queue.filter(qId => qId !== id);
      });
      const nextThreads = state.threads.map(t => {
        if (t.id !== id) return t;
        const newTotalWork = Math.floor(Math.random() * 5) + 5;
        const newBuffer = Math.floor(Math.random() * 10) + 5;
        return {
          ...t,
          state: 'READY',
          progress: 0,
          totalWork: newTotalWork,
          quantum: 0,
          arrivalTime: state.tickCount,
          deadline: state.tickCount + newTotalWork + newBuffer,
          missedDeadline: false,
          holdingResource: null,
          requiredResource: t.requiredResource, // keep original resource requirement
          turnaroundTime: 0,
          waitingTime: 0,
        };
      });
      return { ...state, threads: nextThreads, cores: nextCores, resources: nextResources };
    }
    case 'RESET':
      return { ...INITIAL_STATE, model: state.model, kernelThreads: state.kernelThreads };
    case 'DISMISS_ALERT': {
      return { ...state, deadlineAlerts: state.deadlineAlerts.filter(id => id !== action.payload) };
    }
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
  const toggleAutoSpawn = useCallback(() => dispatch({ type: 'TOGGLE_AUTO_SPAWN' }), []);
  const setScheduler = useCallback((sched) => dispatch({ type: 'SET_SCHEDULER', payload: sched }), []);
  const addThread = useCallback(() => dispatch({ type: 'ADD_THREAD' }), []);
  const addMonitorThread = useCallback(() => dispatch({ type: 'ADD_MONITOR_THREAD' }), []);
  const setModel = useCallback((model) => dispatch({ type: 'SET_MODEL', payload: model }), []);
  const setSpeed = useCallback((speed) => dispatch({ type: 'SET_SPEED', payload: speed }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const manualTick = useCallback(() => dispatch({ type: 'TICK' }), []);
  const terminateThread = useCallback((id) => dispatch({ type: 'TERMINATE_THREAD', payload: id }), []);
  const continueThread  = useCallback((id) => dispatch({ type: 'CONTINUE_THREAD',  payload: id }), []);
  const rescheduleThread = useCallback((id) => dispatch({ type: 'RESCHEDULE_THREAD', payload: id }), []);
  const dismissAlert = useCallback((id) => dispatch({ type: 'DISMISS_ALERT', payload: id }), []);

  return {
    state,
    toggleRun,
    toggleAutoSpawn,
    setScheduler,
    addThread,
    addMonitorThread,
    setModel,
    setSpeed,
    reset,
    manualTick,
    terminateThread,
    continueThread,
    rescheduleThread,
    dismissAlert,
  };
}
