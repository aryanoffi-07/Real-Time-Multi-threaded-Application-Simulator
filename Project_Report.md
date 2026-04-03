# Real-Time Multi-Threaded OS Simulator
## Project Report

### 1. Introduction
The Real-Time Multi-Threaded OS Simulator is a web-based educational tool built using React and Vite. It provides an interactive visualization of how an operating system manages threads, allocates CPU time, and handles synchronization. The simulator allows users to visually comprehend complex OS concepts like threading models, CPU scheduling, and resource synchronization in real-time.

### 2. Core Features & Capabilities

#### 2.1 Dashboard & Real-Time Metrics
- **Thread Lifecycle Management**: Visualizes threads moving through different states: `READY`, `RUNNING`, `BLOCKED`, and `TERMINATED`.
- **CPU Scheduling View**: Real-time representation of active CPU cores and the threads currently executing on them.
- **Performance Metrics**:
  - **Burst Time (CPU Time)**: The actual physical CPU time utilized by a thread.
  - **Waiting Time**: Time a thread spends sitting in the `READY` or `BLOCKED` queues waiting for resources (Turnaround Time - CPU Time).
  - **Turnaround Time**: Total span of time from a thread's arrival to its termination.

#### 2.2 Multithreading Models
The simulator demonstrates three fundamental multithreading models, mapping user-level threads to kernel-level cores:
- **Many-to-One (M:1)**: Multiple user threads mapped to 1 kernel core. Cannot run in parallel.
- **One-to-One (1:1)**: Each user thread gets its own core, enabling true parallelism up to the hardware limits.
- **Many-to-Many (M:N)**: Multiplexing many user-level threads to a smaller or equal number of kernel threads.

#### 2.3 Thread Synchronization
Interactive visualization of concurrency control mechanisms:
- **Semaphores & Monitors**: Visualizes shared resources and how threads queue up in "Blocked" states when resources are unavailable.
- Real-time updates showing threads claiming resources, decrementing resource values, and unblocking once resources are released.

### 3. Technology Stack
- **Frontend Framework**: React.js
- **Build Tool**: Vite
- **UI/UX**: Custom CSS, dynamic state-driven layouts, and `lucide-react` for iconography.
- **State Management**: Advanced React Hooks (`useSimulator`) to manage complex, multi-layered tick-based simulation state.

---

### 4. Slides Content Outline (PPT Preparation Guide)

You can use the following outline to directly create your presentation slides:

**Slide 1: Title Slide**
- **Title**: Real-Time Multi-Threaded OS Simulator
- **Subtitle**: Visualizing CPU Scheduling, Thread Models, and Synchronization
- **Presenter**: [Your Name]

**Slide 2: Problem Statement & Motivation**
- Abstract OS concepts are hard to visualize.
- Textbooks explain threading, but a dynamic, real-time tool is required to see how multithreading models and synchronization act in a live environment.

**Slide 3: System Overview & Architecture**
- React-based frontend providing a tick-based simulation engine.
- Configurable simulation speeds (Slow, Normal, Fast).
- Dynamic generation of User Threads and Monitor Threads.

**Slide 4: Live Feature 1 - CPU Scheduling & Lifecycle**
- Visualizing transitions between READY, RUNNING, BLOCKED, and TERMINATED.
- Explaining metrics: Turnaround Time, Waiting Time, Burst Time.

**Slide 5: Live Feature 2 - Multithreading Models**
- Explaining how the simulator dynamically maps User Threads (U-Threads) to Kernel Threads (K-Threads).
- M:1, 1:1, and M:N visualizations.

**Slide 6: Live Feature 3 - Synchronization (Semaphores / Monitors)**
- Highlighting shared resources.
- Demonstrating the waiting queue mechanics and Resource Request/Release cycles.

**Slide 7: Tech Stack & Future Scope**
- React, Vite, CSS.
- Future Scope: Adding Deadlock detection, custom scheduling algorithms (Round Robin, SJF).

**Slide 8: Conclusion / Q&A**
- Summary of the project.
- Open the floor for questions.
