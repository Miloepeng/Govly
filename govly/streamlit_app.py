import streamlit as st
import requests
import os
import json
from dotenv import load_dotenv
load_dotenv()

# Page config
st.set_page_config(
    page_title="SEA-LION Chat",
    page_icon="🦁",
    layout="wide"
)

# Custom CSS for better styling
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

# Title and description
st.title("🦁 SEA-LION Chat Interface")
st.markdown("**Southeast Asian Languages In One Network** - Powered by SEA-LION API")

# Sidebar for settings
with st.sidebar:
    st.header("⚙️ Settings")
    
    # Generation parameters
    max_tokens = st.slider("Max Response Length", 50, 300, 150, help="Maximum number of tokens in response")
    temperature = st.slider("Temperature", 0.1, 1.0, 0.7, help="Higher = more creative, Lower = more focused")
    
    # Thinking mode control
    thinking_mode = st.selectbox(
        "Thinking Mode",
        ["off", "on"],
        help="Off = direct answers, On = shows reasoning"
    )
    
    # Model info
    st.header("📊 Model Info")
    st.info("**Model**: Llama-SEA-LION-v3-70B-IT\n\n**Format**: Cloud API (Fast)\n\n**Size**: 70B Parameters (High Quality)")
    
    # Clear chat button
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = []
        st.rerun()

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input
if prompt := st.chat_input("Ask me anything..."):
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Display assistant response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        
        try:
            # Generate response via API
            with st.spinner("🔄 Generating response via API..."):
                
                # Prepare messages for API with full chat history
                messages = [
                    {
                        "role": "system", 
                        "content": "You are SEA-LION, a Southeast Asian language model. Give informative, helpful answers. Be direct and factual, but provide enough detail to be useful. Avoid unnecessary reasoning or explanations about how you work."
                    }
                ]
                
                # Add chat history for context
                for msg in st.session_state.messages[-6:]:  # Last 6 messages for context
                    messages.append(msg)
                
                # Add current user message
                messages.append({"role": "user", "content": prompt})
                
                # API call
                api_key = os.getenv("SEA_LION_API_KEY")
                if not api_key:
                    st.error("❌ SEA_LION_API_KEY not found in environment variables")
                else:
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    
                    payload = {
                        "model": "aisingapore/Llama-SEA-LION-v3-70B-IT",
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                        "thinking_mode": thinking_mode  
                    }
                    
                    # Make API request
                    response = requests.post(
                        "https://api.sea-lion.ai/v1/chat/completions",
                        headers=headers,
                        json={
                            "max_completion_tokens": max_tokens,
                            "messages": messages,
                            "model": "aisingapore/Llama-SEA-LION-v3-70B-IT"
                        },
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        response_text = response_data["choices"][0]["message"]["content"]
                        
                        # Display response
                        message_placeholder.markdown(response_text)
                        
                        # Add assistant response to chat history
                        st.session_state.messages.append({"role": "assistant", "content": response_text})
                    else:
                        st.error(f"❌ API Error: {response.status_code} - {response.text}")
            
        except Exception as e:
            st.error(f"❌ Error generating response: {str(e)}")

# Footer
st.markdown("---")
st.markdown("**Built with Streamlit** | SEA-LION v3.5 | API Format") 