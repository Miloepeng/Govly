"""
Pydantic models for LangChain responses
"""

from typing import List, Optional
from pydantic import BaseModel, Field


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


class RAGResponse(BaseModel):
    """Structured response for RAG queries"""
    explanation: str = Field(description="Explanation of how documents relate to query")
    documents: List[dict] = Field(default=[], description="List of retrieved documents")
    document_type: str = Field(description="Type of documents: ragLink or ragForm")
    user_query: str = Field(description="Original user query")


class DocumentExplanationResponse(BaseModel):
    """Structured response for document explanation"""
    explanation: str = Field(description="Explanation of how documents relate to user query")
    document_type: str = Field(description="Type of documents: ragLink or ragForm")
    documents: List[dict] = Field(default=[], description="List of documents that were explained")
    user_query: str = Field(description="Original user query")


class FormFillResponse(BaseModel):
    """Structured response for form filling"""
    fields: List[dict] = Field(description="List of form fields with values")
    confidence: float = Field(default=0.0, description="Confidence score for form filling")
    missing_fields: List[str] = Field(default=[], description="Fields that need user input")


class AgencySelectionResponse(BaseModel):
    """Structured response for agency selection"""
    response: str = Field(description="The main response text with agency guidance")
    suggested_agency: Optional[str] = Field(description="Primary recommended agency")
    available_agencies: List[str] = Field(default=[], description="List of all relevant agencies")
    follow_up_questions: List[str] = Field(default=[], description="Questions to gather more context")
    category: Optional[str] = Field(description="Government service category")


class AgencyDetectionResponse(BaseModel):
    """Structured response for agency detection"""
    needs_agency: bool = Field(description="Whether user needs specialized agency help")
    agency: Optional[str] = Field(description="Recommended agency name or null")
    confidence: float = Field(description="Confidence score 0.0-1.0")
    reasoning: str = Field(description="Brief explanation of why this agency is needed")
