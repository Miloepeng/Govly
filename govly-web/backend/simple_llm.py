"""
Simple SEA-LION LLM wrapper for LangChain compatibility
"""

import requests
from typing import Any, Dict, List, Optional, Union
from langchain_core.language_models.llms import LLM
from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from pydantic import Field


class SimpleSeaLionLLM(LLM):
    """Simple wrapper for SEA-LION API to work with LangChain"""
    
    # Configuration fields for the SEA-LION API
    api_key: str = Field(description="SEA-LION API key")
    model: str = Field(default="aisingapore/Llama-SEA-LION-v3-70B-IT", description="Model name")
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
        
        # Set up authentication headers for the API request
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Format the prompt and settings for SEA-LION API
        payload = {
            "messages": [{"role": "user", "content": prompt}],
            "model": self.model,
            "temperature": self.temperature,
            "max_completion_tokens": self.max_tokens,
            "thinking_mode": "off"  # Disable thinking mode for faster responses
        }
        
        try:
            # Make the HTTP request to SEA-LION API
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            # Extract the response text if successful
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                raise Exception(f"SEA-LION API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            # Return error message if API call fails
            print(f"❌ SEA-LION API call failed: {e}")
            return f"Error: Unable to generate response ({str(e)})"
    
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
