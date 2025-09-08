"""
Chat chain implementation
"""

from typing import List, Dict, Any, Optional
from langchain_core.output_parsers import PydanticOutputParser
from simple_llm import SimpleSeaLionLLM
from models.response_models import ChatResponse
from prompts.chat_prompts import get_chat_prompt


class ChatChain:
    """LangChain-based chat handler"""
    
    def __init__(self, api_key: str):
        # Initialize SEA-LION LLM with default settings
        self.llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.7,
            max_tokens=150
        )
        
        # Create reusable prompt template with system message and placeholders
        self.prompt = get_chat_prompt()
        
        # Create output parser to convert LLM text to structured Pydantic model
        self.output_parser = PydanticOutputParser(pydantic_object=ChatResponse)
        
        # Create processing pipeline: prompt -> llm -> output parser
        self.chain = self.prompt | self.llm | self.output_parser
    
    def format_chat_history(self, conversation_context: List[Dict[str, Any]]) -> str:
        """Convert conversation array to formatted string for prompt"""
        if not conversation_context:
            return ""
        
        # Format each message as "Role: content" for the prompt
        formatted_messages = []
        for msg in conversation_context:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role in ["user", "assistant"] and content:
                formatted_messages.append(f"{role.title()}: {content}")
        
        return "\n".join(formatted_messages)
    
    def chat(self, message: str, country: str, language: str, 
             selected_agency: Optional[str] = None, 
             conversation_context: List[Dict[str, Any]] = None,
             settings: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process chat request using LangChain pipeline"""
        
        # Apply runtime settings to LLM if provided
        if settings:
            self.llm.temperature = settings.get("temperature", 0.7)
            self.llm.max_tokens = settings.get("maxTokens", 150)
        
        # Add agency context to system prompt if specified
        agency_context = f" You are specifically representing the {selected_agency} agency." if selected_agency else ""
        
        # Convert conversation array to formatted string
        chat_history = self.format_chat_history(conversation_context or [])
        
        try:
            # Run the complete pipeline: prompt -> llm -> structured output
            result = self.chain.invoke({
                "message": message,
                "country": country,
                "language": language,
                "agency_context": agency_context,
                "chat_history": chat_history
            })
            
            return {
                "response": result.response,
                "follow_up_questions": result.follow_up_questions
            }
            
        except Exception as e:
            # Fallback to simple text response if structured parsing fails
            print(f"⚠️ LangChain parsing failed, falling back to simple response: {e}")
            
            # Use prompt + LLM without output parsing for basic text response
            simple_chain = self.prompt | self.llm
            
            simple_result = simple_chain.invoke({
                "message": message,
                "country": country,
                "language": language,
                "agency_context": agency_context,
                "chat_history": chat_history
            })
            
            return {
                "response": simple_result,
                "follow_up_questions": []
            }
