"""
Chain utility functions
"""

import os
from chains.chat_chain import ChatChain
from chains.intent_chain import IntentDetectionChain


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
