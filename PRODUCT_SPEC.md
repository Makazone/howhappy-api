# Product Specification

This app is a backend for a web AI survey application. Web application (React) handles recording audio responses from users and than stores them for processing.

This backend app has to do the following:

1. Allow web app to store audio recording in blob storage (which is irrelevant for now, assume this backend app can issue signed upload URL)

2. Expose REST API to allow web app to notify the backend about finished survey intake (after uploading audio file to blob storage)

3. Application has main API server and multiple workers. One of such workers will be processing web audio files and transcribing them using ElevenLabs API, storing transcription result in Postgres DB

4. Another worker will run analysis on that transcription by issuing some prompt to an LLM of choice (not relevant which one right now). The resulting output will be stored in the same DB.

5. The main App should expose REST API to get survey results

6. System is multi-tenant. The basic tenant is a company. Company can have multiple users.

# Data models

Survey is one of the key entities. It has the following fields:

- Title
- Prompt (a rich text field that contains instructions for the user to follow e.g. questions to answer)
- Created at
- UpdatedAt
- Maximum response duration time
- creatorId (the user who created the survey)

SurveyResponse is another key entity. It has the following fields:

- SurveyId
- UserId (this can be null b/c responses can be anonymous)
- AudioUrl
- Transcription
- CreatedAt
- UpdatedAt
