import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  terminateEmployeeSchema
} from '../validators/employee.validator';
import { uploadService } from '../services/upload.service';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  authorize(['employee.create']),
  validate(createEmployeeSchema),
  employeeController.createEmployee
);

router.get(
  '/',
  authorize(['employee.view']),
  employeeController.getEmployees
);

router.get(
  '/:id',
  authorize(['employee.view']),
  employeeController.getEmployeeById
);

router.put(
  '/:id',
  authorize(['employee.update']),
  validate(updateEmployeeSchema),
  employeeController.updateEmployee
);

router.delete(
  '/:id',
  authorize(['employee.delete']),
  employeeController.deleteEmployee
);

// Terminate employee
router.post(
  '/:id/terminate',
  authorize(['employee.terminate']),
  validate(terminateEmployeeSchema),
  employeeController.terminateEmployee
);

// Activate employee
router.post(
  '/:id/activate',
  authorize(['employee.update']),
  employeeController.activateEmployee
);

// Get employee's team
router.get(
  '/:id/team',
  authorize(['employee.view']),
  employeeController.getEmployeeTeam
);

// Employee statistics
router.get(
  '/stats/overview',
  authorize(['employee.view']),
  employeeController.getEmployeeStats
);

// Get employees by department
router.get(
  '/stats/by-department',
  authorize(['employee.view']),
  employeeController.getEmployeesByDepartment
);

// Get new joiners
router.get(
  '/stats/new-joiners',
  authorize(['employee.view']),
  employeeController.getNewJoiners
);

// Get employees on probation
router.get(
  '/stats/on-probation',
  authorize(['employee.view']),
  employeeController.getEmployeesOnProbation
);

// Search employees
router.get(
  '/search/query',
  authorize(['employee.view']),
  employeeController.searchEmployees
);

// Bulk import employees
router.post(
  '/bulk-import',
  authorize(['employee.create']),
  uploadService.csvUpload('file'),
  employeeController.bulkImportEmployees
);

// Export employees
router.get(
  '/export',
  authorize(['employee.view']),
  employeeController.exportEmployees
);

// Download import template
router.get(
  '/import-template',
  authorize(['employee.view']),
  employeeController.downloadImportTemplate
);

export default router;
