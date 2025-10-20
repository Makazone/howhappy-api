import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  registerInputSchema,
  loginInputSchema,
  authTokenResponseSchema,
  meResponseSchema,
  userPublicSchema,
} from '@modules/auth/schema.js';
import {
  createSurveySchema,
  updateSurveySchema,
  listSurveyQuerySchema,
  surveyListResponseSchema,
  surveyCreatedResponseSchema,
  surveyUpdateResponseSchema,
  singleSurveyResponseSchema,
} from '@modules/survey/schema.js';
import {
  prepareResponseSchema,
  completeResponseSchema,
  prepareResponseResultSchema,
  responseCompletionSchema,
  responseListSchema,
  singleResponseSchema,
  submitResponseSchema,
  submitResponseResultSchema,
} from '@modules/response/schema.js';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const errorResponseSchema = registry.register(
  'ErrorResponse',
  z
    .object({
      error: z.string(),
      code: z.string().optional(),
      requestId: z.string().optional(),
    })
    .openapi({ title: 'ErrorResponse' }),
);

registry.register('User', userPublicSchema.openapi({ title: 'User' }));

const authTokenResponse = registry.register(
  'AuthTokenResponse',
  authTokenResponseSchema.openapi({ title: 'AuthTokenResponse' }),
);

const meResponse = registry.register(
  'MeResponse',
  meResponseSchema.openapi({ title: 'MeResponse' }),
);

const registerRequestSchema = registry.register(
  'RegisterRequest',
  registerInputSchema.openapi({ title: 'RegisterRequest' }),
);

const loginRequestSchema = registry.register(
  'LoginRequest',
  loginInputSchema.openapi({ title: 'LoginRequest' }),
);

const listSurveyQueryComponent = registry.register(
  'ListSurveyQuery',
  listSurveyQuerySchema.openapi({ title: 'ListSurveyQuery' }),
);

const createSurveyRequestSchema = registry.register(
  'CreateSurveyRequest',
  createSurveySchema.openapi({ title: 'CreateSurveyRequest' }),
);

const updateSurveyRequestSchema = registry.register(
  'UpdateSurveyRequest',
  updateSurveySchema.openapi({ title: 'UpdateSurveyRequest' }),
);

const surveyListComponent = registry.register(
  'SurveyListResponse',
  surveyListResponseSchema.openapi({ title: 'SurveyListResponse' }),
);

const surveySingleComponent = registry.register(
  'SingleSurveyResponse',
  singleSurveyResponseSchema.openapi({ title: 'SingleSurveyResponse' }),
);

const surveyCreatedComponent = registry.register(
  'SurveyCreatedResponse',
  surveyCreatedResponseSchema.openapi({ title: 'SurveyCreatedResponse' }),
);

const surveyUpdatedComponent = registry.register(
  'SurveyUpdateResponse',
  surveyUpdateResponseSchema.openapi({ title: 'SurveyUpdateResponse' }),
);

const prepareResponseRequestSchema = registry.register(
  'PrepareResponseRequest',
  prepareResponseSchema.openapi({ title: 'PrepareResponseRequest' }),
);

const completeResponseRequestSchema = registry.register(
  'CompleteResponseRequest',
  completeResponseSchema.openapi({ title: 'CompleteResponseRequest' }),
);

const prepareResponseResultComponent = registry.register(
  'PrepareResponseResult',
  prepareResponseResultSchema.openapi({ title: 'PrepareResponseResult' }),
);

const responseCompletionComponent = registry.register(
  'ResponseCompletion',
  responseCompletionSchema.openapi({ title: 'ResponseCompletion' }),
);

const responseListComponent = registry.register(
  'ResponseList',
  responseListSchema.openapi({ title: 'ResponseList' }),
);

const singleResponseComponent = registry.register(
  'SingleResponse',
  singleResponseSchema.openapi({ title: 'SingleResponse' }),
);

const submitResponseRequestSchema = registry.register(
  'SubmitResponseRequest',
  submitResponseSchema.openapi({ title: 'SubmitResponseRequest' }),
);

const submitResponseResultComponent = registry.register(
  'SubmitResponseResult',
  submitResponseResultSchema.openapi({ title: 'SubmitResponseResult' }),
);

const healthSchema = z
  .object({
    status: z.string(),
    timestamp: z.string(),
    uptime: z.number(),
  })
  .openapi({ title: 'HealthStatus' });

const readinessSchema = z
  .object({
    status: z.string(),
    timestamp: z.string(),
  })
  .openapi({ title: 'ReadinessStatus' });

function jsonContent(schema: z.ZodTypeAny) {
  return {
    'application/json': { schema },
  } as const;
}

const bearerSecurity = [{ BearerAuth: [] }];

