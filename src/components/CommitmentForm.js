import React, { useState } from 'react';
import { useSchedulerStore } from '../store/schedulerStore';
import './CommitmentForm.css';
import ICAL from 'ical.js';

const CommitmentForm = () => {
  const { addCommitment, updateDailySettings, dailySettings, regenerateSchedule, clearAllCommitments } = useSchedulerStore();
  const [commitmentData, setCommitmentData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    recurrence: 'daily',
    days: [],
    date: '' // for one-time commitments
  });

  // --- ICS Import ---
  const handleICSImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const jcalData = ICAL.parse(text);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      const importedCommitments = [];
      const now = new Date();
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      vevents.forEach((vevent, idx) => {
        const event = new ICAL.Event(vevent);
        const name = event.summary || 'Imported Event';
        const start = event.startDate ? event.startDate.toJSDate() : null;
        const end = event.endDate ? event.endDate.toJSDate() : null;
        // Debug: log recurrence detection and iterator
        console.log(`Event[${idx}] summary:`, name);
        console.log(`Event[${idx}] isRecurring:`, event.isRecurring());
        console.log(`Event[${idx}] RRULE:`, vevent.getFirstPropertyValue('rrule'));
        console.log(`Event[${idx}] event.iterator:`, typeof event.iterator);
        debugger;
        const rrule = vevent.getFirstPropertyValue('rrule');
        if (rrule) {
          // Always expand recurring events, regardless of start/end
          let iterator;
          try {
            iterator = event.iterator();
            console.log(`Event[${idx}] iterator created for recurring event '${name}'.`);
          } catch (err) {
            console.error(`Event[${idx}] failed to create iterator for '${name}':`, err);
            return;
          }
          let count = 0;
          let next;
          let yielded = false;
          const firstFive = [];
          // Log the first 5 occurrence dates (regardless of past/future)
          let previewIterator = event.iterator();
          for (let i = 0; i < 5; i++) {
            const previewNext = previewIterator.next();
            if (!previewNext) break;
            firstFive.push(previewNext.toJSDate());
          }
          console.log(`Event[${idx}] first 5 occurrences:`, firstFive);
          // Calculate time strings from original event times
          const pad = (n) => n.toString().padStart(2, '0');
          const startTime = pad(start.getHours()) + ':' + pad(start.getMinutes());
          const endTime = pad(end.getHours()) + ':' + pad(end.getMinutes());
          
          // Now actually add future occurrences
          while ((next = iterator.next()) && count < 366) {
            yielded = true;
            const occDate = next.toJSDate();
            if (!occDate) break;
            if (occDate < now) continue;
            if (occDate > oneYearFromNow) break;
            const localDate = new Date(occDate.getTime() - occDate.getTimezoneOffset() * 60000);
            const date = localDate.toISOString().slice(0, 10);
            const commitment = {
              name,
              startTime: startTime,
              endTime: endTime,
              recurrence: 'none',
              days: [],
              date
            };
            importedCommitments.push(commitment);
            addCommitment(commitment);
            count++;
          }
          if (yielded) {
            console.log(`Expanded recurring event '${name}' to ${count} occurrences.`);
          } else {
            console.warn(`Event[${idx}] iterator for '${name}' did not yield any occurrences.`);
          }
        } else {
          // One-time event: skip if end < now
          if (!start || !end) return;
          if (end < now) return;
          // One-time event: store date as yyyy-MM-dd in local time
          const pad = (n) => n.toString().padStart(2, '0');
          const startTime = pad(start.getHours()) + ':' + pad(start.getMinutes());
          const endTime = pad(end.getHours()) + ':' + pad(end.getMinutes());
          const localDate = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
          const date = localDate.toISOString().slice(0, 10);
          const commitment = {
            name,
            startTime,
            endTime,
            recurrence: 'none',
            days: [],
            date
          };
          importedCommitments.push(commitment);
          addCommitment(commitment);
        }
      });
      console.log('ICS imported commitments:', importedCommitments);
      regenerateSchedule();
      alert('Calendar events imported as commitments!');
    } catch (err) {
      alert('Failed to parse calendar file.');
    }
    e.target.value = '';
  };
  // --- End ICS Import ---

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = e.target.checked;
      setCommitmentData(prev => ({
        ...prev,
        days: checked 
          ? [...prev.days, value]
          : prev.days.filter(day => day !== value)
      }));
    } else {
      setCommitmentData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDailySettingsChange = (e) => {
    const { name, value } = e.target;
    updateDailySettings({ [name]: value });
  };

  const handleCommitmentSubmit = (e) => {
    e.preventDefault();
    if (!commitmentData.name || !commitmentData.startTime || !commitmentData.endTime) {
      alert('Please fill in all required fields');
      return;
    }
    if (commitmentData.startTime >= commitmentData.endTime) {
      alert('End time must be after start time');
      return;
    }
    if (commitmentData.recurrence === 'none' && !commitmentData.date) {
      alert('Please select a date for one-time commitment.');
      return;
    }
    const commitment = {
      name: commitmentData.name,
      startTime: commitmentData.startTime,
      endTime: commitmentData.endTime,
      recurrence: commitmentData.recurrence,
      days: commitmentData.recurrence === 'weekly' ? commitmentData.days : [],
      date: commitmentData.recurrence === 'none' ? commitmentData.date : ''
    };
    addCommitment(commitment);
    setCommitmentData({
      name: '',
      startTime: '',
      endTime: '',
      recurrence: 'daily',
      days: [],
      date: ''
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
    <div className="commitment-form-container">
      {/* ICS Import */}
      <div className="ics-import">
        <label htmlFor="icsFile" className="ics-label">Import Calendar (.ics):</label>
        <input
          type="file"
          id="icsFile"
          accept=".ics"
          onChange={handleICSImport}
          className="ics-input"
        />
        <button 
          type="button" 
          onClick={() => {
            if (window.confirm('Are you sure you want to clear all commitments? This cannot be undone.')) {
              clearAllCommitments();
            }
          }}
          className="clear-btn"
          style={{
            background: '#ff4757',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '0.5rem',
            fontSize: '0.9rem'
          }}
        >
          Clear All Commitments
        </button>
      </div>
      {/* Daily Settings */}
      <div className="daily-settings">
        <h3>Daily Schedule</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="wakeUpTime">Wake-up Time</label>
            <input
              type="time"
              id="wakeUpTime"
              name="wakeUpTime"
              value={dailySettings.wakeUpTime}
              onChange={handleDailySettingsChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="sleepTime">Sleep Time</label>
            <input
              type="time"
              id="sleepTime"
              name="sleepTime"
              value={dailySettings.sleepTime}
              onChange={handleDailySettingsChange}
            />
          </div>
        </div>
      </div>
      {/* Fixed Commitments */}
      <div className="fixed-commitments">
        <h3>Add Fixed Commitment</h3>
        <form onSubmit={handleCommitmentSubmit} className="commitment-form">
          <div className="form-group">
            <label htmlFor="commitmentName">Commitment Name *</label>
            <input
              type="text"
              id="commitmentName"
              name="name"
              value={commitmentData.name}
              onChange={handleInputChange}
              placeholder="e.g., Work, Gym, Meeting"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={commitmentData.startTime}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={commitmentData.endTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="commitmentRecurrence">Recurrence</label>
            <select
              id="commitmentRecurrence"
              name="recurrence"
              value={commitmentData.recurrence}
              onChange={handleInputChange}
            >
              <option value="none">None (one-time)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          {commitmentData.recurrence === 'weekly' && (
            <div className="form-group">
              <label>Days of Week</label>
              <div className="checkbox-group">
                {daysOfWeek.map(day => (
                  <label key={day.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      value={day.value}
                      checked={commitmentData.days.includes(day.value)}
                      onChange={handleInputChange}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          {commitmentData.recurrence === 'none' && (
            <div className="form-group">
              <label htmlFor="commitmentDate">Date *</label>
              <input
                type="date"
                id="commitmentDate"
                name="date"
                value={commitmentData.date}
                onChange={handleInputChange}
                required
              />
            </div>
          )}
          <button type="submit" className="submit-btn">
            Add Commitment
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommitmentForm; 