import streamlit as st
import requests
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import RAG functionality
from RAG.query import search_chunks, supabase

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
    st.page_link("pages/Status_Tracker.py", label="📄 Application Status Tracker", icon="📄")

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
                                st.markdown("### 📚 Relevant Documents Found")
                                for i, result in enumerate(rag_results, 1):
                                    with st.container():
                                        st.markdown("---")
                                        col1, col2 = st.columns([3, 1])
                                        with col1:
                                            st.markdown(f"**{i}. {result['title']}**")
                                            content = result['content']
                                            sentences = content.split('. ')
                                            if len(sentences) > 3:
                                                preview = '. '.join(sentences[:3]) + '.'
                                                with st.expander(f"📝 **Preview:** {preview}...", expanded=False):
                                                    st.markdown(f"**Full Content:**\n\n{content}")
                                            else:
                                                st.markdown(f"📝 **Content:** {content}")
                                            st.markdown(f"🔗 **Source:** [{result['url']}]({result['url']})")
                                        with col2:
                                            score = result['similarity']
                                            st.metric("Relevance Score", f"{score:.3f}")
                                    st.markdown("---")
                            else:
                                st.warning("❌ No relevant documents found.")
                        except Exception as e:
                            st.warning(f"⚠️ RAG search failed: {str(e)}")

                        message_placeholder.markdown(response_text)
                        st.session_state.messages.append({"role": "assistant", "content": response_text})
                    else:
                        st.error(f"❌ API Error: {response.status_code} - {response.text}")
        except Exception as e:
            st.error(f"❌ Error generating response: {str(e)}")

# Footer
st.markdown("---")
st.markdown("**Built with Streamlit** | SEA-LION v3.5 | API Format")

