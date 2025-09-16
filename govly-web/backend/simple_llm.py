"""
Simple SEA-LION LLM wrapper for LangChain compatibility
"""

import requests
from typing import Any, Dict, List, Optional, Union
import os
import time
from langchain_core.language_models.llms import LLM
from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from pydantic import Field


class SimpleSeaLionLLM(LLM):
    """Simple wrapper for SEA-LION API to work with LangChain"""
    
    # Configuration fields for the SEA-LION API
    api_key: str = Field(description="SEA-LION API key")
    model: str = Field(default=os.getenv("SEA_LION_MODEL", "aisingapore/Llama-SEA-LION-v3-70B-IT"), description="Model name")
    temperature: float = Field(default=0.7, description="Temperature for generation")
    max_tokens: int = Field(default=150, description="Maximum tokens to generate")
    base_url: str = Field(default="https://api.sea-lion.ai/v1", description="API base URL")
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """Call the SEA-LION API"""
        
        # Configurable resilience - increased defaults due to connectivity issues
        max_retries = int(os.getenv("SEA_LION_RETRIES", "3"))
        request_timeout = int(os.getenv("SEA_LION_TIMEOUT", "60"))
        fallback_model = os.getenv("SEA_LION_FALLBACK_MODEL", "")

        # Cache of available models to avoid repeated calls
        available_models: Optional[List[str]] = None

        def fetch_models() -> List[str]:
            nonlocal available_models
            if available_models is not None:
                return available_models
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            try:
                resp = requests.get(f"{self.base_url}/models", headers=headers, timeout=20)
                if resp.status_code == 200:
                    data = resp.json()
                    # Accept both {data:[{id:...}]} and simple list forms
                    if isinstance(data, dict) and "data" in data:
                        models = [m.get("id") for m in data["data"] if m.get("id")]
                    elif isinstance(data, list):
                        models = [m.get("id") for m in data if isinstance(m, dict) and m.get("id")]
                    else:
                        models = []
                    available_models = models
                    return models
                else:
                    print(f"⚠️ Failed to fetch SEA-LION models: {resp.status_code} - {resp.text}")
                    return []
            except Exception as e:
                print(f"⚠️ Error fetching SEA-LION models: {e}")
                return []

        def call_model(model_name: str) -> Optional[str]:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "messages": [{"role": "user", "content": prompt}],
                "model": model_name,
                "temperature": self.temperature,
                "max_completion_tokens": self.max_tokens,
                "thinking_mode": "off"
            }
            try:
                response = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=request_timeout
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                # Treat 5xx and connection-like errors as retryable
                if 500 <= response.status_code < 600:
                    raise Exception(f"SEA-LION API error: {response.status_code} - {response.text}")
                # Non-retryable error handling: if 400 invalid model, try discover models
                if response.status_code == 400 and "Invalid model name" in response.text:
                    print(f"❌ SEA-LION non-retryable error (invalid model): {response.text}")
                    models = fetch_models()
                    # Prefer any model containing 'SEA-LION' and 'IT'
                    preferred = [m for m in models if isinstance(m, str) and "SEA-LION" in m and m.endswith("-IT")]
                    candidate = preferred[0] if preferred else (models[0] if models else None)
                    if candidate:
                        return call_model(candidate)
                    return None
                print(f"❌ SEA-LION non-retryable error: {response.status_code} - {response.text}")
                return None
            except Exception as e:
                error_msg = str(e)
                print(f"❌ SEA-LION API call failed: {error_msg}")
                # Log specific connection errors
                if "Connection error" in error_msg or "ConnectionError" in error_msg:
                    print("🔌 SEA-LION API connectivity issue detected - service may be down")
                elif "timeout" in error_msg.lower():
                    print("⏰ SEA-LION API timeout - service may be slow")
                return None

        # Try primary model with retries
        for attempt in range(max_retries + 1):
            result = call_model(self.model)
            if result:
                return result
            # Exponential backoff
            if attempt < max_retries:
                sleep_s = min(2 ** attempt, 8)
                time.sleep(sleep_s)

        # Fallback to alternate model
        if not fallback_model:
            # Discover a fallback from /models if env not provided
            models = fetch_models()
            # Choose a smaller SEA-LION IT variant if possible
            candidates = [m for m in models if isinstance(m, str) and "SEA-LION" in m and m.endswith("-IT") and "70B" not in m]
            fallback_model = candidates[0] if candidates else (models[0] if models else "")

        if fallback_model and fallback_model != self.model:
            for attempt in range(max_retries + 1):
                result = call_model(fallback_model)
                if result:
                    return result
                if attempt < max_retries:
                    sleep_s = min(2 ** attempt, 8)
                    time.sleep(sleep_s)

        # Final graceful fallback text (avoid propagating error strings)
        print("⚠️ All SEA-LION API attempts failed, using fallback response")
        return (
            "I'm experiencing connectivity issues with the AI service. "
            "This appears to be a temporary service outage. Please try again in a few minutes. "
            "If the issue persists, the service provider may be experiencing downtime."
        )
    
    @property
    def _llm_type(self) -> str:
        """Return identifier of LLM type"""
        return "sea_lion"
    
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        """Get the identifying parameters"""
        return {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens
        }