registry.registerPath({
  method: 'post',
  path: '/v1/auth/register',
  tags: ['Auth'],
  request: {
    body: {
      required: true,
      content: jsonContent(registerRequestSchema),
    },
  },
  responses: {
    201: {
      description: 'User registered',
      content: jsonContent(authTokenResponse),
    },
    400: {
      description: 'Validation error',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/auth/login',
  tags: ['Auth'],
  request: {
    body: {
      required: true,
      content: jsonContent(loginRequestSchema),
    },
  },
  responses: {
    200: {
      description: 'Authenticated',
      content: jsonContent(authTokenResponse),
    },
    401: {
      description: 'Invalid credentials',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/auth/me',
  tags: ['Auth'],
  security: bearerSecurity,
  responses: {
    200: {
      description: 'Current user',
      content: jsonContent(meResponse),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/surveys',
  tags: ['Surveys'],
  security: bearerSecurity,
  request: {
    query: listSurveyQueryComponent,
  },
  responses: {
    200: {
      description: 'List of surveys',
      content: jsonContent(surveyListComponent),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/surveys',
  tags: ['Surveys'],
  security: bearerSecurity,
  request: {
    body: {
      required: true,
      content: jsonContent(createSurveyRequestSchema),
    },
  },
  responses: {
    201: {
      description: 'Survey created',
      content: jsonContent(surveyCreatedComponent),
    },
    400: {
      description: 'Validation error',
      content: jsonContent(errorResponseSchema),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/surveys/{id}',
  tags: ['Surveys'],
  security: bearerSecurity,
  request: {
    params: z.object({ id: z.string().uuid() }).openapi({ title: 'SurveyIdParam' }),
  },
  responses: {
    200: {
      description: 'Survey fetched',
      content: jsonContent(surveySingleComponent),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: 'Not found',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/v1/surveys/{id}',
  tags: ['Surveys'],
  security: bearerSecurity,
  request: {
    params: z.object({ id: z.string().uuid() }).openapi({ title: 'SurveyIdParam' }),
    body: {
      required: true,
      content: jsonContent(updateSurveyRequestSchema),
    },
  },
  responses: {
    200: {
      description: 'Survey updated',
      content: jsonContent(surveyUpdatedComponent),
    },
    400: {
      description: 'Validation error',
      content: jsonContent(errorResponseSchema),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: 'Not found',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/surveys/{id}/responses',
  tags: ['Responses'],
  request: {
    params: z.object({ id: z.string().uuid() }).openapi({ title: 'SurveyIdParam' }),
    body: {
      required: false,
      content: jsonContent(prepareResponseRequestSchema),
    },
  },
  responses: {
    201: {
      description: 'Prepared response',
      content: jsonContent(prepareResponseResultComponent),
    },
    404: {
      description: 'Survey not found',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/v1/surveys/{surveyId}/responses/{responseId}',
  tags: ['Responses'],
  security: bearerSecurity,
  request: {
    params: z
      .object({
        surveyId: z.string().uuid(),
        responseId: z.string().uuid(),
      })
      .openapi({ title: 'ResponsePathParams' }),
    body: {
      required: true,
      content: jsonContent(completeResponseRequestSchema),
    },
  },
  responses: {
    200: {
      description: 'Response completed',
      content: jsonContent(responseCompletionComponent),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: 'Not found',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/surveys/{surveyId}/responses',
  tags: ['Responses'],
  security: bearerSecurity,
  request: {
    params: z.object({ surveyId: z.string().uuid() }).openapi({ title: 'SurveyIdParam' }),
  },
  responses: {
    200: {
      description: 'List of responses',
      content: jsonContent(responseListComponent),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: 'Survey not found',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/surveys/{surveyId}/responses/{responseId}',
  tags: ['Responses'],
  security: bearerSecurity,
  request: {
    params: z
      .object({
        surveyId: z.string().uuid(),
        responseId: z.string().uuid(),
      })
      .openapi({ title: 'ResponsePathParams' }),
  },
  responses: {
    200: {
      description: 'Response details',
      content: jsonContent(singleResponseComponent),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: 'Not found',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/surveys/{surveyId}/responses/submit',
  tags: ['Responses'],
  security: bearerSecurity,
  request: {
    params: z.object({ surveyId: z.string().uuid() }).openapi({ title: 'SurveyIdParam' }),
    body: {
      required: true,
      content: jsonContent(submitResponseRequestSchema),
    },
  },
  responses: {
    200: {
      description: 'Response submitted successfully',
      content: jsonContent(submitResponseResultComponent),
    },
    401: {
      description: 'Unauthorized',
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: 'Not found',
      content: jsonContent(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['System'],
  responses: {
    200: {
      description: 'Service health',
      content: jsonContent(healthSchema),
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/ready',
  tags: ['System'],
  responses: {
    200: {
      description: 'Service readiness',
      content: jsonContent(readinessSchema),
    },
    503: {
      description: 'Not ready',
      content: jsonContent(errorResponseSchema),
    },
  },
});

const generator = new OpenApiGeneratorV31(registry.definitions);

export const openApiDocument: any = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'HowHappy API',
    version: '1.0.0',
    description: 'MVP survey and response API for HowHappy.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development',
    },
  ],
  security: bearerSecurity,
});

export default openApiDocument;
