import { format, addDays, parseISO, isBefore, isAfter } from 'date-fns';

// Convert time string (HH:MM) to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes since midnight to time string (HH:MM)
const minutesToTime = (minutes) => {
  // Handle 24-hour format properly
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Subtract occupied slots from available slots
const subtractOccupiedSlots = (availableSlots, occupiedSlots) => {
  let result = [...availableSlots];
  for (const occ of occupiedSlots) {
    const occStart = timeToMinutes(occ.start);
    const occEnd = timeToMinutes(occ.end);
    let newResult = [];
    for (const slot of result) {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      // No overlap
      if (occEnd <= slotStart || occStart >= slotEnd) {
        newResult.push(slot);
      } else {
        // Overlap: split slot if needed
        if (occStart > slotStart) {
          newResult.push({
            start: slot.start,
            end: minutesToTime(occStart),
            duration: occStart - slotStart
          });
        }
        if (occEnd < slotEnd) {
          newResult.push({
            start: minutesToTime(occEnd),
            end: slot.end,
            duration: slotEnd - occEnd
          });
        }
      }
    }
    result = newResult;
  }
  return result;
};

// Get available time slots for a given day, subtracting occupied slots
const getAvailableTimeSlots = (date, commitments, dailySettings, occupiedSlots = []) => {
  const dayOfWeek = format(date, 'EEEE').toLowerCase();
  let relevantCommitments = commitments.filter(commitment => {
    if (commitment.recurrence === 'daily') return true;
    if (commitment.recurrence === 'weekly' && commitment.days && commitment.days.includes(dayOfWeek)) return true;
    if (commitment.recurrence === 'none' && commitment.date === format(date, 'yyyy-MM-dd')) return true;
    return false;
  });
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('getAvailableTimeSlots for', format(date, 'yyyy-MM-dd'));
    console.log('  total commitments:', commitments.length);
    console.log('  relevant commitments:', relevantCommitments.length);
    console.log('  day of week:', dayOfWeek);
  }
  
  const wakeUpMinutes = timeToMinutes(dailySettings.wakeUpTime);
  let sleepMinutes = timeToMinutes(dailySettings.sleepTime);
  
  // Handle case where sleep time is before wake-up time (next day)
  if (sleepMinutes <= wakeUpMinutes) {
    sleepMinutes += 24 * 60; // Add 24 hours (1440 minutes)
  }
  
  // Debug logging for time calculations
  if (typeof window !== 'undefined') {
    console.log('  wakeUpTime:', dailySettings.wakeUpTime, '->', wakeUpMinutes, 'minutes');
    console.log('  sleepTime:', dailySettings.sleepTime, '->', sleepMinutes, 'minutes (adjusted)');
    console.log('  duration:', sleepMinutes - wakeUpMinutes, 'minutes');
  }
  
  let availableSlots = [];
  // Fallback: if no commitments, or commitments array is empty, use full day
  if (!commitments || commitments.length === 0 || relevantCommitments.length === 0) {
    availableSlots.push({
      start: minutesToTime(wakeUpMinutes),
      end: minutesToTime(sleepMinutes),
      duration: sleepMinutes - wakeUpMinutes
    });
    // Debug log
    if (typeof window !== 'undefined') {
      console.log('Fallback: using full wake-to-sleep slot for', format(date, 'yyyy-MM-dd'));
    }
  } else {
    const sortedCommitments = relevantCommitments.sort((a, b) =>
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    let currentTime = wakeUpMinutes;
    for (const commitment of sortedCommitments) {
      const commitmentStart = timeToMinutes(commitment.startTime);
      const commitmentEnd = timeToMinutes(commitment.endTime);
      if (currentTime < commitmentStart) {
        availableSlots.push({
          start: minutesToTime(currentTime),
          end: minutesToTime(commitmentStart),
          duration: commitmentStart - currentTime
        });
      }
      currentTime = Math.max(currentTime, commitmentEnd);
    }
    if (currentTime < sleepMinutes) {
      availableSlots.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(sleepMinutes),
        duration: sleepMinutes - currentTime
      });
    }
  }
  if (occupiedSlots.length > 0) {
    availableSlots = subtractOccupiedSlots(availableSlots, occupiedSlots);
  }
  return availableSlots;
};

// Sort tasks by priority and deadline
const sortTasks = (tasks) => {
  const priorityWeights = { high: 3, medium: 2, low: 1 };
  return [...tasks].sort((a, b) => {
    const priorityDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.deadline) - new Date(b.deadline);
  });
};

// Process tasks to handle completion status and persistence
const processTasks = (tasks) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  return tasks.map(task => {
    // Skip completed tasks
    if (task.completed) return null;
    
    const taskDeadline = new Date(task.deadline);
    const taskDeadlineStr = taskDeadline.toISOString().slice(0, 10);
    
    // If task is due today and not completed, extend deadline to tomorrow
    if (taskDeadlineStr === todayStr) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      return {
        ...task,
        deadline: tomorrow.toISOString(),
        originalDeadline: task.deadline // Keep original for display
      };
    }
    
    return task;
  }).filter(task => task !== null); // Remove completed tasks
};

