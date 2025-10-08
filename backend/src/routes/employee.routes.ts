import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  createEmployeeSchema,
  updateEmployeeSchema
} from '../validators/employee.validator';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  authorize(['employee.create']),
  validate(createEmployeeSchema),
  (req, res, next) => employeeController.createEmployee(req, res, next)
);

router.get(
  '/',
  authorize(['employee.view']),
  (req, res, next) => employeeController.getEmployees(req, res, next)
);

router.get(
  '/:id',
  authorize(['employee.view']),
  (req, res, next) => employeeController.getEmployeeById(req, res, next)
);

router.put(
  '/:id',
  authorize(['employee.update']),
  validate(updateEmployeeSchema),
  (req, res, next) => employeeController.updateEmployee(req, res, next)
);

router.delete(
  '/:id',
  authorize(['employee.delete']),
  (req, res, next) => employeeController.deleteEmployee(req, res, next)
);

export default router;
