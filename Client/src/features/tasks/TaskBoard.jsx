import React, { useState, useEffect } from 'react';
import { mockService } from '../../mock/mockService';
import { useNotification } from '../../contexts/NotificationContext';
import { KanbanBoard } from '../../components/ui/KanbanBoard';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Plus } from 'lucide-react';

export const TaskBoard = () => {
  const { addToast } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New task form state
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeName, setAssigneeName] = useState('David Chen');
  const [dueDate, setDueDate] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [tData, pData] = await Promise.all([
        mockService.getTasks(),
        mockService.getProjects(),
      ]);
      setTasks(tData);
      setProjects(pData);
      if (pData.length > 0) setProjectId(pData[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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
      await mockService.updateTaskStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      addToast({
        title: 'Task updated',
        message: `"${task.title}" status changed to ${newStatus.replace('_', ' ').toUpperCase()}`,
        type: 'success',
      });
    } catch (err) {
      addToast({ title: 'Error moving task', message: err.message, type: 'error' });
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const project = projects.find((p) => p.id === projectId);
    try {
      await mockService.createTask({
        projectId,
        projectName: project ? project.name : 'General Project',
        title,
        priority,
        assigneeName,
        dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });

      addToast({ title: 'Task created', message: `Task "${title}" added to board.`, type: 'success' });
      setIsModalOpen(false);
      setTitle('');
      fetchTasks();
    } catch (err) {
      addToast({ title: 'Error creating task', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Task Management Board
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Interactive workflow board. Move tasks via drag & drop, status menu, or keyboard navigation.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Task"
        subtitle="Add a task item to an active project"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Implement API route validations"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Select
            label="Target Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={projects.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priority Level"
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
              label="Assignee Name"
              placeholder="e.g. David Chen"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Due Date"
            type="date"
            mono
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF1FA]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
