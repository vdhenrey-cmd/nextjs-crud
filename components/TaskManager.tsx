'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Task = { id: number; title: string; completed: boolean; created_at: string };

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load tasks.');
      setTasks((await response.json()) as Task[]);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTasks();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadTasks]);

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    setBusy(true);
    setError('');

    try {
      const editing = editingId !== null;
      const response = await fetch(editing ? `/api/tasks/${editingId}` : '/api/tasks', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Save failed.');
      }

      setTitle('');
      setEditingId(null);
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setTitle(task.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle('');
  }

  async function toggleTask(task: Task) {
    setError('');

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (!response.ok) throw new Error('Update failed.');
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;

    setError('');

    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed.');
      if (editingId === task.id) cancelEdit();
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container">
      <div className="panel">
        <p className="eyebrow">NEXT.JS + SQLITE</p>
        <h1>Task Manager</h1>
        <p className="intro">Create, view, edit, complete, and delete tasks.</p>

        <form onSubmit={saveTask} className="taskForm">
          <input
            aria-label="Task title"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter a task title..."
            required
          />
          <button type="submit" disabled={busy}>
            {editingId === null ? 'Add Task' : 'Save Changes'}
          </button>
          {editingId !== null && (
            <button type="button" className="secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="summary">
          {tasks.length} total · {tasks.filter((task) => task.completed).length} completed
        </div>

        <ul className="taskList">
          {tasks.map((task) => (
            <li key={task.id} className="task">
              <label className="taskLabel">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => void toggleTask(task)}
                />
                <span className={task.completed ? 'done' : ''}>{task.title}</span>
              </label>

              <div className="actions">
                <button type="button" className="secondary" onClick={() => startEdit(task)}>
                  Edit
                </button>
                <button type="button" className="danger" onClick={() => void deleteTask(task)}>
                  Delete
                </button>
              </div>
            </li>
          ))}

          {tasks.length === 0 && <li className="empty">No tasks yet. Add your first task above.</li>}
        </ul>
      </div>
    </main>
  );
}
