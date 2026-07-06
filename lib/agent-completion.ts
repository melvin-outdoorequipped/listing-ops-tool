// lib/agent-completion.ts
import { Task } from '../components/components/dashboard-utils';

function parseDateOnly(str: string | null | undefined): Date | null {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export interface DailyCompletionStats {
  agent: string;
  date: string; // YYYY-MM-DD
  completed: number;
  ongoingNotCompleted: number;
  totalConsidered: number; // denominator
  excludedPendingCount: number;
  excludedCancelledCount: number;
  completionRate: number | null; // completed / totalConsidered, or null if nothing assigned
  tasks: {
    completed: Task[];
    completedLate: Task[]; // Completed after the assigned date
    completedOnTime: Task[]; // Completed on the assigned date
    ongoingCounted: Task[];
    excludedPending: Task[];
    excludedCancelled: Task[];
  };
}

/**
 * Computes how many tasks an agent completed vs. was expected to complete,
 * based on tasks whose Date Assigned falls on targetDate.
 *
 * Rules:
 * - Completed on assigned date -> counts for and against (numerator + denominator) - ON TIME
 * - Completed after assigned date -> counts for and against, but marked as LATE
 * - Ongoing    -> counts against only (denominator) — drags the ratio down
 * - Pending    -> disregarded entirely, not part of that day's tally
 * - Cancelled  -> disregarded entirely, not part of that day's tally
 */
export function computeAgentDailyCompletion(
  tasks: Task[],
  targetDate: Date,
  agentName: string
): DailyCompletionStats {
  const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const nameLower = agentName.trim().toLowerCase();

  const assignedToday = tasks.filter(t => {
    if ((t.agent || '').trim().toLowerCase() !== nameLower) return false;
    const assignedDate = parseDateOnly(t.date_assigned);
    return assignedDate ? isSameDay(assignedDate, targetDay) : false;
  });

  const completed: Task[] = [];
  const completedLate: Task[] = [];
  const completedOnTime: Task[] = [];
  const ongoingCounted: Task[] = [];
  const excludedPending: Task[] = [];
  const excludedCancelled: Task[] = [];

  assignedToday.forEach(task => {
    const status = (task.status || '').trim().toLowerCase();

    if (status === 'completed') {
      // Check if completed after assigned date
      const assignedDate = parseDateOnly(task.date_assigned);
      const completedDate = parseDateOnly(task.date_completed);
      
      if (assignedDate && completedDate) {
        // Check if completed on the same day or later
        if (isSameDay(completedDate, targetDay)) {
          completedOnTime.push(task);
        } else if (completedDate > targetDay) {
          completedLate.push(task);
        } else {
          // Shouldn't happen, but just in case
          completedOnTime.push(task);
        }
      } else {
        // If no completion date, assume on time
        completedOnTime.push(task);
      }
      completed.push(task);
    } else if (status === 'cancelled') {
      excludedCancelled.push(task);
    } else if (status === 'pending') {
      excludedPending.push(task);
    } else {
      // Ongoing (or any other in-progress status) — counts against the ratio
      ongoingCounted.push(task);
    }
  });

  const totalConsidered = completed.length + ongoingCounted.length;

  return {
    agent: agentName,
    date: targetDay.toISOString().split('T')[0],
    completed: completed.length,
    ongoingNotCompleted: ongoingCounted.length,
    totalConsidered,
    excludedPendingCount: excludedPending.length,
    excludedCancelledCount: excludedCancelled.length,
    completionRate: totalConsidered > 0 ? completed.length / totalConsidered : null,
    tasks: { 
      completed, 
      completedLate, 
      completedOnTime, 
      ongoingCounted, 
      excludedPending, 
      excludedCancelled 
    },
  };
}

/** Computes stats for every agent who has tasks assigned that day */
export function computeAllAgentsDailyCompletion(
  tasks: Task[],
  targetDate: Date
): DailyCompletionStats[] {
  const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const agents = new Set<string>();

  tasks.forEach(t => {
    const assignedDate = parseDateOnly(t.date_assigned);
    if (t.agent && assignedDate && isSameDay(assignedDate, targetDay)) {
      agents.add(t.agent.trim());
    }
  });

  return Array.from(agents)
    .sort()
    .map(agent => computeAgentDailyCompletion(tasks, targetDate, agent));
}

/**
 * Computes stats for a single agent across a range of days (inclusive),
 * useful for a weekly/monthly history view.
 */
export function computeAgentCompletionRange(
  tasks: Task[],
  startDate: Date,
  endDate: Date,
  agentName: string
): DailyCompletionStats[] {
  const results: DailyCompletionStats[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cursor <= end) {
    results.push(computeAgentDailyCompletion(tasks, cursor, agentName));
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}