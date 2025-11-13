import { describe, it, expect, beforeEach } from 'vitest';
import { SurveyService } from '../../../../src/modules/survey/services/survey.service.js';
import type { SurveyRepository } from '../../../../src/modules/survey/repositories/survey.repository.js';
import { NotFoundError } from '../../../../src/shared/errors/app-error.js';

const now = new Date();

class MockSurveyRepository {
  public createdWith: any;
  public surveys = new Map<string, any>();

  async list(ownerId: string, _query?: unknown) {
    const items = Array.from(this.surveys.values()).filter((survey) => survey.ownerId === ownerId);
    return { items, nextCursor: undefined };
  }

  async findById(id: string) {
    return this.surveys.get(id) ?? null;
  }

  async findByIdWithMetrics(id: string) {
    const survey = this.surveys.get(id);
    if (!survey) {
      return null;
    }
    return {
      ...survey,
      submitsCount: 0,
      visits: 0,
      lastActivityAt: survey.updatedAt,
    };
  }

  async create(ownerId: string, data: { title: string; prompt: string }) {
    const survey = {
      id: 'survey-id',
      ownerId,
      title: data.title,
      prompt: data.prompt,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };
    this.surveys.set(survey.id, survey);
    this.createdWith = { ownerId, data };
    return survey;
  }

  async update(id: string, data: any) {
    const current = this.surveys.get(id);
    const updated = { ...current, ...data, updatedAt: new Date() };
    this.surveys.set(id, updated);
    return updated;
  }
}

describe('SurveyService', () => {
  let repository: MockSurveyRepository;
  let service: SurveyService;

  beforeEach(() => {
    repository = new MockSurveyRepository();
    service = new SurveyService({ repository: repository as unknown as SurveyRepository });
  });

  it('creates a survey for the owner', async () => {
    const survey = await service.create('user-123', {
      title: 'Test Survey',
      prompt: 'Tell us something',
    });

    expect(survey.title).toBe('Test Survey');
    expect(repository.createdWith).toEqual({
      ownerId: 'user-123',
      data: { title: 'Test Survey', prompt: 'Tell us something' },
    });
  });

  it('throws when retrieving missing survey', async () => {
    await expect(service.get('user-123', 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates an existing survey', async () => {
    const created = await repository.create('user-123', {
      title: 'Old Title',
      prompt: 'Old prompt',
    });

    const updated = await service.update('user-123', created.id, { title: 'New Title' });

    expect(updated.title).toBe('New Title');
  });
});
