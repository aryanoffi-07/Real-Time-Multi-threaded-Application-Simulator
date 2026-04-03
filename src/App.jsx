import React, { useState } from 'react';
import { useSimulator } from './hooks/useSimulator';
import { Cpu, LayoutDashboard, Layers, Lock, Play, Pause, RotateCcw, Plus, RefreshCw, AlertOctagon, SkipForward, XCircle } from 'lucide-react';

function App() {
  const simulator = useSimulator();
  const { state, toggleRun, toggleAutoSpawn, setScheduler, addThread, setModel, setSpeed, reset, terminateThread, continueThread, rescheduleThread, dismissAlert } = simulator;
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <Cpu size={28} />
          <span>Real-Time Thread Simulator</span>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} style={{display: 'inline-block', marginRight: '4px', verticalAlign: 'middle'}}/>
            Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            <Layers size={16} style={{display: 'inline-block', marginRight: '4px', verticalAlign: 'middle'}}/>
            Thread Models
          </button>
          <button 
            className={`nav-tab ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            <Lock size={16} style={{display: 'inline-block', marginRight: '4px', verticalAlign: 'middle'}}/>
            Synchronization
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="panel" style={{flexDirection: 'row', gap: '1rem', alignItems: 'center'}}>
          <button 
            className={`btn ${state.isRunning ? 'btn-warning' : 'btn-primary'}`} 
            onClick={toggleRun}
          >
            {state.isRunning ? <Pause size={16} /> : <Play size={16} />}
            {state.isRunning ? 'Pause' : 'Start'}
          </button>
          
          <button className="btn btn-secondary" onClick={reset}>
            <RotateCcw size={16} />
            Reset State
          </button>

          {/* Emergency restart button */}
          <button
            className="btn"
            onClick={reset}
            title="Emergency Restart — clears all threads and resets the simulation immediately"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              color: '#fff',
              border: '2px solid #ef4444',
              boxShadow: '0 0 12px rgba(239,68,68,0.5)',
              fontWeight: 700,
              letterSpacing: '0.03em',
              animation: 'pulse-red 2s infinite',
            }}
          >
            <AlertOctagon size={16} />
            Emergency Restart
          </button>
          
          <button className="btn btn-success" onClick={addThread}>
            <Plus size={16} />
            Add User Thread
          </button>

          <button 
            className={`btn ${state.autoSpawn ? 'btn-success' : 'btn-secondary'}`} 
            onClick={toggleAutoSpawn}
            style={{marginLeft: '0.5rem'}}
          >
            Auto Spawn: {state.autoSpawn ? 'ON' : 'OFF'}
          </button>

          <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <label style={{fontSize: '0.9rem'}}>Scheduler:</label>
            <select 
              value={state.scheduler} 
              onChange={(e) => setScheduler(e.target.value)}
              style={{padding: '0.4rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)'}}
            >
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="EDF">Real-Time (EDF)</option>
            </select>

            <label style={{fontSize: '0.9rem'}}>Speed:</label>
            <select 
              value={state.tickSpeed} 
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{padding: '0.4rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)'}}
            >
              <option value={1500}>Slow</option>
              <option value={800}>Normal</option>
              <option value={200}>Fast</option>
            </select>
          </div>
        </div>

        {activeTab === 'dashboard' && <DashboardView state={state} terminateThread={terminateThread} continueThread={continueThread} rescheduleThread={rescheduleThread} />}
        {activeTab === 'models' && <ModelsView state={state} setModel={setModel} />}
        {activeTab === 'sync' && <SyncView state={state} addMonitorThread={simulator.addMonitorThread} />}
      </div>

      {/* Deadline Alert Modal */}
      {state.deadlineAlerts.length > 0 && (
        <DeadlineAlertModal
          threadId={state.deadlineAlerts[0]}
          thread={state.threads.find(t => t.id === state.deadlineAlerts[0])}
          tickCount={state.tickCount}
          onTerminate={() => { terminateThread(state.deadlineAlerts[0]); dismissAlert(state.deadlineAlerts[0]); }}
          onContinue={() => { continueThread(state.deadlineAlerts[0]); dismissAlert(state.deadlineAlerts[0]); }}
          onReschedule={() => { rescheduleThread(state.deadlineAlerts[0]); dismissAlert(state.deadlineAlerts[0]); }}
          onDismiss={() => dismissAlert(state.deadlineAlerts[0])}
        />
      )}
    </div>
  );
}

function DeadlineAlertModal({ threadId, thread, tickCount, onTerminate, onContinue, onReschedule, onDismiss }) {
  if (!thread) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1f2e, #0f121b)',
        border: '2px solid #ef4444',
        borderRadius: '16px',
        padding: '2.5rem',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 0 60px rgba(239,68,68,0.4), 0 24px 60px rgba(0,0,0,0.8)',
        animation: 'slideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertOctagon size={28} color="#ef4444" style={{ flexShrink: 0, animation: 'pulse-icon 1.2s infinite' }} />
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.02em' }}>
              ⚠ Deadline Missed!
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              Simulation paused — your decision is required
            </div>
          </div>
        </div>

        {/* Thread Info */}
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.6rem',
        }}>
          {[
            ['Thread', `${thread.name} (${threadId})`],
            ['State',  thread.state],
            ['Deadline Tick', thread.deadline],
            ['Current Tick',  tickCount],
            ['Progress', `${thread.progress} / ${thread.totalWork}`],
            ['Overdue By', `${tickCount - thread.deadline} tick(s)`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginTop: '2px' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Choose an action:</div>

          <button onClick={onContinue} style={{
            padding: '0.75rem 1.2rem', borderRadius: '10px', border: '1px solid #3b82f6',
            background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem',
            transition: 'all 0.2s',
          }}>
            <SkipForward size={16} />
            <div>
              <div>Continue (Force-Unblock)</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>Remove from resource queue → push back to READY</div>
            </div>
          </button>

          <button onClick={onReschedule} style={{
            padding: '0.75rem 1.2rem', borderRadius: '10px', border: '1px solid #f59e0b',
            background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem',
            transition: 'all 0.2s',
          }}>
            <RefreshCw size={16} />
            <div>
              <div>Reschedule</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>Reset progress + assign a fresh deadline → back to READY</div>
            </div>
          </button>

          <button onClick={onTerminate} style={{
            padding: '0.75rem 1.2rem', borderRadius: '10px', border: '1px solid #ef4444',
            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem',
            transition: 'all 0.2s',
          }}>
            <XCircle size={16} />
            <div>
              <div>Terminate</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>Force-kill the thread, free resources, move on</div>
            </div>
          </button>

          <button onClick={onDismiss} style={{
            marginTop: '0.4rem', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: '#64748b',
            fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
          }}>
            Dismiss (keep thread as-is and resume)
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ state, terminateThread, continueThread, rescheduleThread }) {
  const readyThreads = state.threads.filter(t => t.state === 'READY');
  const runningThreads = state.threads.filter(t => t.state === 'RUNNING');
  const blockedThreads = state.threads.filter(t => t.state === 'BLOCKED');
  const termThreads = state.threads.filter(t => t.state === 'TERMINATED');

  return (
    <>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem'}}>
        <StatCard title="Ready Threads" value={readyThreads.length} color="var(--accent-blue)" glow="var(--accent-blue-glow)" />
        <StatCard title="Running Threads" value={runningThreads.length} color="var(--accent-green)" glow="var(--accent-green-glow)" />
        <StatCard title="Blocked Threads" value={blockedThreads.length} color="var(--accent-red)" glow="var(--accent-red-glow)" />
        <StatCard title="Terminated" value={termThreads.length} color="var(--text-secondary)" glow="rgba(148, 163, 184, 0.2)" />
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem'}}>
        <div className="panel">
          <div className="panel-header">
            CPU Scheduler View
            <span style={{fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)'}}>
              Active Cores: {state.kernelThreads}
            </span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {state.cores.map((core, idx) => {
              const isActiveCore = idx < state.kernelThreads;
              const runningThread = state.threads.find(t => t.id === core.threadId);
              return (
                <div 
                  key={core.id} 
                  style={{
                    padding: '1rem', 
                    borderRadius: '8px', 
                    background: isActiveCore ? 'var(--surface-highlight)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActiveCore ? 'var(--border-color)' : 'transparent'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    opacity: isActiveCore ? 1 : 0.4
                  }}
                >
                  <div style={{fontWeight: 600, width: '60px'}}>{core.id}</div>
                  
                  {runningThread ? (
                    <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: '1rem'}}>
                      <span className="thread-badge thread-state-running">{runningThread.id}</span>
                      <div className="progress-bar-container" style={{flex: 1}}>
                         <div 
                           className="progress-bar-fill" 
                           style={{width: `${(runningThread.progress / runningThread.totalWork) * 100}%`}}
                         />
                      </div>
                    </div>
                  ) : isActiveCore ? (
                    <div style={{color: 'var(--text-secondary)', fontStyle: 'italic'}}>Idle</div>
                  ) : (
                    <div style={{color: 'var(--text-secondary)'}}>Disabled by Model</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-header">
            All Threads
          </div>
          {state.threads.length === 0 ? (
            <div style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0'}}>
              No user threads spawned yet.
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              {state.threads.map(t => (
                <div key={t.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-color)'}}>
                  <div>
                    <span style={{fontWeight: 600}}>{t.id}</span>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', marginTop: '0.4rem'}}>
                      <div className="time-badge">
                        ⏱ CPU: {t.progress}/{t.totalWork}
                        <div className="time-tooltip">
                          <strong>Burst Time (Execution)</strong><br/><br/>
                          Completed Ticks: <span style={{color:'var(--accent-blue)'}}>{t.progress}</span><br/>
                          Total Required: {t.totalWork}<br/><br/>
                          <em>Displays physical CPU time utilized.</em>
                        </div>
                      </div>

                      <div className="time-badge">
                        ⏳ Wait: {t.waitingTime}
                        <div className="time-tooltip">
                          <strong>Waiting Time (Queued)</strong><br/><br/>
                          Formula: Turnaround - CPU Time<br/>
                          <span style={{color:'var(--accent-yellow)'}}>{t.turnaroundTime} - {t.progress} = {t.waitingTime} Ticks</span><br/><br/>
                          <em>Time spent sitting in the READY or BLOCKED queues waiting for resources.</em>
                        </div>
                      </div>

                      <div className="time-badge">
                        🔄 Turnaround: {t.turnaroundTime}
                        <div className="time-tooltip">
                          <strong>Turnaround Time (Total Span)</strong><br/><br/>
                          Formula: {t.state === 'TERMINATED' ? 'Termination Tick' : 'Current Tick'} - Arrival Tick<br/>
                          <span style={{color:'var(--accent-green)'}}>
                            {t.state === 'TERMINATED' ? (t.arrivalTime + t.turnaroundTime) : state.tickCount} - {t.arrivalTime} = {t.turnaroundTime} Ticks
                          </span><br/><br/>
                          <em>Total lifespan of the thread since it spawned. Freezes when TERMINATED.</em>
                        </div>
                      </div>

                      <div className="time-badge" style={{color: t.missedDeadline ? 'var(--accent-red)' : 'inherit', border: t.missedDeadline ? '1px solid var(--accent-red)' : undefined}}>
                        ⏰ Deadline: {t.deadline} {t.missedDeadline && ' (MISSED)'}
                        <div className="time-tooltip">
                          <strong>Execution Deadline</strong><br/><br/>
                          The tick count by which this thread must terminate to meet real-time constraints.<br/><br/>
                          <em>If Current Tick &gt; Deadline and the thread is not TERMINATED, it misses its deadline.</em>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-thread action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end', marginLeft: '0.5rem' }}>
                    <span className={`thread-badge thread-state-${t.state.toLowerCase()}`}>{t.state}</span>
                    {t.state !== 'TERMINATED' && (
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {/* Continue: only useful when BLOCKED */}
                        {t.state === 'BLOCKED' && (
                          <button
                            onClick={() => continueThread(t.id)}
                            title="Force-unblock this thread and push it back to READY"
                            style={{
                              padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px',
                              background: 'rgba(56,189,248,0.15)', color: 'var(--accent-blue)',
                              border: '1px solid var(--accent-blue)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}
                          >
                            <SkipForward size={11} /> Continue
                          </button>
                        )}
                        {/* Reschedule */}
                        <button
                          onClick={() => rescheduleThread(t.id)}
                          title="Reschedule: reset this thread with fresh work and a new deadline"
                          style={{
                            padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px',
                            background: 'rgba(250,204,21,0.15)', color: 'var(--accent-yellow)',
                            border: '1px solid var(--accent-yellow)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.2rem'
                          }}
                        >
                          <RefreshCw size={11} /> Reschedule
                        </button>
                        {/* Terminate */}
                        <button
                          onClick={() => terminateThread(t.id)}
                          title="Force-terminate this thread immediately"
                          style={{
                            padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px',
                            background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)',
                            border: '1px solid var(--accent-red)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.2rem'
                          }}
                        >
                          <XCircle size={11} /> Terminate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, color, glow }) {
  return (
    <div className="panel stat-card" style={{
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      borderBottom: `3px solid ${color}`
    }}>
      {glow && (
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '150px', height: '150px',
          background: `radial-gradient(circle at top right, ${glow}, transparent 70%)`,
          opacity: 0.8,
          pointerEvents: 'none'
        }}></div>
      )}
      <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', zIndex: 1}}>{title}</div>
      <div style={{fontSize: '2.8rem', fontWeight: 700, color, zIndex: 1, textShadow: `0 0 20px ${glow || 'transparent'}`}}>{value}</div>
    </div>
  );
}

function ModelsView({ state, setModel }) {
  return (
    <div className="panel" style={{flex: 1}}>
      <div className="panel-header">Multithreading Models</div>
      <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem'}}>
        Visualize how user threads map to available kernel threads.
        Currently using: <strong>{state.model.replace(/_/g, ' ')}</strong>
      </p>

      <div style={{display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start', flex: 1}}>
        <div style={{textAlign: 'center', width: '30%', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
           <h3 style={{marginBottom: '0'}}>Many-to-One</h3>
           <button 
             className={`btn ${state.model === 'MANY_TO_ONE' ? 'btn-primary' : 'btn-secondary'}`}
             onClick={() => setModel('MANY_TO_ONE')}
             style={{margin: '0 auto'}}
           >
             Select M:1 Model
           </button>
           <ModelDiagram threads={state.threads} cores={1} isActive={state.model === 'MANY_TO_ONE'} />
           <p style={{marginTop: '0', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Multiple user threads mapped to 1 kernel core. Cannot run in parallel.</p>
        </div>

        <div style={{textAlign: 'center', width: '30%', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
           <h3 style={{marginBottom: '0'}}>One-to-One</h3>
           <button 
             className={`btn ${state.model === 'ONE_TO_ONE' ? 'btn-primary' : 'btn-secondary'}`}
             onClick={() => setModel('ONE_TO_ONE')}
             style={{margin: '0 auto'}}
           >
             Select 1:1 Model
           </button>
           <ModelDiagram threads={state.threads} cores={4} isActive={state.model === 'ONE_TO_ONE'} />
           <p style={{marginTop: '0', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Each thread gets its own core. True parallelism up to hardware limits.</p>
        </div>

        <div style={{textAlign: 'center', width: '30%', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
           <h3 style={{marginBottom: '0'}}>Many-to-Many</h3>
           <button 
             className={`btn ${state.model === 'MANY_TO_MANY' ? 'btn-primary' : 'btn-secondary'}`}
             onClick={() => setModel('MANY_TO_MANY')}
             style={{margin: '0 auto'}}
           >
             Select M:N Model
           </button>
           <ModelDiagram threads={state.threads} cores={2} isActive={state.model === 'MANY_TO_MANY'} />
           <p style={{marginTop: '0', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Multiplexing many user-level threads to a smaller number of kernel threads.</p>
        </div>
      </div>
    </div>
  );
}

function ModelDiagram({ threads, cores, isActive }) {
  const displayThreads = threads.slice(0, 5); // display max 5
  return (
    <div style={{
      padding: '1.5rem', 
      border: `2px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-color)'}`,
      borderRadius: 'var(--radius-lg)',
      background: isActive ? 'rgba(88, 166, 255, 0.05)' : 'transparent',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem'
    }}>
      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center'}}>
        {displayThreads.length === 0 ? <div style={{padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '4px'}}>U-Thread</div> : 
          displayThreads.map(t => (
            <div key={t.id} style={{background: 'var(--surface-color)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
              {t.id}
            </div>
          ))
        }
      </div>

      <div style={{color: 'var(--text-secondary)'}}>↓ mapped to ↓</div>

      <div style={{display: 'flex', gap: '0.5rem'}}>
        {Array.from({length: cores}).map((_, i) => (
          <div key={i} style={{
            width: '40px', height: '40px', 
            borderRadius: '50%', background: 'var(--accent-green)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontWeight: 'bold', fontSize: '0.8rem'
          }}>
            K{i+1}
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncView({ state, addMonitorThread }) {
  return (
    <div className="panel" style={{flex: 1}}>
      <div className="panel-header" style={{alignItems: 'center'}}>
        Thread Synchronization (Semaphores & Monitors)
        <button className="btn btn-secondary" onClick={addMonitorThread}>
          Spawn Monitor Thread
        </button>
      </div>
      
      <div style={{display: 'flex', gap: '2rem', marginTop: '1rem'}}>
        {Object.entries(state.resources).map(([resId, resource]) => {
          const waitingThreads = state.threads.filter(t => resource.queue.includes(t.id));
          
          return (
            <div key={resId} style={{flex: 1, padding: '1.5rem', background: 'var(--surface-highlight)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)'}}>
              <h3 style={{color: 'var(--accent-purple)', marginBottom: '0.5rem'}}>{resource.name}</h3>
              <div style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: resource.value > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}}>
                Value: {resource.value}
              </div>
              
              <h4 style={{marginBottom: '0.5rem'}}>Waiting Queue ({waitingThreads.length})</h4>
              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', minHeight: '40px'}}>
                {waitingThreads.map(t => (
                  <span key={t.id} className="thread-badge thread-state-blocked">{t.id}</span>
                ))}
                {waitingThreads.length === 0 && <span style={{color: 'var(--text-secondary)'}}>Empty</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

export default App;
