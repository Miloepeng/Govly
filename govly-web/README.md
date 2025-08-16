# 🚀 Govly - AI-Powered Government Services Assistant

A modern, intelligent web application that provides AI-powered assistance for government services using SEA-LION LLM with advanced RAG (Retrieval-Augmented Generation) capabilities, country-specific context, and multi-language support.

## ✨ Features

- **🤖 AI Chat Interface**: Powered by SEA-LION LLM with conversation memory
- **🌍 Country & Language Support**: Context-aware responses for Southeast Asian countries
- **🔍 Smart Document Search**: RAG-powered document retrieval and analysis
- **📋 Form Discovery**: Find and get guidance on relevant government forms
- **💬 Conversation Memory**: Full chat context maintained across sessions
- **⚙️ Customizable Settings**: Adjust model parameters (tokens, temperature, thinking mode)
- **📱 Responsive Design**: Modern UI built with Tailwind CSS and Radix UI
- **🚀 Real-time Processing**: Live loading states and progress indicators

## 🏗️ Architecture

```
govly-web/
├── frontend/                 # Next.js 14 React application
│   ├── components/          # Reusable UI components (ChatMessage, Sidebar)
│   ├── pages/              # Next.js pages and routing
│   ├── types/              # TypeScript interfaces and types
│   └── styles/             # Tailwind CSS configuration
├── backend/                 # Python FastAPI backend
│   ├── main.py             # FastAPI server with chat and RAG endpoints
│   ├── rag/                # RAG functionality (document search, form search)
│   └── requirements.txt    # Python dependencies
└── start.sh                # Automated startup script
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.11+** (recommended for compatibility)
- **SEA-LION API Key** for AI responses
- **Supabase credentials** for RAG functionality

### Option 1: Automated Startup (Recommended)

```bash
cd govly-web
chmod +x start.sh
./start.sh
```

This script will:
- Install all dependencies automatically
- Start the FastAPI backend on port 8000
- Start the Next.js frontend on port 3000
- Handle all setup and configuration

### Option 2: Manual Setup

#### 1. Install Frontend Dependencies
```bash
cd frontend
npm install
```

#### 2. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### 3. Environment Setup
Create a `.env` file in the `backend/` directory:

```bash
SEA_LION_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

#### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python3.11 main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Your app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔧 Configuration

### Frontend Settings

- **Max Response Length**: 50-300 tokens
- **Temperature**: 0.1-1.0 (creativity control)
- **Thinking Mode**: On/Off for SEA-LION reasoning
- **Country Selection**: Choose from 11 Southeast Asian countries
- **Language Selection**: Support for 10+ languages

### Backend Configuration

The backend automatically:
- Loads RAG functionality for document and form search
- Connects to SEA-LION API with conversation context
- Handles CORS for frontend communication
- Provides country and language-aware responses

## 📱 Usage

### Chat Interface
1. **Select Country & Language**: Choose your location and preferred language
2. **Start a Chat**: Type your question and press Enter
3. **Use RAG Features**: 
   - **Find Links**: Search for relevant documents
   - **Find Forms**: Search for relevant government forms
4. **Adjust Settings**: Use the gear icon to control model behavior
5. **Clear Chat**: Reset conversation history when needed

### RAG Operations
- **Document Search**: Automatically finds relevant documents and explains their context
- **Form Discovery**: Identifies relevant forms and provides step-by-step guidance
- **Contextual Responses**: AI responses consider your country, language, and conversation history

## 🛠️ Development

### Frontend Development

```bash
cd frontend
npm run dev          # Development server with hot reload
npm run build        # Production build
npm run start        # Production server
npm run lint         # Code linting
```

### Backend Development

```bash
cd backend
python3.11 main.py   # Run FastAPI server with auto-reload
```

### API Endpoints

- `POST /api/chat` - Send message to SEA-LION with full context
- `POST /api/ragLink` - Search for relevant documents
- `POST /api/ragForm` - Search for relevant forms

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000 and 8000 are available
2. **API Key**: Verify your SEA-LION API key is in the `.env` file
3. **Dependencies**: Run `pip install -r requirements.txt` if you get import errors
4. **Python Version**: Use Python 3.11 for best compatibility
5. **Large Payloads**: Clear chat history if responses are slow

### Debug Mode

The backend includes comprehensive debug logging:
- Country and language detection
- RAG search results
- API request/response details
- Error tracking and diagnostics

## 🎨 Customization

### Styling

- **Colors**: Modify `tailwind.config.js` for theme changes
- **Components**: Edit files in `frontend/components/`
- **Layout**: Modify `frontend/pages/index.tsx`

### Functionality

- **New API Endpoints**: Add to `backend/main.py`
- **RAG Logic**: Modify files in `backend/rag/`
- **Chat Behavior**: Update the chat logic in the frontend
- **Country/Language Support**: Add new countries or languages

## 📚 Dependencies

### Frontend
- **Next.js 14**: React framework with App Router
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful, consistent icons
- **TypeScript**: Type safety and developer experience

### Backend
- **FastAPI**: Modern, fast Python web framework
- **Uvicorn**: ASGI server for production
- **Pydantic**: Data validation and serialization
- **Sentence Transformers**: RAG embedding functionality
- **Supabase**: Vector database for document search

## 🌟 Key Features Explained

### Conversation Memory
- Maintains full chat history across sessions
- Provides context-aware responses
- Enables follow-up questions and references

### Country & Language Context
- AI responses tailored to your country
- Language-specific instructions
- Local government service awareness

### Smart RAG Integration
- Automatic document relevance scoring
- Contextual explanation of found documents
- Step-by-step form guidance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (frontend and backend)
5. Submit a pull request

## 📄 License

This project maintains the same license as your original Govly project.

---

**Built with ❤️ using Next.js 14, FastAPI, and advanced RAG technology for intelligent government service assistance!** 