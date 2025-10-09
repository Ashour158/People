import { Router } from 'express';
import { timesheetController } from '../controllers/timesheet.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== PROJECTS ====================

router.post(
  '/projects',
  authorize(['timesheet.manage']),
  timesheetController.createProject
);

router.get(
  '/projects',
  authorize(['timesheet.view']),
  timesheetController.getProjects
);

router.get(
  '/projects/:id',
  authorize(['timesheet.view']),
  timesheetController.getProjectById
);

// ==================== PROJECT MEMBERS ====================

router.post(
  '/projects/members',
  authorize(['timesheet.manage']),
  timesheetController.addProjectMember
);

router.get(
  '/projects/:project_id/members',
  authorize(['timesheet.view']),
  timesheetController.getProjectMembers
);

// ==================== PROJECT TASKS ====================

router.post(
  '/projects/tasks',
  authorize(['timesheet.manage']),
  timesheetController.createTask
);

router.get(
  '/projects/:project_id/tasks',
  authorize(['timesheet.view']),
  timesheetController.getProjectTasks
);

router.put(
  '/tasks/:task_id/status',
  authorize(['timesheet.update']),
  timesheetController.updateTaskStatus
);

// ==================== TIMESHEET ENTRIES ====================

router.post(
  '/entries',
  authorize(['timesheet.create']),
  timesheetController.createEntry
);

router.get(
  '/entries/:employee_id?',
  authorize(['timesheet.view']),
  timesheetController.getEntries
);

router.post(
  '/entries/submit',
  authorize(['timesheet.submit']),
  timesheetController.submitTimesheet
);

router.post(
  '/entries/:entry_id/approve',
  authorize(['timesheet.approve']),
  timesheetController.approveEntry
);

router.post(
  '/entries/:entry_id/reject',
  authorize(['timesheet.approve']),
  timesheetController.rejectEntry
);

// ==================== ANALYTICS ====================

router.get(
  '/analytics/employee/:employee_id?/summary',
  authorize(['timesheet.view']),
  timesheetController.getEmployeeTimeSummary
);

router.get(
  '/analytics/project/:project_id/summary',
  authorize(['timesheet.view']),
  timesheetController.getProjectTimeSummary
);

router.get(
  '/analytics/pending-approvals',
  authorize(['timesheet.approve']),
  timesheetController.getPendingApprovals
);

export default router;
