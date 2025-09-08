"""
Agency selection chain implementation
"""

from typing import List, Dict, Any, Optional
from langchain_core.output_parsers import PydanticOutputParser
from simple_llm import SimpleSeaLionLLM
from models.response_models import AgencySelectionResponse
from prompts.agency_prompts import get_agency_selection_prompt


class AgencySelectionChain:
    """LangChain-based agency selection handler"""
    
    def __init__(self, api_key: str):
        # Initialize SEA-LION LLM with default settings
        self.llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.7,
            max_tokens=300
        )
        
        # Create prompt template for agency selection
        self.prompt = get_agency_selection_prompt()
        
        # Create output parser for structured JSON response
        self.output_parser = PydanticOutputParser(pydantic_object=AgencySelectionResponse)
        
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
    
    def select_agency(self, message: str, country: str, language: str, 
                     category: str, suggested_agencies: List[str],
                     conversation_context: List[Dict[str, Any]] = None,
                     settings: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process agency selection using LangChain pipeline"""
        
        # Apply runtime settings to LLM if provided
        if settings:
            self.llm.temperature = settings.get("temperature", 0.7)
            self.llm.max_tokens = settings.get("maxTokens", 300)
        
        # Format category name for display
        category_name = category.replace("_", " ").title() if category else "relevant"
        
        # Format agencies list for prompt
        agencies_list = "\n".join([f"- {agency}" for agency in suggested_agencies])
        
        # Convert conversation array to formatted string
        chat_history = self.format_chat_history(conversation_context or [])
        
        try:
            # Run the complete pipeline: prompt -> llm -> structured output
            result = self.chain.invoke({
                "message": message,
                "country": country,
                "language": language,
                "category": category,
                "category_name": category_name,
                "agencies_list": agencies_list,
                "chat_history": chat_history
            })
            
            return {
                "response": result.response,
                "suggested_agency": result.suggested_agency,
                "available_agencies": result.available_agencies,
                "follow_up_questions": result.follow_up_questions,
                "category": result.category
            }
            
        except Exception as e:
            # Fallback to simple response if structured parsing fails
            print(f"⚠️ Agency selection parsing failed, falling back to simple response: {e}")
            
            # Use prompt + LLM without output parsing for basic text response
            simple_chain = self.prompt | self.llm
            
            simple_result = simple_chain.invoke({
                "message": message,
                "country": country,
                "language": language,
                "category": category,
                "category_name": category_name,
                "agencies_list": agencies_list,
                "chat_history": chat_history
            })
            
            return {
                "response": simple_result,
                "suggested_agency": suggested_agencies[0] if suggested_agencies else None,
                "available_agencies": suggested_agencies,
                "follow_up_questions": [],
                "category": category
            }
