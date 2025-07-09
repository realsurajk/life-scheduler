import React, { useState } from 'react';
import { useSchedulerStore } from '../store/schedulerStore';
import { format, addDays, subDays, isToday } from 'date-fns';
import './ScheduleDisplay.css';

const ScheduleDisplay = () => {
  const { schedule, tasks, commitments, deleteTask, deleteCommitment, completeTask, dailySettings } = useSchedulerStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const getPriorityLabel = (priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isTaskOverdue = (task) => {
    const today = new Date();
    const taskDeadline = new Date(task.originalDeadline || task.deadline);
    return taskDeadline < today;
  };

  const isTaskDueToday = (task) => {
    const today = new Date();
    const taskDeadline = new Date(task.originalDeadline || task.deadline);
    
    // Use local time instead of UTC for date comparison
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    const deadlineStr = taskDeadline.getFullYear() + '-' + 
                       String(taskDeadline.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(taskDeadline.getDate()).padStart(2, '0');
    
    const isDueToday = deadlineStr === todayStr && !isTaskOverdue(task);
    
    // Debug logging
    if (typeof window !== 'undefined') {
      console.log('Due today check:', {
        taskName: task.name,
        todayStr,
        deadlineStr,
        isOverdue: isTaskOverdue(task),
        isDueToday
      });
    }
    
    return isDueToday;
  };

  const navigateDate = (direction) => {
    setSelectedDate(prev => 
      direction === 'next' ? addDays(prev, 1) : subDays(prev, 1)
    );
  };

  const getDaySchedule = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return schedule[dateKey] || { 
      date: format(date, 'EEEE, MMMM do'), 
      tasks: [], 
      commitments: [] 
    };
  };

  // Helper: convert HH:mm to minutes since midnight
  const timeToMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Calculate middle time (mean of wake and sleep)
  const wakeMinutes = timeToMinutes(dailySettings?.wakeUpTime || '08:00');
  let sleepMinutes = timeToMinutes(dailySettings?.sleepTime || '22:00');
  // Handle sleep time past midnight
  if (sleepMinutes <= wakeMinutes) sleepMinutes += 24 * 60;
  const middleMinutes = Math.floor((wakeMinutes + sleepMinutes) / 2);

  const currentDaySchedule = getDaySchedule(selectedDate);
  const isCurrentDay = isToday(selectedDate);

  // Merge and sort all items by start time
  const getStartMinutes = (item) => {
    const [h, m] = (item.startTime || '00:00').split(':').map(Number);
    return h * 60 + m;
  };
  const tasksWithType = currentDaySchedule.tasks.map(t => ({ ...t, _type: 'task' }));
  const commitmentsWithType = currentDaySchedule.commitments.map(c => ({ ...c, _type: 'commitment' }));
  const allItems = [...tasksWithType, ...commitmentsWithType].sort((a, b) => getStartMinutes(a) - getStartMinutes(b));

  // Split into two columns
  const leftCol = allItems.filter(item => getStartMinutes(item) < middleMinutes);
  const rightCol = allItems.filter(item => getStartMinutes(item) >= middleMinutes);

  return (
    <div className="schedule-display">
      {/* Navigation */}
      <div className="schedule-navigation">
        <button onClick={() => navigateDate('prev')} className="nav-btn">
          ← Previous
        </button>
        <h2 className="current-date">
          {format(selectedDate, 'EEEE, MMMM do, yyyy')}
          {isCurrentDay && <span className="today-badge">Today</span>}
        </h2>
        <button onClick={() => navigateDate('next')} className="nav-btn">
          Next →
        </button>
      </div>

      {/* Daily Schedule - Two Columns or One Column if Empty */}
      <div className="daily-schedule">
        {(leftCol.length === 0 && rightCol.length === 0) ? (
          <div className="schedule-timeline one-column">
            <div className="schedule-col">
              <div className="empty-schedule">
                <p>No tasks or commitments scheduled for this day.</p>
                <p>Add some tasks and commitments to see your schedule here!</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="schedule-timeline two-columns">
            {/* Left Column */}
            <div className="schedule-col left-col">
              {leftCol.map((item, index) => (
                item._type === 'task' ? (
                  <div 
                    key={`task-${item.id}-${index}`} 
                    className={`schedule-item task ${isTaskOverdue(item) ? 'overdue' : ''} ${isTaskDueToday(item) ? 'due-today' : ''}`}
                    style={{
                      ...(isTaskDueToday(item) && { border: '2px solid orange' })
                    }}
                  >
                    <div className="time-slot">
                      <span className="start-time">{item.startTime}</span>
                      <span className="end-time">{item.endTime}</span>
                    </div>
                    <div className="item-content">
                      <h4 className="item-title">{item.name}</h4>
                      <div className="item-details">
                        <span className="duration">{formatDuration(item.duration)}</span>
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(item.priority) }}
                        >
                          {getPriorityLabel(item.priority)}
                        </span>
                        {item.isPartial && (
                          <span className="partial-badge">Partial</span>
                        )}
                        {isTaskOverdue(item) && (
                          <span className="overdue-badge">Overdue</span>
                        )}
                        {(() => {
                          const dueToday = isTaskDueToday(item);
                          return dueToday ? <span className="due-today-badge">Due Today</span> : null;
                        })()}
                      </div>
                      <div className="task-deadline">
                        <span className="deadline-label">Due:</span>
                        <span className="deadline-time">
                          {(() => {
                            try {
                              const deadlineDate = new Date(item.originalDeadline || item.deadline);
                              if (isNaN(deadlineDate.getTime())) {
                                return 'Invalid date';
                              }
                              return format(deadlineDate, 'MMM do, yyyy HH:mm');
                            } catch (error) {
                              return 'Invalid date';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => completeTask(item.id)}
                        className="complete-btn"
                        title="Mark as complete"
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => deleteTask(item.id)}
                        className="delete-btn"
                        title="Delete task"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={`commitment-${index}`} className="schedule-item commitment">
                    <div className="time-slot">
                      <span className="start-time">{item.startTime}</span>
                      <span className="end-time">{item.endTime}</span>
                    </div>
                    <div className="item-content">
                      <h4 className="item-title">{item.name}</h4>
                      <span className="item-type">Fixed Commitment</span>
                    </div>
                    <button 
                      onClick={() => deleteCommitment(item.id)}
                      className="delete-btn"
                      title="Delete commitment"
                    >
                      ×
                    </button>
                  </div>
                )
              ))}
            </div>
            {/* Right Column */}
            <div className="schedule-col right-col">
              {rightCol.map((item, index) => (
                item._type === 'task' ? (
                  <div 
                    key={`task-${item.id}-${index}`} 
                    className={`schedule-item task ${isTaskOverdue(item) ? 'overdue' : ''} ${isTaskDueToday(item) ? 'due-today' : ''}`}
                    style={{
                      ...(isTaskDueToday(item) && { border: '2px solid orange' })
                    }}
                  >
                    <div className="time-slot">
                      <span className="start-time">{item.startTime}</span>
                      <span className="end-time">{item.endTime}</span>
                    </div>
                    <div className="item-content">
                      <h4 className="item-title">{item.name}</h4>
                      <div className="item-details">
                        <span className="duration">{formatDuration(item.duration)}</span>
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(item.priority) }}
                        >
                          {getPriorityLabel(item.priority)}
                        </span>
                        {item.isPartial && (
                          <span className="partial-badge">Partial</span>
                        )}
                        {isTaskOverdue(item) && (
                          <span className="overdue-badge">Overdue</span>
                        )}
                        {(() => {
                          const dueToday = isTaskDueToday(item);
                          return dueToday ? <span className="due-today-badge">Due Today</span> : null;
                        })()}
                      </div>
                      <div className="task-deadline">
                        <span className="deadline-label">Due:</span>
                        <span className="deadline-time">
                          {(() => {
                            try {
                              const deadlineDate = new Date(item.originalDeadline || item.deadline);
                              if (isNaN(deadlineDate.getTime())) {
                                return 'Invalid date';
                              }
                              return format(deadlineDate, 'MMM do, yyyy HH:mm');
                            } catch (error) {
                              return 'Invalid date';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => completeTask(item.id)}
                        className="complete-btn"
                        title="Mark as complete"
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => deleteTask(item.id)}
                        className="delete-btn"
                        title="Delete task"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={`commitment-${index}`} className="schedule-item commitment">
                    <div className="time-slot">
                      <span className="start-time">{item.startTime}</span>
                      <span className="end-time">{item.endTime}</span>
                    </div>
                    <div className="item-content">
                      <h4 className="item-title">{item.name}</h4>
                      <span className="item-type">Fixed Commitment</span>
                    </div>
                    <button 
                      onClick={() => deleteCommitment(item.id)}
                      className="delete-btn"
                      title="Delete commitment"
                    >
                      ×
                    </button>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unscheduled Tasks */}
      {schedule.unscheduled && schedule.unscheduled.length > 0 && (
        <div className="unscheduled-tasks">
          <h3>Unscheduled Tasks</h3>
          <div className="unscheduled-list">
            {schedule.unscheduled.map((task, index) => (
              <div key={`unscheduled-${task.id}-${index}`} className="unscheduled-item">
                <div className="unscheduled-content">
                  <h4>{task.name}</h4>
                  <div className="unscheduled-details">
                    <span>Duration: {task.duration} {task.durationUnit}</span>
                    <span>Deadline: {format(new Date(task.deadline), 'MMM do, yyyy HH:mm')}</span>
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                  <p className="unscheduled-reason">{task.reason}</p>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="delete-btn"
                  title="Delete task"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="schedule-summary">
        <div className="summary-item">
          <span className="summary-label">Total Tasks:</span>
          <span className="summary-value">{tasks.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Fixed Commitments:</span>
          <span className="summary-value">{commitments.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Scheduled Today:</span>
          <span className="summary-value">{currentDaySchedule.tasks.length}</span>
        </div>
        {schedule.unscheduled && (
          <div className="summary-item">
            <span className="summary-label">Unscheduled:</span>
            <span className="summary-value warning">{schedule.unscheduled.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleDisplay; 