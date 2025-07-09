import React, { useState, useEffect } from 'react';
import { useSchedulerStore } from '../store/schedulerStore';
import './TaskForm.css';

const TaskForm = () => {
  const { addTask } = useSchedulerStore();
  
  // Helper function to get today at 11:59 PM in datetime-local format
  const getDefaultDeadline = () => {
    const today = new Date();
    today.setHours(23, 59, 0, 0); // Set to 11:59 PM
    
    // Format for datetime-local input using local time
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    durationUnit: 'hours',
    deadline: getDefaultDeadline(),
    priority: 'medium',
    recurrence: 'none',
    recurrenceDays: []
  });

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = e.target.checked;
      setFormData(prev => ({
        ...prev,
        recurrenceDays: checked 
          ? [...prev.recurrenceDays, value]
          : prev.recurrenceDays.filter(day => day !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.duration || !formData.deadline) {
      alert('Please fill in all required fields');
      return;
    }

    const task = {
      name: formData.name,
      duration: parseFloat(formData.duration),
      durationUnit: formData.durationUnit,
      deadline: formData.deadline,
      priority: formData.priority,
      recurrence: formData.recurrence,
      recurrenceDays: formData.recurrence === 'weekly' ? formData.recurrenceDays : []
    };

    addTask(task);
    
    // Reset form
    setFormData({
      name: '',
      duration: '',
      durationUnit: 'hours',
      deadline: getDefaultDeadline(),
      priority: 'medium',
      recurrence: 'none',
      recurrenceDays: []
    });
  };

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label htmlFor="name">Task Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter task name"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="duration">Duration *</label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            min="0.25"
            step="0.25"
            placeholder="1.5"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="durationUnit">Unit</label>
          <select
            id="durationUnit"
            name="durationUnit"
            value={formData.durationUnit}
            onChange={handleInputChange}
          >
            <option value="hours">Hours</option>
            <option value="minutes">Minutes</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="deadline">Deadline *</label>
        <input
          type="datetime-local"
          id="deadline"
          name="deadline"
          value={formData.deadline}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleInputChange}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="recurrence">Recurrence</label>
        <select
          id="recurrence"
          name="recurrence"
          value={formData.recurrence}
          onChange={handleInputChange}
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {formData.recurrence === 'weekly' && (
        <div className="form-group">
          <label>Days of Week</label>
          <div className="checkbox-group">
            {daysOfWeek.map(day => (
              <label key={day.value} className="checkbox-label">
                <input
                  type="checkbox"
                  value={day.value}
                  checked={formData.recurrenceDays.includes(day.value)}
                  onChange={handleInputChange}
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="submit-btn">
        Add Task
      </button>
    </form>
  );
};

export default TaskForm; 