import streamlit as st
import requests
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import RAG functionality
import sys
import os

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from rag.query import search_chunks, supabase
    print("✅ DEBUG: RAG imports successful")
except ImportError as e:
    print(f"❌ DEBUG: RAG import failed: {e}")
    # Create dummy functions to prevent crashes
    def search_chunks(query, top_k=5, country=None, agency=None):
        print(f"⚠️ DEBUG: Dummy search_chunks called with: {query}")
        return []
    supabase = None

# Page config
st.set_page_config(
    page_title="SEA-LION Chat",
    page_icon="🦁",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
    .stTextInput > div > div > input {
        background-color: #f0f2f6;
    }
    .stButton > button {
        background-color: #ff4b4b;
        color: white;
        border-radius: 10px;
        padding: 10px 20px;
    }
    .chat-message {
        padding: 15px;
        border-radius: 10px;
        margin: 10px 0;
    }
    .user-message {
        background-color: #e3f2fd;
        border-left: 5px solid #2196f3;
    }
    .assistant-message {
        background-color: #f3e5f5;
        border-left: 5px solid #9c27b0;
    }
    
    /* RAG Card Styling */
    .rag-card {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        background-color: #fefefe;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
        cursor: pointer;
    }
    .rag-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        border-color: #d1d5db;
        background-color: #fafafa;
    }
    .rag-card-title {
        font-weight: bold;
        color: #1f2937;
        margin-bottom: 6px;
        font-size: 1.05em;
    }
    .rag-card-content {
        color: #4b5563;
        font-size: 0.9em;
        margin-bottom: 8px;
        line-height: 1.4;
    }
    .rag-card-meta {
        color: #6b7280;
        font-size: 0.85em;
        margin-bottom: 6px;
    }
    .rag-card-link {
        color: #3b82f6;
        text-decoration: none;
        font-size: 0.9em;
    }
    .rag-card-link:hover {
        text-decoration: underline;
    }
</style>
""", unsafe_allow_html=True)

# Title
st.title("🦁 SEA-LION Chat Interface")
st.markdown("**Southeast Asian Languages In One Network** - Powered by SEA-LION API")

# Initialise chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Sidebar
with st.sidebar:
    # Navigation first
    st.header("📊 Navigation")
    st.page_link("streamlit_app.py", label="💬 Chat", icon="💬")
    st.page_link("pages/status_tracker.py", label="📄 Application Status Tracker", icon="📄")

    st.markdown("---")
    # Settings
    st.header("⚙️ Settings")
    max_tokens = st.slider("Max Response Length", 50, 300, 150)
    temperature = st.slider("Temperature", 0.1, 1.0, 0.7)
    thinking_mode = st.selectbox("Thinking Mode", ["off", "on"])

    st.markdown("---")
    # Model info
    st.header("ℹ️ Model Info")
    st.info("**Model**: Llama-SEA-LION-v3-70B-IT\n\n**Format**: Cloud API (Fast)\n\n**Size**: 70B Parameters")

    # Clear chat
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = []
        st.rerun()

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        
        # If message has RAG results, display them
        if "rag_results" in message and message["rag_results"]:
            st.markdown("### 📚 Relevant Documents")
            
            # Create 3 columns for the results
            cols = st.columns(3)
            
            for i, result in enumerate(message["rag_results"]):
                # Choose which column to use
                col = cols[i] if i < 3 else None
                if col:
                    with col:
                        # Create the styled card
                        st.markdown(f"""
                        <div class="rag-card">
                            <div class="rag-card-title">{i+1}. {result['title'][:40]}{'...' if len(result['title']) > 40 else ''}</div>
                            <div class="rag-card-content">{result['content'][:100]}{'...' if len(result['content']) > 100 else ''}</div>
                            <div class="rag-card-meta">
                                <strong>Relevance: {result['similarity']:.3f}</strong>
                            </div>
                            <a href="{result['url']}" target="_blank" class="rag-card-link">🔗 View Document</a>
                        </div>
                        """, unsafe_allow_html=True)

# Chat input
if prompt := st.chat_input("Ask me anything..."):
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        try:
            with st.spinner("🔄 Generating response via API..."):
                messages = [
                    {
                        "role": "system",
                        "content": "You are SEA-LION, a Southeast Asian language model. Give informative, helpful answers. Be direct and factual."
                    }
                ]
                for msg in st.session_state.messages[-6:]:
                    messages.append(msg)
                messages.append({"role": "user", "content": prompt})

                api_key = os.getenv("SEA_LION_API_KEY")
                if not api_key:
                    st.error("❌ SEA_LION_API_KEY not found in environment variables")
                else:
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                    payload = {
                        "max_completion_tokens": max_tokens,
                        "messages": messages,
                        "model": "aisingapore/Llama-SEA-LION-v3-70B-IT",
                        "temperature": temperature,
                        "thinking_mode": thinking_mode
                    }
                    response = requests.post(
                        "https://api.sea-lion.ai/v1/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=60
                    )
                    if response.status_code == 200:
                        response_data = response.json()
                        response_text = response_data["choices"][0]["message"]["content"]
                        
                        # RAG search
                        try:
                            st.info("🔍 Searching for relevant documents...")
                            rag_results = search_chunks(prompt, top_k=3)
                            
                            if rag_results:
                                # Store RAG results in session state for chat history
                                if 'rag_results' not in st.session_state:
                                    st.session_state.rag_results = []
                                st.session_state.rag_results = rag_results
                                
                                # Add the LLM response + RAG results as ONE message to chat history
                                combined_message = {
                                    "role": "assistant", 
                                    "content": response_text,
                                    "rag_results": rag_results
                                }
                                st.session_state.messages.append(combined_message)
                                
                                # RAG results are now displayed in chat history, no need to show them here again
                                st.success(f"✅ Found {len(rag_results)} relevant documents! Check the chat history above to view them.")
                                
                                # Force a rerun to immediately display the RAG results in chat history
                                st.rerun()
                            else:
                                st.warning("❌ **No relevant documents found in database.**")
                                # Add just the LLM response to chat history if no RAG results
                                st.session_state.messages.append({"role": "assistant", "content": response_text})
                        except Exception as e:
                            st.warning(f"⚠️ RAG search failed: {str(e)}")
                            st.info("⚠️ **RAG search unavailable**")
                            # Add just the LLM response to chat history if RAG fails
                            st.session_state.messages.append({"role": "assistant", "content": response_text})

                        message_placeholder.markdown(response_text)
                    else:
                        st.error(f"❌ API Error: {response.status_code} - {response.text}")
        except Exception as e:
            st.error(f"❌ Error generating response: {str(e)}")

# Footer
st.markdown("---")
st.markdown("**Built with Streamlit** | SEA-LION v3.5 | API Format")

