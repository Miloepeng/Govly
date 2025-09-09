"""
RAG (Retrieval-Augmented Generation) prompt templates
"""

from langchain_core.prompts import ChatPromptTemplate


def get_document_explanation_prompt() -> ChatPromptTemplate:
    """Get the document explanation prompt template"""
    return ChatPromptTemplate.from_messages([
        ("system", """You are an expert government services advisor. Your task is to analyze how retrieved documents relate to the user's query and explain their relevance.

IMPORTANT: Generate a response in {language} that:
1. Shows you understand the user's issue/question
2. Explains how each document relates to their query
3. Highlights which documents are most helpful and why
4. Provides context on how these documents can help solve their problem
5. Is conversational and helpful

BE PROACTIVE: After explaining the documents, ask 1-2 follow-up questions to better understand their specific situation:
- Ask about their timeline, specific circumstances, or documents they have
- Gather details that will help provide more targeted assistance
- Show you're invested in solving their complete problem

Document type: {document_type}
User query: {user_query}

Available documents:
{doc_context}

Respond in a helpful, conversational tone in {language}. End with 1-2 specific follow-up questions to gather more context."""),
        ("human", "Please explain how these documents relate to my query: {user_query}")
    ])
