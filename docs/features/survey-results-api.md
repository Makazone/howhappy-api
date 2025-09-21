# Survey API Functional Specification

## Overview
This specification defines the backend API required to power the survey results dashboard for HowHappyAI. The API provides endpoints to retrieve survey metrics, response data, AI-generated insights, and manage survey submissions.

## Core Functionality

### 1. Survey Metrics Dashboard
The API provides aggregated metrics for survey performance monitoring.

#### GET /api/surveys/{surveyId}/metrics
Returns key performance indicators for a specific survey.

**Response:**
```json
{
  "surveyId": "prompt-1",
  "title": "Walk me through our current hiring process for backend engineers",
  "description": "Start with how candidates enter the pipeline (sources), then outline each step (screen, tech, loop, decision), owners & SLAs. Call out bottlenecks, drop-off points, and tooling gaps.",
  "metrics": {
    "visits": 17,
    "submits": 12,
    "completionRate": 0.71,
    "averageDuration": "1:52"
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "lastActivityAt": "2024-08-29T15:29:00Z"
}
```

### 2. Response Management

#### GET /api/surveys/{surveyId}/responses
Retrieve all responses for a survey with pagination and filtering options.

**Query Parameters:**
- `page` (integer): Page number for pagination (default: 1)
- `limit` (integer): Number of responses per page (default: 20)
- `status` (string): Filter by response status (pending, processing, completed, failed)
- `dateFrom` (ISO date): Filter responses after this date
- `dateTo` (ISO date): Filter responses before this date

**Response:**
```json
{
  "responses": [
    {
      "responseId": "resp-001",
      "surveyId": "prompt-1",
      "submittedAt": "2024-08-29T15:29:00Z",
      "duration": "1:52",
      "status": "completed",
      "audio": {
        "url": "/api/audio/resp-001.mp3",
        "duration": "0:00 / 1:52",
        "format": "mp3"
      },
      "transcript": {
        "text": "Looking at our current workflow, there are three main phases that each request goes through. The first phase involves intake and categorization...",
        "confidence": 0.95,
        "language": "en"
      }
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "pages": 1,
    "limit": 20
  }
}
```

#### GET /api/surveys/{surveyId}/responses/{responseId}
Get detailed information about a specific response.

**Response:**
```json
{
  "responseId": "resp-001",
  "surveyId": "prompt-1",
  "submittedAt": "2024-08-29T15:29:00Z",
  "duration": "1:52",
  "status": "completed",
  "audio": {
    "url": "/api/audio/resp-001.mp3",
    "duration": "1:52",
    "format": "mp3",
    "sizeBytes": 2234567
  },
  "transcript": {
    "text": "Looking at our current workflow, there are three main phases that each request goes through. The first phase involves intake and categorization...",
    "confidence": 0.95,
    "language": "en",
    "segments": [
      {
        "start": 0.0,
        "end": 5.2,
        "text": "Looking at our current workflow, there are three main phases"
      }
    ]
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "location": {
      "country": "US",
      "region": "CA"
    }
  }
}
```

### 3. AI-Generated Insights

#### GET /api/surveys/{surveyId}/insights
Retrieve AI-generated analysis and insights from survey responses.

**Response:**
```json
{
  "surveyId": "prompt-1",
  "analysisDate": "2024-08-29T16:00:00Z",
  "summary": {
    "text": "Our analysis of 6 responses reveals valuable insights about user satisfaction and areas for improvement. The feedback shows strong appreciation for the current functionality while highlighting opportunities for enhanced features and streamlined processes. Most respondents expressed positive sentiment regarding the overall experience.",
    "confidence": 0.92
  },
  "topicsCloud": [
    {
      "topic": "User Experience",
      "frequency": 8,
      "sentiment": "positive"
    },
    {
      "topic": "Performance",
      "frequency": 6,
      "sentiment": "positive"
    },
    {
      "topic": "Features",
      "frequency": 5,
      "sentiment": "neutral"
    },
    {
      "topic": "Pricing",
      "frequency": 4,
      "sentiment": "neutral"
    },
    {
      "topic": "Support",
      "frequency": 3,
      "sentiment": "positive"
    },
    {
      "topic": "Integration",
      "frequency": 3,
      "sentiment": "neutral"
    },
    {
      "topic": "Security",
      "frequency": 2,
      "sentiment": "positive"
    },
    {
      "topic": "Mobile",
      "frequency": 2,
      "sentiment": "neutral"
    }
  ],
  "sentimentAnalysis": {
    "positive": {
      "percentage": 62,
      "topics": [
        "Excellent user interface design",
        "Fast response times",
        "Intuitive navigation",
        "Great customer support"
      ]
    },
    "negative": {
      "percentage": 18,
      "topics": [
        "Complex onboarding process",
        "Limited customization options",
        "Occasional sync issues",
        "Missing advanced features"
      ]
    },
    "neutral": {
      "percentage": 20
    }
  },
  "actionHints": [
    {
      "priority": "high",
      "action": "Improve onboarding flow with guided tutorials",
      "impact": "Address 30% of negative feedback"
    },
    {
      "priority": "medium",
      "action": "Add more customization options to dashboard",
      "impact": "Requested by 25% of respondents"
    },
    {
      "priority": "medium",
      "action": "Implement real-time sync monitoring",
      "impact": "Resolve technical issues affecting 15% of users"
    },
    {
      "priority": "low",
      "action": "Consider adding advanced filtering features",
      "impact": "Enhance power user experience"
    }
  ]
}
```