// Convert duration to minutes
const durationToMinutes = (duration, unit) => {
  return unit === 'hours' ? duration * 60 : duration;
};

// Main scheduling algorithm
export const generateSchedule = (tasks, commitments, dailySettings) => {
  const schedule = {};
  const processedTasks = processTasks(tasks);
  const sortedTasks = sortTasks(processedTasks);
  const today = new Date();
  // For each day, keep track of occupied slots (from scheduled tasks)
  const dayOccupiedSlots = {};
  // We'll look ahead up to the latest deadline or 30 days, whichever is further
  let maxDeadline = today;
  for (const task of sortedTasks) {
    const taskDeadline = parseISO(task.deadline);
    if (taskDeadline > maxDeadline) maxDeadline = taskDeadline;
  }
  const daysToSchedule = Math.max(30, Math.ceil((maxDeadline - today) / (1000 * 60 * 60 * 24)));
  // Precompute commitments for each day
  const commitmentsByDay = {};
  for (let i = 0; i <= daysToSchedule; i++) {
    const date = addDays(today, i);
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    commitmentsByDay[dateKey] = commitments.filter(commitment => {
      if (commitment.recurrence === 'daily') return true;
      if (commitment.recurrence === 'weekly' && commitment.days && commitment.days.includes(dayOfWeek)) return true;
      if (commitment.recurrence === 'none' && commitment.date === dateKey) return true;
      return false;
    });
  }
  for (const task of sortedTasks) {
    const taskDeadline = parseISO(task.deadline);
    const taskDuration = durationToMinutes(task.duration, task.durationUnit);
    let remainingDuration = taskDuration;
    let currentDate = new Date(today);
    while (remainingDuration > 0 && isBefore(currentDate, taskDeadline)) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      if (!schedule[dateKey]) {
        schedule[dateKey] = {
          date: format(currentDate, 'EEEE, MMMM do'),
          tasks: [],
          commitments: commitmentsByDay[dateKey] || []
        };
      }
      if (!dayOccupiedSlots[dateKey]) dayOccupiedSlots[dateKey] = [];
      const availableSlots = getAvailableTimeSlots(
        currentDate,
        commitmentsByDay[dateKey] || [],
        dailySettings,
        dayOccupiedSlots[dateKey]
      );
      
      // Debug logging
      if (typeof window !== 'undefined') {
        console.log('Scheduling task', task.name, 'for', dateKey);
        console.log('  available slots:', availableSlots.length);
        console.log('  remaining duration:', remainingDuration);
      }
      
      let scheduledThisDay = false;
      for (const slot of availableSlots) {
        if (remainingDuration <= 0) break;
        const slotDuration = slot.duration;
        const timeToAllocate = Math.min(remainingDuration, slotDuration);
        
        // Debug logging for slot allocation
        if (typeof window !== 'undefined') {
          console.log('  Slot:', slot.start, '-', slot.end, 'duration:', slotDuration);
          console.log('  timeToAllocate:', timeToAllocate, 'remainingDuration:', remainingDuration);
        }
        
        if (timeToAllocate >= 15) {
          const taskSlot = {
            id: task.id,
            name: task.name,
            priority: task.priority,
            startTime: slot.start,
            endTime: minutesToTime(timeToMinutes(slot.start) + timeToAllocate),
            duration: timeToAllocate,
            isPartial: remainingDuration > timeToAllocate,
            deadline: task.deadline,
            originalDeadline: task.originalDeadline
          };
          schedule[dateKey].tasks.push(taskSlot);
          dayOccupiedSlots[dateKey].push({
            start: slot.start,
            end: taskSlot.endTime
          });
          remainingDuration -= timeToAllocate;
          scheduledThisDay = true;
        }
      }
      currentDate = addDays(currentDate, 1);
      if (!scheduledThisDay) break;
    }
    if (remainingDuration > 0) {
      if (!schedule.unscheduled) schedule.unscheduled = [];
      schedule.unscheduled.push({
        ...task,
        remainingDuration,
        reason: 'Insufficient time before deadline'
      });
    }
  }
  // Ensure commitments are present for all days in the window
  for (let i = 0; i <= daysToSchedule; i++) {
    const date = addDays(today, i);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!schedule[dateKey]) {
      schedule[dateKey] = {
        date: format(date, 'EEEE, MMMM do'),
        tasks: [],
        commitments: commitmentsByDay[dateKey] || []
      };
    }
  }
  return schedule;
};

// Helper function to get time slots for a specific day
export const getDaySchedule = (schedule, date) => {
  const dateKey = format(date, 'yyyy-MM-dd');
  return schedule[dateKey] || { date: format(date, 'EEEE, MMMM do'), tasks: [], commitments: [] };
};

// Helper function to check if a task is overdue
export const isTaskOverdue = (task) => {
  return isAfter(new Date(), parseISO(task.deadline));
}; 