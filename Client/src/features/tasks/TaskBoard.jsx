import React, { useState, useEffect, useCallback } from 'react';
import { tasksApi, projectsApi } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { KanbanBoard } from '../../components/ui/KanbanBoard';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Plus, Pencil } from 'lucide-react';

export const TaskBoard = () => {
  const { addToast } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes] = await Promise.allSettled([
        tasksApi.list({ limit: 100 }),
        projectsApi.list({ limit: 100 }),
      ]);
      setTasks(tRes.status === 'fulfilled' ? tRes.value.data : []);
      setProjects(pRes.status === 'fulfilled' ? pRes.value.data : []);
    } catch (e) {
      addToast({ title: 'Error', message: 'Failed to load tasks', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setProjectId(editingTask.projectId || '');
      setPriority(editingTask.priority || 'medium');
      setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setProjectId(projects[0]?.id || '');
      setPriority('medium');
      setDueDate('');
    }
  }, [editingTask, projects]);

  const columns = [
    { key: 'todo', label: 'TODO' },
    { key: 'in_progress', label: 'IN PROGRESS' },
    { key: 'review', label: 'REVIEW' },
    { key: 'done', label: 'DONE' },
  ];

  const handleTaskStatusMove = async (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      await tasksApi.changeStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      addToast({
        title: 'Task updated',
        message: `"${task.title}" → ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
        type: 'success',
      });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast({ title: 'Validation', message: 'Task title is required', type: 'error' });
      return;
    }
    setFormLoading(true);
    try {
      await tasksApi.create(projectId, {
        title: title.trim(),
        description: description.trim(),
        projectId,
        priority,
        dueDate: dueDate || undefined,
      });
      addToast({ title: 'Task created', message: `"${title}" added.`, type: 'success' });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      fetchData();
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setFormLoading(true);
    try {
      await tasksApi.update(editingTask.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
      });
      addToast({ title: 'Task updated', message: `"${title}" saved.`, type: 'success' });
      setEditingTask(null);
      fetchData();
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const TaskForm = ({ isEdit = false }) => (
    <form onSubmit={isEdit ? handleEditTask : handleCreateTask} className="space-y-4">
      <Input
        label="Task Title"
        placeholder="e.g. Implement API route validations"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider pl-1">
          Description
        </label>
        <textarea
          rows={3}
          className="w-full rounded-2xl border border-[#EEF1FA] bg-[#EEF1FA] text-[#16181D] text-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/40 focus:bg-white placeholder-[#8A8FA3] transition-all"
          placeholder="What needs to be done..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {!isEdit && (
        <Select
          label="Project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          options={projects.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))}
          required
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={[
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ]}
        />
        <Input
          label="Due Date"
          type="date"
          mono
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-[#EEF1FA]">
        <Button variant="secondary" onClick={() => { setIsCreateOpen(false); setEditingTask(null); }} disabled={formLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={formLoading}>
          {isEdit ? 'Save Changes' : 'Create Task'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">Tasks</h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Track work items across all projects
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          New Task
        </Button>
      </div>

      <KanbanBoard
        columns={columns}
        items={tasks}
        getItemStage={(t) => t.status}
        onItemMove={handleTaskStatusMove}
      />

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Task"
        subtitle="Add a task to a project"
      >
        <TaskForm />
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        subtitle={editingTask?.title || ''}
      >
        <TaskForm isEdit />
      </Modal>
    </div>
  );
};