### 4. Audio File Management

#### GET /api/audio/{audioId}
Stream or download audio recording of a response.

**Headers:**
- `Range`: Support for partial content/streaming

**Response:**
- Audio file stream (mp3/wav format)
- Appropriate Content-Type header
- Support for range requests

### 5. Survey Submission

#### POST /api/surveys/{surveyId}/submit
Submit a new response to a survey.

**Request (multipart/form-data):**
```json
{
  "audio": "binary audio file",
  "duration": 112,
  "metadata": {
    "deviceType": "desktop",
    "browser": "Chrome"
  }
}
```

**Response:**
```json
{
  "responseId": "resp-007",
  "status": "processing",
  "message": "Response received and queued for processing"
}
```

### 6. Transcript Processing

#### POST /api/surveys/{surveyId}/responses/{responseId}/transcript
Trigger or retry transcript generation for a response.

**Response:**
```json
{
  "status": "processing",
  "jobId": "job-123",
  "estimatedCompletion": "2024-08-29T15:35:00Z"
}
```

#### GET /api/surveys/{surveyId}/responses/{responseId}/transcript
Get the transcript for a specific response.

**Response:**
```json
{
  "responseId": "resp-001",
  "transcript": {
    "text": "Full transcript text here...",
    "confidence": 0.95,
    "language": "en",
    "processedAt": "2024-08-29T15:30:00Z",
    "segments": [...]
  }
}
```

### 7. Export Functionality

#### GET /api/surveys/{surveyId}/export
Export survey data in various formats.

**Query Parameters:**
- `format` (string): Export format (csv, pdf, json)
- `includeAudio` (boolean): Include audio files in export
- `includeTranscripts` (boolean): Include transcripts
- `includeInsights` (boolean): Include AI insights

**Response:**
- File download in requested format
- Or JSON with download URL for large exports

### 8. Real-time Updates (WebSocket)

#### WS /api/surveys/{surveyId}/live
WebSocket endpoint for real-time survey updates.

**Events:**
- `new_response`: New response submitted
- `response_processed`: Transcript completed
- `metrics_updated`: Survey metrics changed
- `insights_updated`: New insights generated

## Data Models

### Survey
```typescript
interface Survey {
  id: string;
  title: string;
  description: string;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'paused' | 'completed';
  settings: {
    maxResponseDuration: number;
    allowAnonymous: boolean;
    requireAuth: boolean;
  };
}
```

### Response
```typescript
interface Response {
  id: string;
  surveyId: string;
  userId?: string;
  submittedAt: Date;
  duration: number;
  audioUrl: string;
  transcriptId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
}
```

### Transcript
```typescript
interface Transcript {
  id: string;
  responseId: string;
  text: string;
  confidence: number;
  language: string;
  segments: TranscriptSegment[];
  processedAt: Date;
  processingTime: number;
}
```

### Insight
```typescript
interface Insight {
  id: string;
  surveyId: string;
  generatedAt: Date;
  summary: string;
  topics: Topic[];
  sentiment: SentimentAnalysis;
  actionItems: ActionItem[];
}
```

## Authentication & Authorization

- API requires authentication via JWT tokens
- Survey creators have full access to their survey data
- Respondents can only access their own responses
- Public surveys allow anonymous submissions with rate limiting

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

## Performance Requirements

- Survey metrics should load in <200ms
- Response list pagination should load in <500ms
- Audio streaming should start within 1s
- Transcript processing should complete within 2x audio duration
- AI insights should generate within 30s of new response batch

## Security Considerations

- Audio files stored in secure object storage (MinIO/S3)
- Signed URLs for audio access with expiration
- Rate limiting on submission endpoints
- Input validation and sanitization
- CORS configuration for web client access
- PII detection and redaction in transcripts

## Integration Points

- **Audio Processing**: Integration with speech-to-text service (e.g., OpenAI Whisper)
- **AI Analysis**: LLM integration for generating insights and summaries
- **Storage**: MinIO/S3 for audio file storage
- **Queue System**: pg-boss for async processing jobs
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for frequently accessed data

## Monitoring & Analytics

- Track API response times
- Monitor transcript processing success rates
- Log failed audio uploads
- Track insight generation performance
- Monitor storage usage trends

## Future Enhancements

- Multi-language support for transcripts
- Video response support
- Real-time collaborative analysis
- Custom insight templates
- Automated follow-up questions
- Integration with third-party analytics tools
- Batch processing for large-scale surveys
- A/B testing for survey prompts