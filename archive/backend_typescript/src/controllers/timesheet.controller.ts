import { Request, Response, NextFunction } from 'express';
import { TimesheetService } from '../services/timesheet.service';
import { pool } from '../config/database';

const timesheetService = new TimesheetService(pool);

export class TimesheetController {
  // ==================== PROJECTS ====================

  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const project = await timesheetService.createProject({
        ...req.body,
        organization_id,
        created_by: user_id,
      });

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { status, project_type } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (project_type) filters.project_type = project_type as string;

      const projects = await timesheetService.getProjects(organization_id, filters);

      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { id } = req.params;

      const project = await timesheetService.getProjectById(id, organization_id);

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== PROJECT MEMBERS ====================

  async addProjectMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const member = await timesheetService.addProjectMember({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Project member added successfully',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { project_id } = req.params;

      const members = await timesheetService.getProjectMembers(project_id);

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== PROJECT TASKS ====================

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const task = await timesheetService.createProjectTask({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Project task created successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { project_id } = req.params;
      const { status, assigned_to } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (assigned_to) filters.assigned_to = assigned_to as string;

      const tasks = await timesheetService.getProjectTasks(project_id, filters);

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { task_id } = req.params;
      const { status, completed_date } = req.body;

      const task = await timesheetService.updateTaskStatus(task_id, status, completed_date);

      res.json({
        success: true,
        message: 'Task status updated successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== TIMESHEET ENTRIES ====================

  async createEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const entry = await timesheetService.createTimesheetEntry({
        ...req.body,
        employee_id: req.body.employee_id || user_id,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Timesheet entry created successfully',
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;
      const { employee_id } = req.params;
      const { start_date, end_date, project_id, status } = req.query;

      const filters: any = {};
      if (start_date) filters.start_date = new Date(start_date as string);
      if (end_date) filters.end_date = new Date(end_date as string);
      if (project_id) filters.project_id = project_id as string;
      if (status) filters.status = status as string;

      const entries = await timesheetService.getTimesheetEntries(
        employee_id || user_id,
        organization_id,
        filters
      );

      res.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitTimesheet(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id } = req.user!;
      const { entry_ids } = req.body;

      await timesheetService.submitTimesheet(user_id, entry_ids);

      res.json({
        success: true,
        message: 'Timesheet submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async approveEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;
      const { entry_id } = req.params;

      const entry = await timesheetService.approveTimesheetEntry(
        entry_id,
        user_id,
        organization_id
      );

      res.json({
        success: true,
        message: 'Timesheet entry approved successfully',
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;
      const { entry_id } = req.params;
      const { rejection_reason } = req.body;

      const entry = await timesheetService.rejectTimesheetEntry(
        entry_id,
        user_id,
        rejection_reason,
        organization_id
      );

      res.json({
        success: true,
        message: 'Timesheet entry rejected successfully',
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ANALYTICS ====================

  async getEmployeeTimeSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;
      const { employee_id } = req.params;
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'start_date and end_date are required',
        });
      }

      const summary = await timesheetService.getEmployeeTimeSummary(
        employee_id || user_id,
        organization_id,
        new Date(start_date as string),
        new Date(end_date as string)
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectTimeSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { project_id } = req.params;

      const summary = await timesheetService.getProjectTimeSummary(project_id, organization_id);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const approvals = await timesheetService.getPendingApprovals(user_id, organization_id);

      res.json({
        success: true,
        data: approvals,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const timesheetController = new TimesheetController();
