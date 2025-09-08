"""
LangChain components for Govly backend
"""

import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.memory import ConversationBufferMemory
from langchain_core.chains import LLMChain
from simple_llm import SimpleSeaLionLLM


class ChatResponse(BaseModel):
    """Structured response for chat endpoint - ensures consistent output format"""
    response: str = Field(description="The main response text")
    follow_up_questions: List[str] = Field(default=[], description="Follow-up questions to ask the user")


class IntentDetectionResponse(BaseModel):
    """Structured response for intent detection - ensures consistent JSON output"""
    category: Optional[str] = Field(description="Government service category or null")
    needs_agency: bool = Field(description="Whether user needs specialized agency help")
    suggested_agencies: List[str] = Field(default=[], description="List of relevant government agencies")
    response_type: str = Field(description="Routing decision: ragLink, ragForm, agency, or general")
    reasoning: str = Field(description="Brief explanation of the routing decision")


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
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a government agency advisor from {country}, responding in {language}.{agency_context} Your main job is to advise people on relevant policies, laws, actions to take, and what kind of applications or appeals they can sign up for.

IMPORTANT: Be proactive and inquisitive! Don't just answer the surface question - dig deeper to understand the user's real problem and needs.

ALWAYS ask follow-up questions to gather more information:
- If they mention a problem, ask about specific details, timeline, location
- If they ask about requirements, ask about their specific situation
- If they want to apply for something, ask about their eligibility, documents, timeline
- If they have a complaint, ask about when it happened, who was involved, what they've tried
- If they need help with forms, ask about their specific circumstances

Examples of good follow-up questions:
- "When did this issue occur?"
- "What specific documents do you have?"
- "Have you tried contacting anyone else about this?"
- "What is your current situation regarding [topic]?"
- "Do you have any supporting evidence or documentation?"
- "What is your timeline for resolving this?"

Give informative, helpful answers as a government representative. Be direct, factual, and authoritative. Consider the full conversation context and provide country-specific information when relevant.

End your response with 1-2 specific follow-up questions to better understand their situation and provide more targeted help."""),
            ("placeholder", "{chat_history}"),
            ("human", "{message}")
        ])
        
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
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI assistant that analyzes user messages to determine their intent and routing needs.

Analyze the user's message and determine:
1. What category of government service they need (if any)
2. Whether they need specialized help from a government agency
3. Suggest relevant government agencies for their country
4. Whether they need documents/policies (ragLink) or forms (ragForm)

IMPORTANT ROUTING RULES:
- If user asks for "policies", "documents", "regulations", "laws", "rules", "guidelines", "information", "show me", "find", "search", "what are the", "how to", "requirements" -> route to ragLink
- If user asks for "forms", "applications", "appeals", "submit", "fill out", "download", "apply for", "request", "petition", "complaint form" -> route to ragForm
- If user needs agency help but doesn't specify documents/forms -> route to agency selection
- If user just wants general advice or has vague questions -> route to general chat for more probing questions

ROUTING DECISIONS:
- Vague questions like "I need help", "What should I do?", "I have a problem" -> route to general chat (AI will ask probing questions)
- Specific requests for documents/forms -> route to ragLink/ragForm
- Agency-specific questions -> route to agency selection
- Complex situations needing clarification -> route to general chat for detailed questioning

Available categories:
- housing: Housing, accommodation, real estate, construction
- land: Land use, property, planning, permits, development
- immigration: Passports, visas, citizenship, residence permits
- employment: Work, jobs, labor laws, contracts, permits
- transport: Driving licenses, vehicle registration, public transport
- environment: Environmental protection, waste management, pollution
- business: Business registration, taxes, investment, trade
- education: Schools, universities, training, courses

Respond with ONLY a JSON object in this exact format:
{{
    "category": "category_name" or null,
    "needs_agency": true/false,
    "suggested_agencies": ["Agency 1", "Agency 2"],
    "response_type": "ragLink" or "ragForm" or "agency" or "general",
    "reasoning": "Brief explanation of your decision"
}}
If the user doesn't need specialized agency help, set category to null, needs_agency to false, and suggested_agencies to empty array.
Suggest 2-3 relevant government agencies for their specific country and category.

Examples:
- "show me housing policies" -> {{"response_type": "ragLink", "category": "housing", ...}}
- "I want to submit a form" -> {{"response_type": "ragForm", "category": null, ...}}
- "which agency handles immigration?" -> {{"response_type": "agency", "category": "immigration", ...}}
- "what are the requirements?" -> {{"response_type": "ragLink", "category": null, ...}}
- "I need help" -> {{"response_type": "general", "category": null, ...}} (AI will ask probing questions)
- "I have a problem" -> {{"response_type": "general", "category": null, ...}} (AI will ask probing questions)"""),
            ("human", "User message: {message}\nCountry: {country}\nLanguage: {language}")
        ])
        
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


# Global chain instances - singleton pattern for efficiency
_chat_chain = None
_intent_chain = None

def get_chat_chain() -> ChatChain:
    """Get or create the global chat chain instance - lazy initialization"""
    global _chat_chain
    if _chat_chain is None:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise ValueError("SEA_LION_API_KEY not found")
        _chat_chain = ChatChain(api_key)
    return _chat_chain

def get_intent_chain() -> IntentDetectionChain:
    """Get or create the global intent detection chain instance - lazy initialization"""
    global _intent_chain
    if _intent_chain is None:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise ValueError("SEA_LION_API_KEY not found")
        _intent_chain = IntentDetectionChain(api_key)
    return _intent_chain
