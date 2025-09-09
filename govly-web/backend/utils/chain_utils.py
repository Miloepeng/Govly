"""
Chain utility functions
"""

import os
from chains.chat_chain import ChatChain
from chains.intent_chain import IntentDetectionChain
from chains.agency_chain import AgencySelectionChain, AgencyDetectionChain
from chains.rag_chain import DocumentExplanationChain
from chains.form_chain import FormProcessingChain


# Global chain instances - singleton pattern for efficiency
_chat_chain = None
_intent_chain = None
_agency_chain = None
_agency_detection_chain = None
_rag_chain = None
_form_chain = None


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


def get_agency_chain() -> AgencySelectionChain:
    """Get or create the global agency selection chain instance - lazy initialization"""
    global _agency_chain
    if _agency_chain is None:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise ValueError("SEA_LION_API_KEY not found")
        _agency_chain = AgencySelectionChain(api_key)
    return _agency_chain


def get_agency_detection_chain() -> AgencyDetectionChain:
    """Get or create the global agency detection chain instance - lazy initialization"""
    global _agency_detection_chain
    if _agency_detection_chain is None:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise ValueError("SEA_LION_API_KEY not found")
        _agency_detection_chain = AgencyDetectionChain(api_key)
    return _agency_detection_chain


def get_rag_chain() -> DocumentExplanationChain:
    """Get or create the global RAG chain instance - lazy initialization"""
    global _rag_chain
    if _rag_chain is None:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise ValueError("SEA_LION_API_KEY not found")
        _rag_chain = DocumentExplanationChain(api_key)
    return _rag_chain


def get_form_chain() -> FormProcessingChain:
    """Get or create the global form processing chain instance - lazy initialization"""
    global _form_chain
    if _form_chain is None:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise ValueError("SEA_LION_API_KEY not found")
        _form_chain = FormProcessingChain(api_key)
    return _form_chain
