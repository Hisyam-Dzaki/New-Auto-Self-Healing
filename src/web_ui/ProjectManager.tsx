import React, { useState } from 'react';

export interface Project {
  id: string;
  name: string;
  framework: string;
  runtime: string;
  path: string;
  status: 'running' | 'stopped' | 'building';
  ports: string[];
  createdAt: string;
}

export const ProjectManager: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const createProject = async (formData: Partial<Project>) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const newProject = await res.json();
    setProjects((prev) => [...prev, newProject]);
    setShowCreate(false);
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="project-manager p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Projects</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold truncate">{project.name}</h3>
              <span className={`text-xs px-2 py-1 rounded ${
                project.status === 'running' ? 'bg-green-900 text-green-300' :
                project.status === 'building' ? 'bg-yellow-900 text-yellow-300' :
                'bg-gray-700 text-gray-400'
              }`}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              {project.framework} • {project.runtime}
            </p>
            <p className="text-xs text-gray-500 mb-3">Port: {project.ports.join(', ') || 'None'}</p>
            <div className="flex space-x-2">
              <button className="flex-1 bg-gray-700 py-1 rounded text-sm hover:bg-gray-600">
                Open
              </button>
              <button className="bg-red-900 py-1 px-3 rounded text-sm hover:bg-red-800">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};