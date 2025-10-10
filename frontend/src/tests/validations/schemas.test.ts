import { describe, it, expect } from 'vitest';
import {
  goalSchema,
  performanceReviewSchema,
  feedbackSchema,
  jobPostingSchema,
  candidateSchema,
  interviewScheduleSchema,
  salaryStructureSchema,
  bonusSchema,
  expensePolicySchema,
  expenseSchema,
  timesheetEntrySchema,
  projectSchema,
} from '../../validations';

describe('Performance Validation Schemas', () => {
  describe('goalSchema', () => {
    it('should validate a valid goal', async () => {
      const validGoal = {
        title: 'Increase Sales Revenue',
        description: 'Achieve 20% growth in Q4',
        goal_type: 'individual',
        category: 'revenue',
        target_value: 100000,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        weight: 50,
      };

      await expect(goalSchema.validate(validGoal)).resolves.toBeDefined();
    });

    it('should reject goal with short title', async () => {
      const invalidGoal = {
        title: 'AB',
        description: 'Valid description here',
        goal_type: 'individual',
        category: 'revenue',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
      };

      await expect(goalSchema.validate(invalidGoal)).rejects.toThrow();
    });

    it('should reject goal with invalid type', async () => {
      const invalidGoal = {
        title: 'Valid Title',
        description: 'Valid description here',
        goal_type: 'invalid_type',
        category: 'revenue',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
      };

      await expect(goalSchema.validate(invalidGoal)).rejects.toThrow();
    });

    it('should reject goal with end date before start date', async () => {
      const invalidGoal = {
        title: 'Valid Title',
        description: 'Valid description here',
        goal_type: 'individual',
        category: 'revenue',
        start_date: new Date('2025-12-31'),
        end_date: new Date('2025-01-01'),
      };

      await expect(goalSchema.validate(invalidGoal)).rejects.toThrow();
    });
  });

  describe('performanceReviewSchema', () => {
    it('should validate a valid performance review', async () => {
      const validReview = {
        employee_id: 'emp-123',
        reviewer_id: 'reviewer-456',
        review_type: 'manager',
        overall_rating: 4.5,
        strengths: 'Excellent communication skills',
        areas_of_improvement: 'Time management needs work',
        comments: 'Overall good performance',
      };

      await expect(performanceReviewSchema.validate(validReview)).resolves.toBeDefined();
    });

    it('should reject review with invalid type', async () => {
      const invalidReview = {
        employee_id: 'emp-123',
        reviewer_id: 'reviewer-456',
        review_type: 'invalid_type',
      };

      await expect(performanceReviewSchema.validate(invalidReview)).rejects.toThrow();
    });

    it('should reject review with rating out of range', async () => {
      const invalidReview = {
        employee_id: 'emp-123',
        reviewer_id: 'reviewer-456',
        review_type: 'manager',
        overall_rating: 6,
      };

      await expect(performanceReviewSchema.validate(invalidReview)).rejects.toThrow();
    });
  });

  describe('feedbackSchema', () => {
    it('should validate valid feedback', async () => {
      const validFeedback = {
        employee_id: 'emp-123',
        feedback_type: 'praise',
        feedback_text: 'Great work on the project presentation!',
        is_anonymous: false,
      };

      await expect(feedbackSchema.validate(validFeedback)).resolves.toBeDefined();
    });

    it('should reject feedback with short text', async () => {
      const invalidFeedback = {
        employee_id: 'emp-123',
        feedback_type: 'praise',
        feedback_text: 'Good',
      };

      await expect(feedbackSchema.validate(invalidFeedback)).rejects.toThrow();
    });
  });
});

describe('Recruitment Validation Schemas', () => {
  describe('jobPostingSchema', () => {
    it('should validate a valid job posting', async () => {
      const validJob = {
        job_title: 'Senior Software Engineer',
        department: 'Engineering',
        location: 'New York, NY',
        job_type: 'Full-time',
        experience_level: 'Senior Level',
        openings: 2,
        job_description: 'We are looking for an experienced software engineer to join our team. You will be responsible for developing high-quality applications.',
        requirements: 'Bachelor\'s degree in Computer Science, 5+ years of experience',
        salary_range_min: 100000,
        salary_range_max: 150000,
      };

      await expect(jobPostingSchema.validate(validJob)).resolves.toBeDefined();
    });

    it('should reject job with invalid type', async () => {
      const invalidJob = {
        job_title: 'Developer',
        department: 'Engineering',
        location: 'NYC',
        job_type: 'Invalid Type',
        experience_level: 'Senior Level',
        openings: 1,
        job_description: 'Valid description here with enough characters to pass validation',
        requirements: 'Valid requirements here',
      };

      await expect(jobPostingSchema.validate(invalidJob)).rejects.toThrow();
    });

    it('should reject job with max salary less than min', async () => {
      const invalidJob = {
        job_title: 'Developer',
        department: 'Engineering',
        location: 'NYC',
        job_type: 'Full-time',
        experience_level: 'Senior Level',
        openings: 1,
        job_description: 'Valid description here with enough characters to pass validation',
        requirements: 'Valid requirements here',
        salary_range_min: 150000,
        salary_range_max: 100000,
      };

      await expect(jobPostingSchema.validate(invalidJob)).rejects.toThrow();
    });
  });

  describe('candidateSchema', () => {
    it('should validate a valid candidate', async () => {
      const validCandidate = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone_number: '+1234567890',
        current_company: 'Tech Corp',
        current_designation: 'Senior Developer',
        total_experience_years: 8,
        source: 'referral',
      };

      await expect(candidateSchema.validate(validCandidate)).resolves.toBeDefined();
    });

    it('should reject candidate with invalid email', async () => {
      const invalidCandidate = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        source: 'referral',
      };

      await expect(candidateSchema.validate(invalidCandidate)).rejects.toThrow();
    });
  });

  describe('interviewScheduleSchema', () => {
    it('should validate a valid interview schedule', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validInterview = {
        application_id: 'app-123',
        interview_type: 'technical',
        interview_date: futureDate,
        duration_minutes: 60,
        interviewer_ids: ['int-1', 'int-2'],
        location: 'Conference Room A',
        interview_mode: 'in_person',
      };

      await expect(interviewScheduleSchema.validate(validInterview)).resolves.toBeDefined();
    });

    it('should reject interview with no interviewers', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalidInterview = {
        application_id: 'app-123',
        interview_type: 'technical',
        interview_date: futureDate,
        duration_minutes: 60,
        interviewer_ids: [],
        interview_mode: 'video',
      };

      await expect(interviewScheduleSchema.validate(invalidInterview)).rejects.toThrow();
    });
  });
});

