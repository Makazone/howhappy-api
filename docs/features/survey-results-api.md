# Survey API Functional Specification

## Problem Statement

This specification defines the backend API required to power the survey results dashboard for HowHappyAI. The API extends existing survey and response endpoints to provide metrics, response data, AI-generated insights, and enhanced survey management.

## Changes to Data Model Schema

Based on the current Prisma schema, the following additions are needed to support the survey results API:

### Enhancements to Existing Models

```prisma
// Add to Survey model (metrics and insights folded in)
model Survey {
  // ... existing fields ...
  visits         Int      @default(0)
  submits        Int      @default(0)

  // Insights fields
  insightSummary String?  @db.Text

  // ... rest of existing model
}

// Add to SurveyResponse model
model SurveyResponse {
  // ... existing fields ...
  duration        Int?     // duration in seconds
  language        String?  // detected language
  segments        Json?    // transcript segments
  metadata        Json?    // request metadata (IP, user agent, etc.)

  // ... rest of existing model
}
```

## Changes to API

Based on the current OpenAPI specification, the following endpoints need to be added or modified:

### Modified Endpoints

- **GET /v1/surveys/{id}**: Enhanced to include metrics, response counts, and insights
- **GET /v1/surveys/{surveyId}/responses**: New endpoint for listing responses (no pagination for now)

### New Endpoints

- **GET /v1/surveys/{surveyId}/responses/{responseId}**: Get detailed response information
- **POST /v1/surveys/{surveyId}/responses/submit**: Create response with audio URL and enqueue transcription

### New Request/Response Schemas

- **SubmitResponseRequest**: Schema for submitting audio URL with response
- **SubmitResponseResult**: Response including updated response and job ID

## Core Functionality

### 1. Enhanced Survey Details

The existing survey details endpoint is enhanced to include metrics and response data.

#### GET /v1/surveys/{id}

Returns survey details including key performance indicators, response counts, and insights.

**Response:**

```json
{
  "survey": {
    "id": "prompt-1",
    "ownerId": "user-123",
    "title": "Walk me through our current hiring process for backend engineers",
    "prompt": "Start with how candidates enter the pipeline (sources), then outline each step (screen, tech, loop, decision), owners & SLAs. Call out bottlenecks, drop-off points, and tooling gaps.",
    "status": "ACTIVE",
    "visits": 17,
    "submits": 12,
    "completionRate": 0.71,
    "lastActivityAt": "2024-08-29T15:29:00Z",
    "insightSummary": "Our analysis of 12 responses reveals valuable insights about user satisfaction and areas for improvement. The feedback shows strong appreciation for the current functionality while highlighting opportunities for enhanced features and streamlined processes.",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-08-29T15:29:00Z"
  }
}
```

### 2. Response Management

#### GET /v1/surveys/{surveyId}/responses

Retrieve all responses for a survey.

**Response:**

```json
{
  "responses": [
    {
      "id": "resp-001",
      "surveyId": "prompt-1",
      "registeredUserId": null,
      "anonymousEmail": "user@example.com",
      "audioUrl": "/v1/audio/resp-001.mp3",
      "uploadState": "COMPLETED",
      "transcription": "Looking at our current workflow, there are three main phases that each request goes through. The first phase involves intake and categorization...",
      "transcriptionStatus": "COMPLETED",
      "analysis": null,
      "analysisStatus": "PENDING",
      "duration": 112,
      "confidence": 0.95,
      "language": "en",
      "createdAt": "2024-08-29T15:29:00Z",
      "updatedAt": "2024-08-29T15:30:00Z"
    }
  ]
}
```

#### GET /v1/surveys/{surveyId}/responses/{responseId}

Get detailed information about a specific response.

**Response:**

```json
{
  "response": {
    "id": "resp-001",
    "surveyId": "prompt-1",
    "registeredUserId": null,
    "anonymousEmail": "user@example.com",
    "audioUrl": "/v1/audio/resp-001.mp3",
    "uploadState": "COMPLETED",
    "transcription": "Looking at our current workflow, there are three main phases that each request goes through. The first phase involves intake and categorization...",
    "transcriptionStatus": "COMPLETED",
    "analysis": {
      "summary": "The response discusses workflow processes...",
      "sentiment": "neutral",
      "topics": ["workflow", "process", "categorization"]
    },
    "analysisStatus": "COMPLETED",
    "duration": 112,
    "confidence": 0.95,
    "language": "en",
    "metadata": {
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "deviceType": "desktop",
      "browser": "Chrome"
    },
    "createdAt": "2024-08-29T15:29:00Z",
    "updatedAt": "2024-08-29T15:30:00Z"
  }
}
```

