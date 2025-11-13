import { prisma } from '@infrastructure/database/client.js';
import type { Prisma, Survey } from '@prisma/client';
import type { ListSurveyQuery, UpdateSurveyInput } from '../validators/survey.validators.js';

export interface SurveyListResult {
  items: Survey[];
  nextCursor?: string;
}

export class SurveyRepository {
  async list(ownerId: string, query: ListSurveyQuery): Promise<SurveyListResult> {
    const take = query.limit ?? 20;
    const where: Prisma.SurveyWhereInput = {
      ownerId,
      status: query.status,
    };

    const items = await prisma.survey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      skip: query.cursor ? 1 : 0,
      cursor: query.cursor ? { id: query.cursor } : undefined,
    });

    let nextCursor: string | undefined;
    if (items.length > take) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items,
      nextCursor,
    };
  }

  async findById(id: string): Promise<Survey | null> {
    return prisma.survey.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });
  }

  async findByIdWithMetrics(id: string) {
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        responses: {
          select: {
            uploadState: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!survey) {
      return null;
    }

    const completedResponses = survey.responses.filter((r) => r.uploadState === 'COMPLETED');
    const lastActivity = survey.responses[0]?.createdAt || survey.updatedAt;

    return {
      ...survey,
      submitsCount: completedResponses.length,
      lastActivityAt: lastActivity,
    };
  }

  async create(ownerId: string, data: { title: string; prompt: string }): Promise<Survey> {
    return prisma.survey.create({
      data: {
        ownerId,
        title: data.title,
        prompt: data.prompt,
      },
    });
  }

  async update(id: string, data: UpdateSurveyInput): Promise<Survey> {
    return prisma.survey.update({
      where: { id },
      data,
    });
  }
}

export const surveyRepository = new SurveyRepository();
