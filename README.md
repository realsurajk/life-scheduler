# SmartScheduler

A React-based intelligent task scheduling application that uses a greedy algorithm to automatically schedule tasks based on deadlines, priorities, and available time slots.

## Features

### 🎯 Core Functionality
- **Task Management**: Add tasks with name, duration, deadline, priority, and recurrence patterns
- **Commitment Tracking**: Set fixed daily/weekly commitments and daily wake/sleep times
- **Smart Scheduling**: Automatic task scheduling using a greedy algorithm that considers:
  - Task priorities (High/Medium/Low)
  - Deadlines
  - Available time slots between wake/sleep times and fixed commitments
  - Minimum 15-minute time blocks

### 📱 User Interface
- **Modern Design**: Clean, responsive interface with glassmorphism effects
- **Daily Schedule View**: Visual timeline showing scheduled tasks and commitments
- **Navigation**: Easy date navigation to view different days
- **Real-time Updates**: Schedule automatically updates when tasks or commitments change

### 💾 Data Persistence
- **Local Storage**: All data persists in browser local storage
- **State Management**: Zustand for efficient state management
- **Automatic Sync**: Changes are immediately saved and synchronized

### 🎨 Visual Features
- **Priority Color Coding**: Different colors for task priorities
- **Time Visualization**: Clear time slots with start/end times
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Interactive Elements**: Hover effects and smooth transitions

## Tech Stack

- **React 19** - Modern React with functional components and hooks
- **Zustand** - Lightweight state management
- **date-fns** - Date manipulation and formatting
- **CSS3** - Modern styling with gradients and animations
- **Local Storage** - Data persistence

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Usage

### Adding Tasks
1. Fill out the task form with:
   - **Task Name**: Descriptive name for your task
   - **Duration**: Estimated time needed (in hours or minutes)
   - **Deadline**: When the task must be completed
   - **Priority**: High, Medium, or Low
   - **Recurrence**: None, Daily, or Weekly (with specific days)

2. Click "Add Task" to schedule it automatically

### Setting Daily Schedule
1. Configure your daily routine:
   - **Wake-up Time**: When you start your day
   - **Sleep Time**: When you end your day

2. Add fixed commitments:
   - **Name**: Description of the commitment
   - **Start/End Time**: When it occurs
   - **Recurrence**: Daily or Weekly (with specific days)

### Viewing Your Schedule
- Navigate between days using the Previous/Next buttons
- View scheduled tasks and commitments in chronological order
- See unscheduled tasks that couldn't fit in your schedule
- Check the summary for quick statistics

## Scheduling Algorithm

The application uses a greedy algorithm that:

1. **Sorts Tasks**: By priority (High → Medium → Low) and deadline (earliest first)
2. **Iterates Through Days**: From today until each task's deadline
3. **Finds Available Slots**: Between wake/sleep times and fixed commitments
4. **Allocates Time**: In minimum 15-minute blocks until task duration is met
5. **Handles Conflicts**: Shows unscheduled tasks when insufficient time is available

## Example Data

### Sample Tasks
```javascript
{
  name: "Complete Project Report",
  duration: 4,
  durationUnit: "hours",
  deadline: "2024-01-15T17:00",
  priority: "high",
  recurrence: "none"
}

{
  name: "Daily Exercise",
  duration: 30,
  durationUnit: "minutes",
  deadline: "2024-01-31T20:00",
  priority: "medium",
  recurrence: "daily"
}
```

### Sample Commitments
```javascript
{
  name: "Work Hours",
  startTime: "09:00",
  endTime: "17:00",
  recurrence: "daily"
}

{
  name: "Team Meeting",
  startTime: "14:00",
  endTime: "15:00",
  recurrence: "weekly",
  days: ["monday", "wednesday", "friday"]
}
```

## File Structure

```
src/
├── components/
│   ├── TaskForm.js          # Task input form
│   ├── TaskForm.css         # Task form styling
│   ├── CommitmentForm.js    # Commitment and daily settings form
│   ├── CommitmentForm.css   # Commitment form styling
│   ├── ScheduleDisplay.js   # Schedule visualization
│   └── ScheduleDisplay.css  # Schedule styling
├── store/
│   └── schedulerStore.js    # Zustand state management
├── utils/
│   └── scheduler.js         # Scheduling algorithm
├── App.js                   # Main application component
├── App.css                  # Main application styling
└── index.js                 # Application entry point
```

## Customization

### Styling
- Modify CSS files to change colors, fonts, and layout
- Update gradient colors in `App.css` for different themes
- Adjust responsive breakpoints for different screen sizes

### Scheduling Logic
- Modify `src/utils/scheduler.js` to change the algorithm
- Adjust minimum time block size (currently 15 minutes)
- Change priority weights or sorting logic

### Features
- Add new task properties in the store and forms
- Implement drag-and-drop rescheduling
- Add export functionality (iCal, CSV)
- Integrate with external calendar APIs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React and modern web technologies
- Inspired by productivity and time management principles
- Uses date-fns for reliable date manipulation
- Zustand for efficient state management
