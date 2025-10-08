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
  employeeController.createEmployee.bind(employeeController)
);

router.get(
  '/',
  authorize(['employee.view']),
  employeeController.getEmployees.bind(employeeController)
);

router.get(
  '/:id',
  authorize(['employee.view']),
  employeeController.getEmployeeById.bind(employeeController)
);

router.put(
  '/:id',
  authorize(['employee.update']),
  validate(updateEmployeeSchema),
  employeeController.updateEmployee.bind(employeeController)
);

router.delete(
  '/:id',
  authorize(['employee.delete']),
  employeeController.deleteEmployee.bind(employeeController)
);

export default router;
