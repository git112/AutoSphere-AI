# ABGA SaaS Platform - AI Content Generation Module

## Overview

Production-ready AI content generation feature with BYOK (Bring Your Own Key) support for the ABGA SaaS platform.

## Features

- 🤖 AI-powered content generation using OpenAI or Ollama
- 🔑 BYOK support (users can use system key or their own API key)
- 🔒 Secure API key encryption using Fernet
- 📱 Platform-specific content (LinkedIn, Twitter, Instagram, Facebook)
- 🎨 Tone customization (professional, casual, friendly, formal)
- 💾 Draft saving and retrieval
- 🏗️ Clean service-layer architecture
- ✅ Comprehensive error handling

## Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB (async with Motor)
- **AI Providers**: OpenAI, Ollama
- **Security**: Cryptography (Fernet)
- **Validation**: Pydantic

## Installation

1. **Install dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Generate encryption key**:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Add the output to .env as ENCRYPTION_KEY
```

4. **Start MongoDB**:
```bash
# Make sure MongoDB is running on mongodb://localhost:27017
# Or update MONGODB_URL in .env
```

5. **Run the application**:
```bash
python main.py
# Or use uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Generate Content
```http
POST /api/content/generate-content
Content-Type: application/json

{
  "user_id": "user_123",
  "topic": "AI in Marketing",
  "tone": "professional",
  "platform": "linkedin"
}
```

### Save Draft
```http
POST /api/content/save-draft
Content-Type: application/json

{
  "user_id": "user_123",
  "topic": "AI in Marketing",
  "tone": "professional",
  "platform": "linkedin",
  "content": "Generated content...",
  "hashtags": "#AI #Marketing",
  "cta": "Learn more"
}
```

### Get Drafts
```http
GET /api/content/drafts/{user_id}?limit=50
```

## Architecture

```
backend/
├── app/
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── models/          # Data schemas
│   ├── database/        # DB connection
│   ├── utils/           # Utilities
│   └── middleware/      # Error handling
├── main.py              # FastAPI app
└── requirements.txt     # Dependencies
```

## BYOK Logic

The system supports two modes:

1. **Default Mode** (`ai_mode: "default"`):
   - Uses system API key from `OPENAI_API_KEY` environment variable
   - No user configuration needed

2. **Custom Mode** (`ai_mode: "custom"`):
   - Uses user's encrypted API key
   - Key is decrypted at runtime
   - Never exposed to frontend

## Security

- ✅ API keys encrypted at rest using Fernet
- ✅ Environment variables for secrets
- ✅ Input validation with Pydantic
- ✅ No hardcoded credentials
- ✅ Comprehensive error handling

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

See `.env.example` for all required configuration.

## Development

```bash
# Run with auto-reload
uvicorn main:app --reload

# View logs
# Logs are output to console with timestamps
```

## Testing

Access the interactive API documentation at `/docs` to test all endpoints.

## License

Proprietary - ABGA SaaS Platform
