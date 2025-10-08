import { Request, Response, NextFunction } from 'express';
import { RecruitmentService } from '../services/recruitment.service';
import { AuthRequest } from '../types';

const recruitmentService = new RecruitmentService();

export class RecruitmentController {
  async createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.createJob(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getJobs(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getJobById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.updateJob(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      await recruitmentService.deleteJob(organizationId, req.params.id);
      res.json({ success: true, message: 'Job posting deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async publishJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.publishJob(organizationId, req.params.id, authReq.user.user_id);
      res.json({ success: true, data: result, message: 'Job posting published successfully' });
    } catch (error) {
      next(error);
    }
  }

  async closeJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.closeJob(organizationId, req.params.id, authReq.user.user_id);
      res.json({ success: true, data: result, message: 'Job posting closed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.createCandidate(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getCandidates(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getCandidateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getCandidateById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.updateCandidate(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      await recruitmentService.deleteCandidate(organizationId, req.params.id);
      res.json({ success: true, message: 'Candidate deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.createApplication(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getApplications(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getApplicationById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateApplicationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.updateApplicationStatus(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async scheduleInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.scheduleInterview(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getInterviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getInterviews(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getInterviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.getInterviewById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.updateInterview(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addInterviewFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await recruitmentService.addInterviewFeedback(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