describe('Payroll Validation Schemas', () => {
  describe('salaryStructureSchema', () => {
    it('should validate a valid salary structure', async () => {
      const validSalary = {
        employee_id: 'emp-123',
        effective_from: new Date('2025-01-01'),
        basic_salary: 50000,
        hra: 20000,
        transport_allowance: 5000,
        special_allowance: 10000,
      };

      await expect(salaryStructureSchema.validate(validSalary)).resolves.toBeDefined();
    });

    it('should reject negative basic salary', async () => {
      const invalidSalary = {
        employee_id: 'emp-123',
        effective_from: new Date('2025-01-01'),
        basic_salary: -1000,
      };

      await expect(salaryStructureSchema.validate(invalidSalary)).rejects.toThrow();
    });
  });

  describe('bonusSchema', () => {
    it('should validate a valid bonus', async () => {
      const validBonus = {
        employee_id: 'emp-123',
        bonus_type: 'performance',
        amount: 10000,
        bonus_date: new Date('2025-12-31'),
        reason: 'Excellent performance in Q4',
      };

      await expect(bonusSchema.validate(validBonus)).resolves.toBeDefined();
    });

    it('should reject invalid bonus type', async () => {
      const invalidBonus = {
        employee_id: 'emp-123',
        bonus_type: 'invalid_type',
        amount: 10000,
        bonus_date: new Date('2025-12-31'),
      };

      await expect(bonusSchema.validate(invalidBonus)).rejects.toThrow();
    });
  });
});

describe('Expense Validation Schemas', () => {
  describe('expensePolicySchema', () => {
    it('should validate a valid expense policy', async () => {
      const validPolicy = {
        policy_name: 'Travel Expense Policy',
        category: 'travel',
        max_amount: 5000,
        requires_receipt: true,
        requires_manager_approval: true,
        description: 'Policy for travel expenses',
      };

      await expect(expensePolicySchema.validate(validPolicy)).resolves.toBeDefined();
    });

    it('should reject invalid category', async () => {
      const invalidPolicy = {
        policy_name: 'Test Policy',
        category: 'invalid_category',
        max_amount: 1000,
        requires_receipt: true,
        requires_manager_approval: true,
      };

      await expect(expensePolicySchema.validate(invalidPolicy)).rejects.toThrow();
    });
  });

  describe('expenseSchema', () => {
    it('should validate a valid expense', async () => {
      const validExpense = {
        policy_id: 'policy-123',
        category: 'travel',
        amount: 500,
        expense_date: new Date('2025-01-15'),
        merchant_name: 'Airlines Inc',
        description: 'Flight ticket for business trip',
        has_receipt: true,
      };

      await expect(expenseSchema.validate(validExpense)).resolves.toBeDefined();
    });

    it('should reject expense with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalidExpense = {
        policy_id: 'policy-123',
        category: 'travel',
        amount: 500,
        expense_date: futureDate,
        merchant_name: 'Test Merchant',
        description: 'Test expense description',
        has_receipt: true,
      };

      await expect(expenseSchema.validate(invalidExpense)).rejects.toThrow();
    });
  });
});

describe('Timesheet Validation Schemas', () => {
  describe('timesheetEntrySchema', () => {
    it('should validate a valid timesheet entry', async () => {
      const validEntry = {
        project_id: 'proj-123',
        work_date: new Date('2025-01-15'),
        hours_worked: 8,
        is_billable: true,
        description: 'Worked on feature development for client project',
        task_category: 'development',
      };

      await expect(timesheetEntrySchema.validate(validEntry)).resolves.toBeDefined();
    });

    it('should reject entry with too many hours', async () => {
      const invalidEntry = {
        project_id: 'proj-123',
        work_date: new Date('2025-01-15'),
        hours_worked: 25,
        is_billable: true,
        description: 'Test description',
      };

      await expect(timesheetEntrySchema.validate(invalidEntry)).rejects.toThrow();
    });
  });

  describe('projectSchema', () => {
    it('should validate a valid project', async () => {
      const validProject = {
        project_name: 'E-commerce Platform',
        project_code: 'ECOM-001',
        client_name: 'Tech Corp',
        project_type: 'billable',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        budget_hours: 1000,
      };

      await expect(projectSchema.validate(validProject)).resolves.toBeDefined();
    });

    it('should reject project with end date before start date', async () => {
      const invalidProject = {
        project_name: 'Test Project',
        project_code: 'TEST-001',
        project_type: 'internal',
        start_date: new Date('2025-12-31'),
        end_date: new Date('2025-01-01'),
      };

      await expect(projectSchema.validate(invalidProject)).rejects.toThrow();
    });
  });
});
