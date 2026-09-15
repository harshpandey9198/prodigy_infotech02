const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.json');

// ─── Default DB structure ────────────────────────
const DEFAULT_DB = {
  admins: [],
  employees: [],
  _meta: { nextAdminId: 1, nextEmployeeId: 1 },
};

// ─── Read / Write helpers ────────────────────────
function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading database:', err.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Public API ──────────────────────────────────

/** Initialize the database — create file, seed admin & sample data */
function initializeDB() {
  let db = readDB();
  let changed = false;

  // Seed default admin if none exists
  if (db.admins.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Admin@123', salt);
    db.admins.push({
      id: db._meta.nextAdminId++,
      username: 'admin',
      email: 'admin@prodigy.com',
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    });
    changed = true;
    console.log('✅ Default admin created — username: admin, password: Admin@123');
  }

  // Seed sample employees if empty
  if (db.employees.length === 0) {
    const samples = [
      ['Rahul', 'Sharma', 'rahul.sharma@prodigy.com', '9876543210', 'Engineering', 'Software Engineer', 75000, '2024-01-15'],
      ['Priya', 'Patel', 'priya.patel@prodigy.com', '9876543211', 'Marketing', 'Marketing Manager', 85000, '2023-06-20'],
      ['Amit', 'Kumar', 'amit.kumar@prodigy.com', '9876543212', 'Human Resources', 'HR Executive', 55000, '2024-03-10'],
      ['Sneha', 'Reddy', 'sneha.reddy@prodigy.com', '9876543213', 'Finance', 'Financial Analyst', 70000, '2023-11-05'],
      ['Vikram', 'Singh', 'vikram.singh@prodigy.com', '9876543214', 'Engineering', 'Senior Developer', 95000, '2022-08-25'],
    ];

    const now = new Date().toISOString();
    for (const [first_name, last_name, email, phone, department, designation, salary, date_of_joining] of samples) {
      db.employees.push({
        id: db._meta.nextEmployeeId++,
        first_name,
        last_name,
        email,
        phone,
        department,
        designation,
        salary,
        date_of_joining,
        created_at: now,
        updated_at: now,
      });
    }
    changed = true;
    console.log('✅ 5 sample employees seeded');
  }

  if (changed) writeDB(db);
  console.log('✅ Database initialized successfully');
}

// ─── Admin queries ───────────────────────────────
function findAdminByUsername(username) {
  const db = readDB();
  return db.admins.find((a) => a.username === username) || null;
}

// ─── Employee queries ────────────────────────────
function getAllEmployees({ page = 1, limit = 10, search = '' } = {}) {
  const db = readDB();
  let filtered = db.employees;

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.first_name.toLowerCase().includes(s) ||
        e.last_name.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s) ||
        e.department.toLowerCase().includes(s) ||
        e.designation.toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  // Sort by id descending (newest first)
  filtered.sort((a, b) => b.id - a.id);
  const offset = (page - 1) * limit;
  const employees = filtered.slice(offset, offset + limit);

  return {
    employees,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

function getEmployeeById(id) {
  const db = readDB();
  return db.employees.find((e) => e.id === id) || null;
}

function getEmployeeByEmail(email, excludeId = null) {
  const db = readDB();
  return db.employees.find((e) => e.email === email && e.id !== excludeId) || null;
}

function createEmployee(data) {
  const db = readDB();
  const now = new Date().toISOString();
  const employee = {
    id: db._meta.nextEmployeeId++,
    ...data,
    created_at: now,
    updated_at: now,
  };
  db.employees.push(employee);
  writeDB(db);
  return employee;
}

function updateEmployee(id, data) {
  const db = readDB();
  const idx = db.employees.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  db.employees[idx] = {
    ...db.employees[idx],
    ...data,
    id, // preserve id
    updated_at: new Date().toISOString(),
  };
  writeDB(db);
  return db.employees[idx];
}

function deleteEmployee(id) {
  const db = readDB();
  const idx = db.employees.findIndex((e) => e.id === id);
  if (idx === -1) return false;

  db.employees.splice(idx, 1);
  writeDB(db);
  return true;
}

function getStats() {
  const db = readDB();
  const employees = db.employees;
  const totalEmployees = employees.length;
  const departments = new Set(employees.map((e) => e.department)).size;
  const avgSalary = totalEmployees > 0 ? Math.round(employees.reduce((s, e) => s + e.salary, 0) / totalEmployees) : 0;

  const deptCount = {};
  employees.forEach((e) => {
    deptCount[e.department] = (deptCount[e.department] || 0) + 1;
  });
  const departmentBreakdown = Object.entries(deptCount)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  return { totalEmployees, departments, avgSalary, departmentBreakdown };
}

module.exports = {
  initializeDB,
  findAdminByUsername,
  getAllEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getStats,
};
