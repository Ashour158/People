import { Router } from 'express';
import { PayrollController } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { payrollValidators } from '../validators/payroll.validator';

const router = Router();
const controller = new PayrollController();

// Apply authentication to all routes
router.use(authenticate);

// Compensation Components
router.post('/components', validateRequest(payrollValidators.createComponent), controller.createComponent);
router.get('/components', controller.getComponents);
router.get('/components/:id', controller.getComponentById);
router.put('/components/:id', validateRequest(payrollValidators.updateComponent), controller.updateComponent);
router.delete('/components/:id', controller.deleteComponent);

// Employee Compensation
router.post('/employee-compensation', validateRequest(payrollValidators.createEmployeeCompensation), controller.createEmployeeCompensation);
router.get('/employee-compensation/:employeeId', controller.getEmployeeCompensation);
router.put('/employee-compensation/:id', validateRequest(payrollValidators.updateEmployeeCompensation), controller.updateEmployeeCompensation);

// Payroll Runs
router.post('/runs', validateRequest(payrollValidators.createPayrollRun), controller.createPayrollRun);
router.get('/runs', controller.getPayrollRuns);
router.get('/runs/:id', controller.getPayrollRunById);
router.post('/runs/:id/process', controller.processPayrollRun);
router.post('/runs/:id/finalize', controller.finalizePayrollRun);
router.post('/runs/:id/regenerate-payslips', controller.regeneratePayslips);

// Payslips
router.get('/payslips', controller.getPayslips);
router.get('/payslips/:id', controller.getPayslipById);

export default router;
