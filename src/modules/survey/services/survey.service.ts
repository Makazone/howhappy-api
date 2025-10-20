import { NotFoundError } from '@shared/errors/app-error.js';
import {
  createSurveySchema,
  listSurveyQuerySchema,
  type CreateSurveyInput,
  type ListSurveyQuery,
  updateSurveySchema,
  type UpdateSurveyInput,
} from '../schema.js';
import { surveyRepository, SurveyRepository } from '../repositories/survey.repository.js';

export interface SurveyServiceDeps {
  repository?: SurveyRepository;
}

export class SurveyService {
  private readonly repository: SurveyRepository;

  constructor({ repository = surveyRepository }: SurveyServiceDeps = {}) {
    this.repository = repository;
  }

  async list(ownerId: string, query: Partial<ListSurveyQuery>) {
    const parsed = listSurveyQuerySchema.parse(query ?? {});
    return this.repository.list(ownerId, parsed);
  }

  async get(ownerId: string, surveyId: string) {
    const survey = await this.repository.findByIdWithMetrics(surveyId);
    if (!survey || survey.ownerId !== ownerId) {
      throw new NotFoundError('Survey not found');
    }

    // Calculate completion rate
    const completionRate = survey.visits > 0 ? survey.submitsCount / survey.visits : 0;

    return {
      ...survey,
      completionRate,
    };
  }

  async create(ownerId: string, input: CreateSurveyInput) {
    const payload = createSurveySchema.parse(input);
    return this.repository.create(ownerId, payload);
  }

  async update(ownerId: string, surveyId: string, input: UpdateSurveyInput) {
    const payload = updateSurveySchema.parse(input);
    await this.get(ownerId, surveyId);
    return this.repository.update(surveyId, payload);
  }
}

export const surveyService = new SurveyService();
