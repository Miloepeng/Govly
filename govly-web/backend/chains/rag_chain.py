"""
RAG (Retrieval-Augmented Generation) chain implementation
"""

from typing import List, Dict, Any
from langchain_core.output_parsers import PydanticOutputParser
from simple_llm import SimpleSeaLionLLM
from models.response_models import DocumentExplanationResponse
from prompts.rag_prompts import get_document_explanation_prompt


class DocumentExplanationChain:
    """LangChain-based document explanation handler"""
    
    def __init__(self, api_key: str):
        # Initialize SEA-LION LLM with default settings
        self.llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.3,
            max_tokens=800
        )
        
        # Create prompt template for document explanation
        self.prompt = get_document_explanation_prompt()
        
        # Create output parser for structured JSON response
        self.output_parser = PydanticOutputParser(pydantic_object=DocumentExplanationResponse)
        
        # Create processing pipeline: prompt -> llm -> output parser
        self.chain = self.prompt | self.llm | self.output_parser
    
    def format_document_context(self, documents: List[Dict[str, Any]]) -> str:
        """Format documents for the prompt context"""
        if not documents:
            return "No documents available"
        
        doc_context = ""
        for i, doc in enumerate(documents, 1):
            doc_context += f"\nDocument {i}:\n"
            doc_context += f"Title: {doc.get('title', 'No title')}\n"
            doc_context += f"Content: {doc.get('content', 'No content')[:500]}...\n"
            doc_context += f"URL: {doc.get('url', 'No URL')}\n"
            doc_context += f"Relevance: {doc.get('similarity', 'Unknown')}\n"
        
        return doc_context
    
    def explain_documents(self, user_query: str, documents: List[Dict[str, Any]], 
                         document_type: str, country: str = "Vietnam", 
                         language: str = "Vietnamese") -> Dict[str, Any]:
        """Process document explanation using LangChain pipeline"""
        
        # Format document context for the prompt
        doc_context = self.format_document_context(documents)
        
        try:
            # Use prompt + LLM for text response (simpler approach)
            simple_chain = self.prompt | self.llm
            
            result = simple_chain.invoke({
                "user_query": user_query,
                "documents": documents,
                "document_type": document_type,
                "doc_context": doc_context,
                "language": language
            })
            
            # Try to parse JSON from the result
            try:
                import json
                parsed_result = json.loads(result)
                return parsed_result
            except:
                # If not JSON, return as explanation text
                return {
                    "explanation": result,
                    "document_type": document_type,
                    "documents": documents,
                    "user_query": user_query
                }
            
        except Exception as e:
            print(f"⚠️ Document explanation failed: {e}")
            
            return {
                "explanation": f"I apologize, but I encountered an error while processing your request. Please try again.",
                "document_type": document_type,
                "documents": documents,
                "user_query": user_query
            }
