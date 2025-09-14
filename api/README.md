# Dating Planner API

Azure Functions API for handling plan submissions and email notifications.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. Configure local settings:
   - Copy `local.settings.json` and update the values:
     - `COMMUNICATION_SERVICES_CONNECTION_STRING`: Azure Communication Services connection string
     - `NOTIFICATION_EMAIL`: Email address to receive notifications

4. Start the function locally (requires Azure Functions Core Tools):
   ```bash
   npm start
   ```

## API Endpoints

### POST /api/submitPlan

Receives plan submissions and triggers email notifications.

**Request Body:**
```json
{
  "name": "John Doe",
  "date": "2024-02-14",
  "time": "19:00",
  "activities": ["dinner", "movie"],
  "customActivity": "Walk in the park"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan submission received successfully",
  "submissionId": "sub_1234567890_abc123def",
  "submittedAt": "2024-02-10T10:30:00.000Z"
}
```

## Validation Rules

- `name`: Required string, max 100 characters
- `date`: Required ISO date string
- `time`: Required HH:MM format
- `activities`: Required array of non-empty strings
- `customActivity`: Optional string, max 200 characters

## Development

- `npm run build`: Compile TypeScript
- `npm run watch`: Watch for changes and recompile
- `npm start`: Start the function locally