"""
Agency selection chain implementation
"""

from typing import List, Dict, Any, Optional
from langchain_core.output_parsers import PydanticOutputParser
from simple_llm import SimpleSeaLionLLM
from models.response_models import AgencySelectionResponse, AgencyDetectionResponse
from prompts.agency_prompts import get_agency_selection_prompt, get_agency_detection_prompt


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
    
    def format_chat_history(self, conversation_context: List[Dict[str, Any]]) -> List:
        """Convert conversation array to LangChain message format"""
        if not conversation_context:
            return []
        
        # Convert to LangChain message format using proper message objects
        from langchain_core.messages import HumanMessage, AIMessage
        
        formatted_messages = []
        for msg in conversation_context:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role in ["user", "assistant"] and content:
                # Convert to proper LangChain message objects
                if role == "user":
                    formatted_messages.append(HumanMessage(content=content))
                else:
                    formatted_messages.append(AIMessage(content=content))
        
        return formatted_messages
    
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


class AgencyDetectionChain:
    """LangChain-based agency detection handler"""
    
    def __init__(self, api_key: str):
        # Initialize SEA-LION LLM with default settings
        self.llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.1,  # Low temperature for consistent JSON output
            max_tokens=200
        )
        
        # Create prompt template for agency detection
        self.prompt = get_agency_detection_prompt()
        
        # Create output parser for structured JSON response
        self.output_parser = PydanticOutputParser(pydantic_object=AgencyDetectionResponse)
        
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
    
    def detect_agency(self, query: str, country: str, 
                     conversation_context: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process agency detection using LangChain pipeline"""
        
        # Country-specific agency mapping (same as original endpoint)
        country_agencies = {
            "Vietnam": {
                "housing": ["Ministry of Construction", "Housing Development Authority", "Urban Development Agency"],
                "land": ["Ministry of Natural Resources", "Land Administration Department", "Planning Institute"],
                "immigration": ["Immigration Department", "Ministry of Public Security", "Border Guard Command"],
                "employment": ["Ministry of Labor", "Social Insurance Agency", "Employment Service Center"],
                "transport": ["Ministry of Transport", "Traffic Police", "Public Transport Authority"],
                "environment": ["Ministry of Environment", "Environmental Protection Agency", "Forest Protection Department"],
                "business": ["Ministry of Planning", "Business Registration Office", "Tax Department"],
                "education": ["Ministry of Education", "University System", "Vocational Training Authority"]
            },
            "Singapore": {
                "housing": ["Housing Development Board (HDB)", "Urban Redevelopment Authority (URA)"],
                "land": ["Urban Redevelopment Authority (URA)", "Singapore Land Authority (SLA)"],
                "immigration": ["Immigration & Checkpoints Authority (ICA)", "Ministry of Home Affairs"],
                "employment": ["Ministry of Manpower (MOM)", "Central Provident Fund (CPF)"],
                "transport": ["Land Transport Authority (LTA)", "Public Transport Council"],
                "environment": ["National Environment Agency (NEA)", "Public Utilities Board"],
                "business": ["Accounting and Corporate Regulatory Authority (ACRA)", "Enterprise Singapore"],
                "education": ["Ministry of Education (MOE)", "SkillsFuture Singapore"]
            },
            "Thailand": {
                "housing": ["Ministry of Interior", "Department of Public Works", "Bangkok Metropolitan Administration"],
                "land": ["Department of Lands", "Ministry of Natural Resources", "Town Planning Department"],
                "immigration": ["Immigration Bureau", "Ministry of Foreign Affairs", "Royal Thai Police"],
                "employment": ["Ministry of Labor", "Social Security Office", "Department of Employment"],
                "transport": ["Ministry of Transport", "Department of Highways", "Bangkok Mass Transit Authority"],
                "environment": ["Ministry of Natural Resources", "Pollution Control Department", "Department of Environmental Quality"],
                "business": ["Department of Business Development", "Ministry of Commerce", "Board of Investment"],
                "education": ["Ministry of Education", "Office of Higher Education Commission", "Department of Non-Formal Education"]
            }
        }
        
        # Get agencies list for the country
        agencies_list = "\n".join([
            f"- {agency}" 
            for category_agencies in country_agencies.get(country, {}).values() 
            for agency in category_agencies
        ])
        
        # Convert conversation array to formatted string
        chat_history = self.format_chat_history(conversation_context or [])
        
        try:
            # Run the complete pipeline: prompt -> llm -> structured output
            result = self.chain.invoke({
                "query": query,
                "country": country,
                "agencies_list": agencies_list,
                "chat_history": chat_history if chat_history else "No previous conversation"
            })
            
            return {
                "needs_agency": result.needs_agency,
                "agency": result.agency,
                "confidence": result.confidence,
                "reasoning": result.reasoning
            }
            
        except Exception as e:
            # Fallback to simple response if structured parsing fails
            print(f"⚠️ Agency detection parsing failed, falling back to simple response: {e}")
            
            # Use prompt + LLM without output parsing for basic text response
            simple_chain = self.prompt | self.llm
            
            simple_result = simple_chain.invoke({
                "query": query,
                "country": country,
                "agencies_list": agencies_list,
                "chat_history": chat_history if chat_history else "No previous conversation"
            })
            
            return {
                "needs_agency": False,
                "agency": None,
                "confidence": 0.0,
                "reasoning": "Could not determine agency from response"
            }
