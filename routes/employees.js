const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const db = require('../db/database');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Valid departments list
const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Human Resources',
  'Finance',
  'Sales',
  'Operations',
  'Design',
  'Product',
  'Legal',
  'Support',
];

// Validation rules for employee create/update
const employeeValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('First name must contain only letters'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2–50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Last name must contain only letters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\d{10}$/).withMessage('Phone must be a 10-digit number'),
  body('department')
    .trim()
    .notEmpty().withMessage('Department is required')
    .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),
  body('designation')
    .trim()
    .notEmpty().withMessage('Designation is required')
    .isLength({ min: 2, max: 100 }).withMessage('Designation must be 2–100 characters'),
  body('salary')
    .notEmpty().withMessage('Salary is required')
    .isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
  body('date_of_joining')
    .notEmpty().withMessage('Date of joining is required')
    .isISO8601().withMessage('Invalid date format'),
];

// GET /api/employees — List all employees (with search & pagination)
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
    query('search').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = db.getAllEmployees({ page, limit, search });
    res.json(result);
  }
);

// GET /api/employees/stats — Dashboard stats
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json(stats);
});

// GET /api/employees/departments — List valid departments
router.get('/departments', (req, res) => {
  res.json({ departments: DEPARTMENTS });
});

// GET /api/employees/:id — Get single employee
router.get(
  '/:id',
  [param('id').isInt().withMessage('Employee ID must be an integer')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = db.getEmployeeById(parseInt(req.params.id));
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ employee });
  }
);

// POST /api/employees — Create employee
router.post('/', employeeValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, email, phone, department, designation, salary, date_of_joining } = req.body;

  // Check for duplicate email
  const existing = db.getEmployeeByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An employee with this email already exists' });
  }

  try {
    const employee = db.createEmployee({
      first_name, last_name, email, phone, department, designation,
      salary: parseFloat(salary), date_of_joining,
    });
    res.status(201).json({ message: 'Employee created successfully', employee });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id — Update employee
router.put(
  '/:id',
  [param('id').isInt().withMessage('Employee ID must be an integer'), ...employeeValidation],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id);
    const { first_name, last_name, email, phone, department, designation, salary, date_of_joining } = req.body;

    // Check employee exists
    const employee = db.getEmployeeById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check for duplicate email (exclude current employee)
    const existing = db.getEmployeeByEmail(email, id);
    if (existing) {
      return res.status(409).json({ error: 'Another employee with this email already exists' });
    }

    try {
      const updated = db.updateEmployee(id, {
        first_name, last_name, email, phone, department, designation,
        salary: parseFloat(salary), date_of_joining,
      });
      res.json({ message: 'Employee updated successfully', employee: updated });
    } catch (err) {
      console.error('Update employee error:', err);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  }
);

// DELETE /api/employees/:id — Delete employee
router.delete(
  '/:id',
  [param('id').isInt().withMessage('Employee ID must be an integer')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id);
    const employee = db.getEmployeeById(id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    try {
      db.deleteEmployee(id);
      res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
      console.error('Delete employee error:', err);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  }
);

module.exports = router;
