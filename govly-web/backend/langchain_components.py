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
    """Structured response for chat endpoint"""
    response: str = Field(description="The main response text")
    follow_up_questions: List[str] = Field(default=[], description="Follow-up questions to ask the user")


class ChatChain:
    """LangChain-based chat handler"""
    
    def __init__(self, api_key: str):
        self.llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.7,
            max_tokens=150
        )
        
        # Create prompt template
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
        
        # Create output parser
        self.output_parser = PydanticOutputParser(pydantic_object=ChatResponse)
        
        # Create chain: prompt -> llm -> output parser
        self.chain = self.prompt | self.llm | self.output_parser
    
    def format_chat_history(self, conversation_context: List[Dict[str, Any]]) -> str:
        """Format conversation context for the prompt"""
        if not conversation_context:
            return ""
        
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
        """Process chat request using LangChain"""
        
        # Update LLM settings if provided
        if settings:
            self.llm.temperature = settings.get("temperature", 0.7)
            self.llm.max_tokens = settings.get("maxTokens", 150)
        
        # Format agency context
        agency_context = f" You are specifically representing the {selected_agency} agency." if selected_agency else ""
        
        # Format chat history
        chat_history = self.format_chat_history(conversation_context or [])
        
        try:
            # Invoke the chain (synchronous)
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
            # Fallback to simple response if structured parsing fails
            print(f"⚠️ LangChain parsing failed, falling back to simple response: {e}")
            
            # Create a simple chain without output parsing
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


# Global chat chain instance
_chat_chain = None

def get_chat_chain() -> ChatChain:
    """Get or create the global chat chain instance"""
    global _chat_chain
    if _chat_chain is None:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise ValueError("SEA_LION_API_KEY not found")
        _chat_chain = ChatChain(api_key)
    return _chat_chain
