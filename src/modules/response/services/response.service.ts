import { getQueueProducer } from '@infrastructure/queue/producer.js';
import { getMinIOClient } from '@infrastructure/storage/minio-client.js';
import { AppError, ForbiddenError, NotFoundError } from '@shared/errors/app-error.js';
import { signResponseToken, type ResponseTokenPayload } from '@shared/security/jwt.js';
import type { Prisma } from '@prisma/client';
import { responseRepository, ResponseRepository } from '../repositories/response.repository.js';
import { surveyRepository, SurveyRepository } from '@modules/survey/repositories/survey.repository.js';
import { completeResponseSchema, prepareResponseSchema, type CompleteResponseInput, type PrepareResponseInput } from '../schema.js';
import { UploadState } from '@prisma/client';

export interface PrepareOptions {
  surveyId: string;
  actorUserId?: string;
  payload: PrepareResponseInput;
}

export interface CompleteOptions {
  surveyId: string;
  responseId: string;
  payload: CompleteResponseInput;
  token: ResponseTokenPayload;
  actorUserId?: string;
}

export class ResponseService {
  private readonly responses: ResponseRepository;
  private readonly surveys: SurveyRepository;
  private bucketEnsured = false;

  constructor({ responses = responseRepository, surveys = surveyRepository }: { responses?: ResponseRepository; surveys?: SurveyRepository } = {}) {
    this.responses = responses;
    this.surveys = surveys;
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) {
      return;
    }
    const client = getMinIOClient();
    await client.ensureBucket();
    this.bucketEnsured = true;
  }

  private buildObjectKey(surveyId: string, responseId: string): string {
    return `surveys/${surveyId}/responses/${responseId}/audio.webm`;
  }

  async prepare(options: PrepareOptions) {
    const payload = prepareResponseSchema.parse(options.payload ?? {});

    const survey = await this.surveys.findById(options.surveyId);
    if (!survey) {
      throw new NotFoundError('Survey not found');
    }

    const response = await this.responses.create({
      surveyId: options.surveyId,
      registeredUserId: options.actorUserId ?? null,
      anonymousEmail: payload.anonymousEmail ?? null,
    });

    await this.ensureBucket();

    const client = getMinIOClient();
    const objectKey = this.buildObjectKey(options.surveyId, response.id);
    const uploadUrl = await client.getPresignedUploadUrl(objectKey);

    const token = signResponseToken({
      tokenType: 'response',
      surveyId: options.surveyId,
      responseId: response.id,
    } as ResponseTokenPayload);

    return {
      response,
      uploadUrl,
      responseToken: token,
    };
  }

  async complete(options: CompleteOptions) {
    const payload = completeResponseSchema.parse(options.payload);
    const response = await this.responses.findById(options.responseId);
    if (!response || response.surveyId !== options.surveyId) {
      throw new NotFoundError('Response not found');
    }

    if (response.uploadState === UploadState.COMPLETED) {
      return response;
    }

    if (options.token.responseId !== options.responseId || options.token.surveyId !== options.surveyId) {
      throw new ForbiddenError('Response token mismatch');
    }

    await this.ensureBucket();

    const updateData: Prisma.SurveyResponseUpdateInput = {
      audioUrl: payload.audioUrl,
      uploadState: UploadState.COMPLETED,
    };

    const updated = await this.responses.update(options.responseId, updateData);

    try {
      const boss = getQueueProducer();
      await boss.publish('transcription.request', {
        responseId: updated.id,
        surveyId: updated.surveyId,
      });
    } catch (error) {
      throw new AppError('Failed to enqueue transcription job', 500);
    }

    return updated;
  }
}

export const responseService = new ResponseService();
