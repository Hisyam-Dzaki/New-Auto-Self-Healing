import { useState, useEffect } from 'react'

interface Employee {
  id: string
  name: string
  role: string
  department: string
  email: string
  hire_date: string
  salary: number
}

interface Department {
  id: string
  name: string
  type: string
  budget: number
}

const API_BASE = 'http://localhost:8888/api'

export default function HR() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showAddDept, setShowAddDept] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', department: '', email: '', salary: 0 })
  const [newDept, setNewDept] = useState({ name: '', type: '', budget: 0 })

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        fetch(`${API_BASE}/company/employees`),
        fetch(`${API_BASE}/company/departments`)
      ])
      const empData = await empRes.json()
      const deptData = await deptRes.json()
      setEmployees(empData.employees || [])
      setDepartments(deptData.departments || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addEmployee = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/employees/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      })
      if (res.ok) {
        fetchData()
        setShowAddEmployee(false)
        setNewEmployee({ name: '', role: '', department: '', email: '', salary: 0 })
      }
    } catch (err) {
      console.error('Failed to add employee:', err)
    }
  }

  const addDepartment = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/departments/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDept)
      })
      if (res.ok) {
        fetchData()
        setShowAddDept(false)
        setNewDept({ name: '', type: '', budget: 0 })
      }
    } catch (err) {
      console.error('Failed to add department:', err)
    }
  }

  const isDark = theme === 'dark'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>HR Management</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Manage employees and departments</p>
      </header>

      <div className="flex gap-4">
        <button
          onClick={() => setShowAddEmployee(true)}
          className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + Add Employee
        </button>
        <button
          onClick={() => setShowAddDept(true)}
          className="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          + Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Departments</h2>
          <div className="space-y-3">
            {departments.map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div>
                  <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{dept.name}</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>${dept.budget.toLocaleString()}</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>budget</div>
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <p className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No departments</p>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Employees</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {employees.map(emp => (
              <div key={emp.id} className="p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{emp.name}</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>${emp.salary.toLocaleString()}/yr</div>
                </div>
                <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {emp.role} • {emp.department}
                </div>
                <div className="text-xs mt-1" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                  {emp.email} • Hired: {emp.hire_date}
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <p className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No employees</p>
            )}
          </div>
        </div>
      </div>

      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Add Employee</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={newEmployee.name}
                onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="text"
                placeholder="Role"
                value={newEmployee.role}
                onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="email"
                placeholder="Email"
                value={newEmployee.email}
                onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <select
                value={newEmployee.department}
                onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Salary"
                value={newEmployee.salary || ''}
                onChange={e => setNewEmployee({ ...newEmployee, salary: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <div className="flex gap-2">
                <button onClick={addEmployee} className="flex-1 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">Add</button>
                <button onClick={() => setShowAddEmployee(false)} className="flex-1 py-2 rounded-lg" style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Add Department</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Department Name"
                value={newDept.name}
                onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="text"
                placeholder="Type (e.g., engineering, sales)"
                value={newDept.type}
                onChange={e => setNewDept({ ...newDept, type: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="number"
                placeholder="Budget"
                value={newDept.budget || ''}
                onChange={e => setNewDept({ ...newDept, budget: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <div className="flex gap-2">
                <button onClick={addDepartment} className="flex-1 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600">Add</button>
                <button onClick={() => setShowAddDept(false)} className="flex-1 py-2 rounded-lg" style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}