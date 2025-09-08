"""
Intent detection chain implementation
"""

from typing import List, Dict, Any, Optional
from langchain_core.output_parsers import PydanticOutputParser
from simple_llm import SimpleSeaLionLLM
from models.response_models import IntentDetectionResponse
from prompts.intent_prompts import get_intent_prompt


class IntentDetectionChain:
    """LangChain-based intent detection handler"""
    
    def __init__(self, api_key: str):
        # Initialize SEA-LION LLM with low temperature for consistent JSON output
        self.llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.1,  # Low temperature for consistent JSON
            max_tokens=150
        )
        
        # Create prompt template for intent detection
        self.prompt = get_intent_prompt()
        
        # Create output parser for structured JSON response
        self.output_parser = PydanticOutputParser(pydantic_object=IntentDetectionResponse)
        
        # Create processing pipeline: prompt -> llm -> output parser
        self.chain = self.prompt | self.llm | self.output_parser
    
    def detect_intent(self, message: str, country: str, language: str) -> tuple[str, bool, list, str]:
        """Detect user intent and return routing information using LangChain"""
        try:
            # Run the complete pipeline: prompt -> llm -> structured output
            result = self.chain.invoke({
                "message": message,
                "country": country,
                "language": language
            })
            
            # Return tuple format expected by existing code
            return (
                result.category,
                result.needs_agency,
                result.suggested_agencies,
                result.response_type
            )
            
        except Exception as e:
            # Fallback to simple response if structured parsing fails
            print(f"⚠️ Intent detection parsing failed, falling back to general: {e}")
            return None, False, [], "general"
