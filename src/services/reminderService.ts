import { addDays } from 'date-fns';
import type { Season, Reminder, CropVariety, ReminderPriority } from '../types';

const PRIORITY_ORDER: Record<ReminderPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const generateReminderId = (): string => {
  return `reminder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const generateRemindersForSeason = (
  season: Season,
  cropVarieties: CropVariety[]
): Reminder[] => {
  const variety = cropVarieties.find((v) => v.name === season.cropName);
  if (!variety) return [];

  const sowingDate = new Date(season.sowingDate);
  const reminders: Reminder[] = [];

  for (const node of variety.keyNodes) {
    const targetDate = addDays(sowingDate, node.daysAfterSowing);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const mapPriority = (p: number): ReminderPriority => {
      if (p <= 1) return 'high';
      if (p === 2) return 'medium';
      return 'low';
    };

    reminders.push({
      id: generateReminderId(),
      seasonId: season.id,
      type: node.name,
      targetDate: targetDateStr,
      status: 'pending',
      priority: mapPriority(node.priority),
    });
  }

  return reminders;
};

export const checkAndUpdateOverdueReminders = (
  reminders: Reminder[],
  today: Date = new Date()
): Reminder[] => {
  const todayStr = today.toISOString().split('T')[0];

  return reminders.map((reminder) => {
    if (reminder.status === 'pending' && reminder.targetDate < todayStr) {
      return { ...reminder, status: 'overdue' as const };
    }
    return reminder;
  });
};

export const getSortedReminders = (reminders: Reminder[]): Reminder[] => {
  return [...reminders].sort((a, b) => {
    if (a.status !== b.status) {
      const statusOrder: Record<string, number> = {
        overdue: 0,
        pending: 1,
        completed: 2,
      };
      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    }

    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.targetDate !== b.targetDate) {
      return a.targetDate < b.targetDate ? -1 : 1;
    }

    return 0;
  });
};
