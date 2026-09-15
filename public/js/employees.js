/**
 * Employee CRUD — Dashboard interactions
 */

let currentPage = 1;
let searchTerm = '';
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('dashboard')) return;
  loadDashboard();
  setupEventListeners();
});

// ─── Bootstrap instances ─────────────────────────
function getEmployeeModal() {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById('employeeModal'));
}
function getDeleteModal() {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteModal'));
}

// ─── Initial Load ────────────────────────────────
function loadDashboard() {
  loadStats();
  loadEmployees();
  loadDepartments();
}

// ─── Event Listeners ─────────────────────────────
function setupEventListeners() {
  // Search with debounce
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchTerm = e.target.value.trim();
      currentPage = 1;
      loadEmployees();
    }, 300);
  });

  // Add employee button
  document.getElementById('addEmployeeBtn').addEventListener('click', () => {
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    document.getElementById('employeeModalLabel').textContent = 'Add New Employee';
    clearValidation();
    getEmployeeModal().show();
  });

  // Save employee button
  document.getElementById('saveEmployeeBtn').addEventListener('click', saveEmployee);

  // Table action buttons (event delegation)
  document.getElementById('employeeTableBody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
      editEmployee(editBtn.dataset.id);
    } else if (deleteBtn) {
      document.getElementById('deleteEmployeeId').value = deleteBtn.dataset.id;
      getDeleteModal().show();
    }
  });

  // Confirm delete
  document.getElementById('confirmDeleteBtn').addEventListener('click', deleteEmployee);

  // Allow Enter key to submit the employee form
  document.getElementById('employeeForm').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEmployee();
    }
  });
}

// ─── Load Stats ──────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/employees/stats');
    if (res.status === 401) return (window.location.href = '/');
    const data = await res.json();

    document.getElementById('totalEmployees').textContent = data.totalEmployees;
    document.getElementById('totalDepartments').textContent = data.departments;
    document.getElementById('avgSalary').textContent = formatCurrency(data.avgSalary);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// ─── Load Departments into Select ────────────────
async function loadDepartments() {
  try {
    const res = await fetch('/api/employees/departments');
    if (res.status === 401) return (window.location.href = '/');
    const data = await res.json();

    const select = document.getElementById('department');
    // Keep the first "Select Department" option
    select.innerHTML = '<option value="">Select Department</option>';
    data.departments.forEach((dept) => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load departments:', err);
  }
}

// ─── Load Employees ──────────────────────────────
async function loadEmployees() {
  try {
    const params = new URLSearchParams({ page: currentPage, limit: 10 });
    if (searchTerm) params.set('search', searchTerm);

    const res = await fetch(`/api/employees?${params}`);
    if (res.status === 401) return (window.location.href = '/');
    const data = await res.json();

    renderTable(data.employees, data.pagination);
    renderPagination(data.pagination);
  } catch (err) {
    console.error('Failed to load employees:', err);
  }
}

// ─── Render Table ────────────────────────────────
function renderTable(employees, pagination) {
  const tbody = document.getElementById('employeeTableBody');

  if (!employees || employees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            <i class="bi bi-inbox d-block"></i>
            <p>No employees found</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  const startIndex = (pagination.page - 1) * pagination.limit;

  tbody.innerHTML = employees
    .map(
      (emp, i) => `
    <tr class="fade-in">
      <td>${startIndex + i + 1}</td>
      <td><strong>${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</strong></td>
      <td>${escapeHtml(emp.email)}</td>
      <td>${escapeHtml(emp.phone)}</td>
      <td><span class="badge rounded-pill badge-dept bg-${getDeptColor(emp.department)}">${escapeHtml(emp.department)}</span></td>
      <td>${escapeHtml(emp.designation)}</td>
      <td>${formatCurrency(emp.salary)}</td>
      <td>${formatDate(emp.date_of_joining)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-warning btn-sm edit-btn" data-id="${emp.id}" title="Edit">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${emp.id}" title="Delete">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

// ─── Render Pagination ───────────────────────────
function renderPagination(pagination) {
  const ul = document.getElementById('pagination');
  const { page, totalPages } = pagination;

  if (totalPages <= 1) {
    ul.innerHTML = '';
    return;
  }

  let html = '';

  // Previous
  html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${page - 1}">‹</a></li>`;

  // Page numbers
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, page + 2);

  if (startPage > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
    if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
  }

  for (let p = startPage; p <= endPage; p++) {
    html += `<li class="page-item ${p === page ? 'active' : ''}">
      <a class="page-link" href="#" data-page="${p}">${p}</a></li>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
  }

  // Next
  html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${page + 1}">›</a></li>`;

  ul.innerHTML = html;

  // Bind click events
  ul.querySelectorAll('.page-link[data-page]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const p = parseInt(link.dataset.page);
      if (p >= 1 && p <= totalPages && p !== currentPage) {
        currentPage = p;
        loadEmployees();
      }
    });
  });
}

// ─── Edit Employee ───────────────────────────────
async function editEmployee(id) {
  try {
    const res = await fetch(`/api/employees/${id}`);
    if (res.status === 401) return (window.location.href = '/');
    if (!res.ok) return showToast('Failed to load employee', 'danger');

    const data = await res.json();
    const emp = data.employee;

    document.getElementById('employeeId').value = emp.id;
    document.getElementById('firstName').value = emp.first_name;
    document.getElementById('lastName').value = emp.last_name;
    document.getElementById('employeeEmail').value = emp.email;
    document.getElementById('phone').value = emp.phone;
    document.getElementById('department').value = emp.department;
    document.getElementById('designation').value = emp.designation;
    document.getElementById('salary').value = emp.salary;
    document.getElementById('dateOfJoining').value = emp.date_of_joining;

    document.getElementById('employeeModalLabel').textContent = 'Edit Employee';
    clearValidation();
    getEmployeeModal().show();
  } catch (err) {
    showToast('Failed to load employee details', 'danger');
  }
}

