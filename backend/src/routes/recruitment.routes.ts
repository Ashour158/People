import { Router } from 'express';
import { RecruitmentController } from '../controllers/recruitment.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { recruitmentValidators } from '../validators/recruitment.validator';

const router = Router();
const controller = new RecruitmentController();

// Apply authentication to all routes
router.use(authenticate);

// Job Postings
router.post('/jobs', validateRequest(recruitmentValidators.createJob), controller.createJob);
router.get('/jobs', controller.getJobs);
router.get('/jobs/:id', controller.getJobById);
router.put('/jobs/:id', validateRequest(recruitmentValidators.updateJob), controller.updateJob);
router.delete('/jobs/:id', controller.deleteJob);
router.post('/jobs/:id/publish', controller.publishJob);
router.post('/jobs/:id/close', controller.closeJob);

// Candidates
router.post('/candidates', validateRequest(recruitmentValidators.createCandidate), controller.createCandidate);
router.get('/candidates', controller.getCandidates);
router.get('/candidates/:id', controller.getCandidateById);
router.put('/candidates/:id', validateRequest(recruitmentValidators.updateCandidate), controller.updateCandidate);
router.delete('/candidates/:id', controller.deleteCandidate);

// Applications
router.post('/applications', validateRequest(recruitmentValidators.createApplication), controller.createApplication);
router.get('/applications', controller.getApplications);
router.get('/applications/:id', controller.getApplicationById);
router.put('/applications/:id/status', validateRequest(recruitmentValidators.updateApplicationStatus), controller.updateApplicationStatus);

// Interviews
router.post('/interviews', validateRequest(recruitmentValidators.scheduleInterview), controller.scheduleInterview);
router.get('/interviews', controller.getInterviews);
router.get('/interviews/:id', controller.getInterviewById);
router.put('/interviews/:id', validateRequest(recruitmentValidators.updateInterview), controller.updateInterview);
router.post('/interviews/:id/feedback', validateRequest(recruitmentValidators.addInterviewFeedback), controller.addInterviewFeedback);

export default router;
