# 🚀 Govly Web - Modern React Next.js Chat Interface

A beautiful, modern web application that provides a chat interface to the SEA-LION LLM with integrated RAG (Retrieval-Augmented Generation) capabilities.

## ✨ Features

- **Modern UI**: Clean, responsive React interface with Tailwind CSS
- **Real-time Chat**: Interactive chat with SEA-LION LLM
- **RAG Integration**: Search and display relevant documents
- **Form Search**: Find relevant forms based on queries
- **Settings Control**: Adjust model parameters (tokens, temperature, thinking mode)
- **Responsive Design**: Works perfectly on desktop and mobile

## 🏗️ Architecture

```
govly-web/
├── frontend/                 # React Next.js app
│   ├── components/          # Reusable UI components
│   ├── pages/              # Next.js pages
│   ├── types/              # TypeScript type definitions
│   └── styles/             # CSS and Tailwind config
├── backend/                 # Python FastAPI backend
│   ├── main.py             # FastAPI server
│   ├── rag/                # RAG functionality (copied from original)
│   └── requirements.txt    # Python dependencies
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.11+** (3.13 compatible)
- **SEA-LION API Key** in your `.env` file

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Environment Setup

Create a `.env` file in the `backend/` directory:

```bash
SEA_LION_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Your app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

## 🔧 Configuration

### Frontend Settings

- **Max Response Length**: 50-300 tokens
- **Temperature**: 0.1-1.0 (creativity control)
- **Thinking Mode**: On/Off for SEA-LION reasoning

### Backend Configuration

The backend automatically:
- Loads your existing RAG functionality
- Connects to SEA-LION API
- Handles CORS for frontend communication
- Provides fallback functions if RAG is unavailable

## 📱 Usage

1. **Start a Chat**: Type your message and press Enter
2. **Find Articles**: Click "Find Articles" to search relevant documents
3. **Find Forms**: Click "Find Forms" to search relevant forms
4. **Adjust Settings**: Use the sidebar to control model behavior
5. **Clear Chat**: Reset conversation history when needed

## 🛠️ Development

### Frontend Development

```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # Code linting
```

### Backend Development

```bash
cd backend
python main.py       # Run FastAPI server
# The server will auto-reload on code changes
```

### API Endpoints

- `POST /api/chat` - Send message to SEA-LION
- `POST /api/rag` - Search for relevant documents
- `POST /api/forms` - Search for relevant forms

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000 and 8000 are available
2. **API Key**: Verify your SEA-LION API key is in the `.env` file
3. **Dependencies**: Run `pip install -r requirements.txt` if you get import errors
4. **CORS Issues**: Check that the backend is running on port 8000

### Debug Mode

The backend includes debug logging for RAG imports. Check the terminal output for:
- ✅ RAG imports successful
- ❌ RAG import failed: [error details]
- ⚠️ Dummy functions being used

## 🎨 Customization

### Styling

- **Colors**: Modify `tailwind.config.js` for theme changes
- **Components**: Edit files in `frontend/components/`
- **Layout**: Modify `frontend/pages/index.tsx`

### Functionality

- **New API Endpoints**: Add to `backend/main.py`
- **RAG Logic**: Modify files in `backend/rag/`
- **Chat Behavior**: Update the chat logic in the frontend

## 📚 Dependencies

### Frontend
- **Next.js 14**: React framework
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **TypeScript**: Type safety

### Backend
- **FastAPI**: Modern Python web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **Your RAG System**: Existing functionality preserved

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project maintains the same license as your original Govly project.

---

**Built with ❤️ using Next.js, FastAPI, and your existing RAG system!** 