// ─── Save Employee (Create / Update) ─────────────
async function saveEmployee() {
  clearValidation();

  const employeeId = document.getElementById('employeeId').value;
  const employeeData = {
    first_name: document.getElementById('firstName').value.trim(),
    last_name: document.getElementById('lastName').value.trim(),
    email: document.getElementById('employeeEmail').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    department: document.getElementById('department').value,
    designation: document.getElementById('designation').value.trim(),
    salary: parseFloat(document.getElementById('salary').value),
    date_of_joining: document.getElementById('dateOfJoining').value,
  };

  // Client-side validation
  if (!validateEmployee(employeeData)) return;

  const saveBtn = document.getElementById('saveEmployeeBtn');
  const spinner = document.getElementById('saveSpinner');
  saveBtn.disabled = true;
  spinner.classList.remove('d-none');

  try {
    const isEdit = !!employeeId;
    const url = isEdit ? `/api/employees/${employeeId}` : '/api/employees';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });

    if (res.status === 401) return (window.location.href = '/');

    const data = await res.json();

    if (res.ok) {
      getEmployeeModal().hide();
      loadEmployees();
      loadStats();
      showToast(data.message || `Employee ${isEdit ? 'updated' : 'created'} successfully`, 'success');
    } else if (res.status === 409) {
      showFieldError('employeeEmail', 'emailError', data.error || 'Duplicate email');
    } else if (data.errors) {
      data.errors.forEach((err) => {
        const fieldMap = {
          first_name: ['firstName', 'firstNameError'],
          last_name: ['lastName', 'lastNameError'],
          email: ['employeeEmail', 'emailError'],
          phone: ['phone', 'phoneError'],
          department: ['department', 'departmentError'],
          designation: ['designation', 'designationError'],
          salary: ['salary', 'salaryError'],
          date_of_joining: ['dateOfJoining', 'dateError'],
        };
        const mapping = fieldMap[err.path];
        if (mapping) showFieldError(mapping[0], mapping[1], err.msg);
      });
    } else {
      showToast(data.error || 'Failed to save employee', 'danger');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'danger');
  } finally {
    saveBtn.disabled = false;
    spinner.classList.add('d-none');
  }
}

// ─── Delete Employee ─────────────────────────────
async function deleteEmployee() {
  const id = document.getElementById('deleteEmployeeId').value;
  const deleteBtn = document.getElementById('confirmDeleteBtn');
  deleteBtn.disabled = true;

  try {
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (res.status === 401) return (window.location.href = '/');

    const data = await res.json();

    if (res.ok) {
      getDeleteModal().hide();
      loadEmployees();
      loadStats();
      showToast(data.message || 'Employee deleted successfully', 'success');
    } else {
      showToast(data.error || 'Failed to delete employee', 'danger');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'danger');
  } finally {
    deleteBtn.disabled = false;
  }
}

// ─── Client-Side Validation ──────────────────────
function validateEmployee(data) {
  let isValid = true;

  if (!data.first_name || data.first_name.length < 2 || !/^[a-zA-Z\s]+$/.test(data.first_name)) {
    showFieldError('firstName', 'firstNameError', 'First name must be 2+ letters only');
    isValid = false;
  }
  if (!data.last_name || data.last_name.length < 2 || !/^[a-zA-Z\s]+$/.test(data.last_name)) {
    showFieldError('lastName', 'lastNameError', 'Last name must be 2+ letters only');
    isValid = false;
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    showFieldError('employeeEmail', 'emailError', 'Enter a valid email address');
    isValid = false;
  }
  if (!data.phone || !/^\d{10}$/.test(data.phone)) {
    showFieldError('phone', 'phoneError', 'Phone must be a 10-digit number');
    isValid = false;
  }
  if (!data.department) {
    showFieldError('department', 'departmentError', 'Please select a department');
    isValid = false;
  }
  if (!data.designation || data.designation.length < 2) {
    showFieldError('designation', 'designationError', 'Designation must be at least 2 characters');
    isValid = false;
  }
  if (!data.salary || isNaN(data.salary) || data.salary < 0) {
    showFieldError('salary', 'salaryError', 'Salary must be a positive number');
    isValid = false;
  }
  if (!data.date_of_joining) {
    showFieldError('dateOfJoining', 'dateError', 'Date of joining is required');
    isValid = false;
  }

  return isValid;
}

function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  if (field) field.classList.add('is-invalid');
  if (error) {
    error.textContent = message;
    error.style.display = 'block';
  }
}

function clearValidation() {
  document.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  document.querySelectorAll('.invalid-feedback').forEach((el) => {
    el.textContent = '';
    el.style.display = '';
  });
}

// ─── Toast Notification ──────────────────────────
function showToast(message, type = 'success') {
  const toastEl = document.getElementById('notificationToast');
  const toastMsg = document.getElementById('toastMessage');

  toastEl.classList.remove('bg-success', 'bg-danger');
  toastEl.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
  toastMsg.textContent = message;

  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 });
  toast.show();
}

// ─── Utilities ───────────────────────────────────
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDeptColor(dept) {
  const colors = {
    Engineering: 'primary',
    Marketing: 'success',
    'Human Resources': 'warning',
    Finance: 'info',
    Sales: 'danger',
    Operations: 'secondary',
    Design: 'primary',
    Product: 'dark',
    Legal: 'secondary',
    Support: 'info',
  };
  return colors[dept] || 'secondary';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
