import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Task, loadTasks, saveTask } from "../services/TaskService";
import { Timestamp } from "firebase/firestore";

const TaskList: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // For adding a new task
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadTasks(user).then(ts => {
      setTasks(ts);
      setLoading(false);
    });
  }, [user]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await saveTask(user, {
      title,
      duration,
      deadline: Timestamp.fromDate(new Date(deadline)),
      priority,
    });
    setTitle("");
    setDuration(30);
    setDeadline("");
    setPriority("medium");
    // Reload tasks
    const ts = await loadTasks(user);
    setTasks(ts);
  };

  if (!user) return <div>Please log in to see your tasks.</div>;
  if (loading) return <div>Loading tasks...</div>;

  return (
    <div>
      <h2>Your Tasks</h2>
      <form onSubmit={handleAddTask} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          required
          onChange={e => setTitle(e.target.value)}
        />
        <input
          type="number"
          placeholder="Duration (min)"
          value={duration}
          min={1}
          required
          onChange={e => setDuration(Number(e.target.value))}
        />
        <input
          type="datetime-local"
          value={deadline}
          required
          onChange={e => setDeadline(e.target.value)}
        />
        <select value={priority} onChange={e => setPriority(e.target.value as any)}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button type="submit">Add Task</button>
      </form>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <strong>{task.title}</strong> ({task.duration} min) —{" "}
            {task.deadline.toDate().toLocaleString()} —{" "}
            <span style={{
              color:
                task.priority === "high"
                  ? "red"
                  : task.priority === "medium"
                  ? "orange"
                  : "green"
            }}>
              {task.priority}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList; 