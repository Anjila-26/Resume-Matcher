# ResuMatch Backend API

FastAPI backend for the ResuMatch CV-Job Alignment Tool.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements_api.txt
```

### 2. Environment Variables

Create a `.env` file in the Backend directory:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 3. Run the Server

```bash
python api.py
```

Or using uvicorn directly:

```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check

**GET** `/`
- Returns API status

### Process Text Input

**POST** `/api/process-text`
- Content-Type: `application/json`
- Body:
  ```json
  {
    "cv_content": "CV text content...",
    "job_content": "Job description text content..."
  }
  ```
- Returns:
  ```json
  {
    "evaluation": "Detailed evaluation text...",
    "email": "Generated email text...",
    "status": "success"
  }
  ```

### Process Files

**POST** `/api/process-files`
- Content-Type: `multipart/form-data`
- Body:
  - `cv_file`: CV file (TXT or PDF)
  - `job_file`: Job description file (TXT or PDF)
- Returns:
  ```json
  {
    "evaluation": "Detailed evaluation text...",
    "email": "Generated email text...",
    "status": "success"
  }
  ```

## Frontend Integration

The frontend expects the API to be running on `http://localhost:8000` by default. You can configure this by setting the `NEXT_PUBLIC_API_URL` environment variable in your frontend.

## CORS

The API is configured to allow requests from:
- `http://localhost:3000` (Next.js default)
- `http://127.0.0.1:3000`

To add more origins, edit the `allow_origins` list in `api.py`.

