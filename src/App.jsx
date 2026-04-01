import React, { useState } from 'react';
import { useSimulator } from './hooks/useSimulator';
import { Cpu, LayoutDashboard, Layers, Lock, Play, Pause, FastForward, RotateCcw, Plus } from 'lucide-react';

function App() {
  const simulator = useSimulator();
  const { state, toggleRun, addThread, setModel, setSpeed, reset } = simulator;
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
          
          <button className="btn btn-success" onClick={addThread}>
            <Plus size={16} />
            Add User Thread
          </button>

          <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem'}}>
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

        {activeTab === 'dashboard' && <DashboardView state={state} />}
        {activeTab === 'models' && <ModelsView state={state} setModel={setModel} />}
        {activeTab === 'sync' && <SyncView state={state} addMonitorThread={simulator.addMonitorThread} />}
      </div>
    </div>
  );
}

function DashboardView({ state, setModel }) {
  const readyThreads = state.threads.filter(t => t.state === 'READY');
  const runningThreads = state.threads.filter(t => t.state === 'RUNNING');
  const blockedThreads = state.threads.filter(t => t.state === 'BLOCKED');
  const termThreads = state.threads.filter(t => t.state === 'TERMINATED');

  return (
    <>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem'}}>
        <StatCard title="Ready Threads" value={readyThreads.length} color="var(--accent-blue)" />
        <StatCard title="Running Threads" value={runningThreads.length} color="var(--accent-green)" />
        <StatCard title="Blocked Threads" value={blockedThreads.length} color="var(--accent-red)" />
        <StatCard title="Terminated" value={termThreads.length} color="var(--text-secondary)" />
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

        <div className="panel" style={{maxHeight: '400px', overflowY: 'auto'}}>
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
                <div key={t.id} style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border-color)'}}>
                  <span>{t.id}</span>
                  <span className={`thread-badge thread-state-${t.state.toLowerCase()}`}>{t.state}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className="panel" style={{alignItems: 'center', justifyContent: 'center', padding: '1.5rem'}}>
      <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>{title}</div>
      <div style={{fontSize: '2.5rem', fontWeight: 700, color}}>{value}</div>
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
