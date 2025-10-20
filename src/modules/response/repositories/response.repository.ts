import { prisma } from '@infrastructure/database/client.js';
import type { Prisma, SurveyResponse } from '@prisma/client';

export class ResponseRepository {
  async create(data: {
    surveyId: string;
    registeredUserId?: string | null;
    anonymousEmail?: string | null;
  }): Promise<SurveyResponse> {
    return prisma.surveyResponse.create({
      data: {
        surveyId: data.surveyId,
        registeredUserId: data.registeredUserId ?? null,
        anonymousEmail: data.anonymousEmail ?? null,
      },
    });
  }

  async update(
    responseId: string,
    data: Prisma.SurveyResponseUpdateInput,
  ): Promise<SurveyResponse> {
    return prisma.surveyResponse.update({
      where: { id: responseId },
      data,
    });
  }

  async findById(responseId: string): Promise<SurveyResponse | null> {
    return prisma.surveyResponse.findUnique({ where: { id: responseId } });
  }

  async findBySurveyId(surveyId: string): Promise<SurveyResponse[]> {
    return prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndSurvey(responseId: string, surveyId: string): Promise<SurveyResponse | null> {
    return prisma.surveyResponse.findFirst({
      where: {
        id: responseId,
        surveyId,
      },
    });
  }
}

export const responseRepository = new ResponseRepository();