### 4. Survey Submission

The survey submission flow follows these steps:

#### Step 1: Prepare Response

**POST /v1/surveys/{id}/responses**
Frontend calls this to get a response token and signed upload URL.

**Request:**

No request body is required.

**Response:**

```json
{
  "response": {
    "id": "resp-001",
    "surveyId": "prompt-1",
    "registeredUserId": null,
    "anonymousEmail": "user@example.com",
    "audioUrl": null,
    "uploadState": "PREPARED",
    "transcriptionStatus": "PENDING",
    "analysisStatus": "PENDING",
    "createdAt": "2024-08-29T15:29:00Z",
    "updatedAt": "2024-08-29T15:29:00Z"
  },
  "uploadUrl": "https://minio.example.com/bucket/audio/resp-001.mp3?X-Amz-Signature=...",
  "responseToken": "jwt-token-for-submission"
}
```

#### Step 2: Upload Audio File

Frontend uploads audio file to the signed URL from step 1. The upload service returns the full audio file path.

#### Step 3: Submit Response

**POST /v1/surveys/{surveyId}/responses/submit**
Frontend calls this with the audio URL to create the response and enqueue transcription.

**Headers:**

```
Authorization: Bearer [responseToken from step 1]
```

**Request:**

```json
{
  "responseId": "resp-001",
  "audioUrl": "https://minio.example.com/bucket/audio/resp-001.mp3"
}
```

**Response:**

```json
{
  "response": {
    "id": "resp-001",
    "surveyId": "prompt-1",
    "registeredUserId": null,
    "anonymousEmail": "user@example.com",
    "audioUrl": "https://minio.example.com/bucket/audio/resp-001.mp3",
    "uploadState": "COMPLETED",
    "transcriptionStatus": "PENDING",
    "analysisStatus": "PENDING",
    "createdAt": "2024-08-29T15:29:00Z",
    "updatedAt": "2024-08-29T15:30:00Z"
  },
  "jobId": "transcription-job-123"
}
```

### 5. Transcript Processing

#### Background Job Processing

Transcription happens automatically via background jobs:

1. **Job Enqueueing**: When `/v1/surveys/{surveyId}/responses/submit` is called, a transcription job is automatically enqueued using pg-boss
2. **Job Processing**: Background worker processes the job by:
   - Calling 3rd party speech-to-text service (e.g., OpenAI Whisper). For intial implementation let's return a stabbed response.
   - Updating the SurveyResponse record with transcription results
   - Setting `transcriptionStatus` to 'COMPLETED' or 'FAILED'
   - Storing transcript text, confidence, language, and segments

## Data Models

### Survey (existing, enhanced with metrics and insights)

```typescript
interface Survey {
  id: string;
  ownerId: string;
  title: string;
  prompt: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  visits: number;
  submits: number;
  completionRate: number;
  insightSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### SurveyResponse (existing, enhanced)

```typescript
interface SurveyResponse {
  id: string;
  surveyId: string;
  registeredUserId?: string;
  anonymousEmail?: string;
  audioUrl?: string;
  uploadState: 'PREPARED' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  transcription?: string;
  transcriptionStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  analysis?: object;
  analysisStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  duration?: number;
  confidence?: number;
  language?: string;
  segments?: object[];
  metadata?: object;
  createdAt: Date;
  updatedAt: Date;
}
```

## Authentication & Authorization

- API requires authentication via JWT tokens
- Survey creators have full access to their survey data
- Public surveys allow anonymous submissions

## Error Handling

Standard HTTP status codes with detailed error messages:

```json
{
  "error": {
    "code": "SURVEY_NOT_FOUND",
    "message": "Survey with ID 'prompt-1' not found",
    "details": {
      "surveyId": "prompt-1"
    }
  }
}
```

## Security Considerations

- Audio files stored in secure object storage (MinIO/S3)
- Signed URLs for audio access with expiration
- Input validation and sanitization

## Monitoring & Analytics

SKIP for now.
