"""
Form processing chain implementation
"""

from typing import List, Dict, Any
import json
import re
from langchain_core.output_parsers import PydanticOutputParser
from simple_llm import SimpleSeaLionLLM
from models.response_models import FormFillResponse
from prompts.form_prompts import get_form_filling_prompt, get_form_extraction_prompt


class FormProcessingChain:
    """LangChain-based form processing handler"""
    
    def __init__(self, api_key: str):
        # Initialize SEA-LION LLM with default settings
        self.llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.1,  # Low temperature for consistent JSON output
            max_tokens=2000
        )
        
        # Create prompt templates
        self.form_filling_prompt = get_form_filling_prompt()
        self.form_extraction_prompt = get_form_extraction_prompt()
        
        # Create output parser for structured JSON response
        self.output_parser = PydanticOutputParser(pydantic_object=FormFillResponse)
    
    def format_chat_history(self, chat_history: List[Dict[str, Any]]) -> str:
        """Convert chat history to formatted string for prompt"""
        if not chat_history:
            return ""
        
        formatted_messages = []
        for msg in chat_history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role in ["user", "assistant"] and content:
                formatted_messages.append(f"{role.title()}: {content}")
        
        return "\n".join(formatted_messages)
    
    def clean_llm_output(self, text: str) -> str:
        """Remove markdown fences and stray chars from LLM JSON output."""
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)  # remove leading ```json
        text = re.sub(r"```$", "", text)              # remove trailing ```
        return text.strip()
    
    def try_parse_json(self, text: str):
        """Robust JSON parsing with multiple fallback strategies"""
        text = self.clean_llm_output(text)

        # First: direct parse
        try:
            return json.loads(text)
        except Exception:
            pass

        # Second: extract full { ... }
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            json_str = match.group(0)
            json_str = re.sub(r"[\x00-\x1F\x7F]", "", json_str)
            try:
                return json.loads(json_str)
            except Exception:
                pass

        # Third: salvage just the "fields" array
        match = re.search(r'\"fields\"\s*:\s*\[.*', text, re.DOTALL)
        if match:
            arr_str = match.group(0)

            # Close dangling quotes
            if arr_str.count('"') % 2 == 1:
                arr_str += '"'

            # Ensure closing ]
            if not arr_str.endswith("]"):
                arr_str += "]"

            json_str = "{ " + arr_str + " }"
            json_str = re.sub(r"[\x00-\x1F\x7F]", "", json_str)

            try:
                return json.loads(json_str)
            except Exception:
                # Last resort: drop any trailing incomplete object
                fixed = re.sub(r",\s*{[^}]*$", "", arr_str) + "]"
                json_str = "{ " + fixed + " }"
                return json.loads(json_str)

        raise ValueError("Unable to parse JSON")
    
    def fill_form(self, form_schema: Dict[str, Any], chat_history: List[Dict[str, Any]], user_profile: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process form filling using LangChain pipeline"""
        
        # Validate input
        if not form_schema or not form_schema.get('fields'):
            raise ValueError("Invalid form schema")
        
        if len(chat_history) > 50:
            raise ValueError("Chat history too long. Please keep conversations shorter.")
        
        # Limit chat history to last 10 messages to reduce processing time
        limited_chat = chat_history[-10:] if len(chat_history) > 10 else chat_history
        limited_formatted_chat = self.format_chat_history(limited_chat)
        
        # Format user profile for prompt
        formatted_profile = ""
        if user_profile:
            profile_info = []
            if user_profile.get('full_name'):
                profile_info.append(f"Name: {user_profile['full_name']}")
            if user_profile.get('email'):
                profile_info.append(f"Email: {user_profile['email']}")
            if user_profile.get('phone_number'):
                profile_info.append(f"Phone: {user_profile['phone_number']}")
            if user_profile.get('address'):
                profile_info.append(f"Address: {user_profile['address']}")
            if user_profile.get('id_number'):
                profile_info.append(f"ID Number: {user_profile['id_number']}")
            if user_profile.get('date_of_birth'):
                profile_info.append(f"Date of Birth: {user_profile['date_of_birth']}")
            if user_profile.get('nationality'):
                profile_info.append(f"Nationality: {user_profile['nationality']}")
            if user_profile.get('occupation'):
                profile_info.append(f"Occupation: {user_profile['occupation']}")
            
            if profile_info:
                formatted_profile = "User Profile Information:\n" + "\n".join(profile_info) + "\n\n"
        
        # Create processing pipeline: prompt -> llm
        chain = self.form_filling_prompt | self.llm
        
        try:
            # Run the pipeline
            result = chain.invoke({
                "form_schema": form_schema,
                "chat_history": limited_formatted_chat,
                "user_profile": formatted_profile
            })
            
            # Parse the JSON response
            parsed_result = self.try_parse_json(result)
            
            return parsed_result
            
        except Exception as e:
            print(f"⚠️ Form filling failed: {e}")
            # Return empty fields as fallback
            return {
                "fields": [
                    {"name": field.get("name", "unknown"), "value": "ASK_USER"}
                    for field in form_schema.get("fields", [])
                ]
            }
    
    def extract_form_fields(self, form_text: str) -> Dict[str, Any]:
        """Process form field extraction using LLM"""
        
        if not form_text or not form_text.strip():
            return {
                "fields": [
                    {
                        "name": "manual_entry",
                        "type": "text",
                        "label": "Manual Entry",
                        "required": False,
                        "description": "⚠️ No text provided, please fill manually"
                    }
                ]
            }

        # Create processing pipeline: prompt -> llm
        chain = self.form_extraction_prompt | self.llm
        
        try:
            # Run the pipeline with the form text
            result = chain.invoke({
                "form_text": form_text
            })
            
            # Parse the JSON response
            parsed_result = self.try_parse_json(result)
            
            # If we got a valid response with fields, return it
            if isinstance(parsed_result, dict) and "fields" in parsed_result:
                fields = parsed_result["fields"]
                if isinstance(fields, list) and fields:
                    # Ensure each field has the required structure
                    normalized_fields = []
                    for field in fields:
                        if isinstance(field, dict):
                            normalized_field = {
                                "name": field.get("name", "unnamed_field"),
                                "type": field.get("type", "text"),
                                "label": field.get("label", field.get("name", "Unnamed field")),
                                "required": field.get("required", True),
                                "description": field.get("description", "")
                            }
                            normalized_fields.append(normalized_field)
                    
                    if normalized_fields:
                        return {"fields": normalized_fields}
            
            # If we got a different structure but it has fields, adapt it
            if isinstance(parsed_result, dict) and "form_fields" in parsed_result:
                fields = parsed_result["form_fields"]
                if isinstance(fields, list) and fields:
                    # Convert old format to new format
                    normalized_fields = []
                    for field in fields:
                        if isinstance(field, dict):
                            normalized_field = {
                                "name": field.get("field_name", "unnamed_field"),
                                "type": field.get("field_type", "text").replace("_input", ""),
                                "label": field.get("field_name", "Unnamed field"),
                                "required": field.get("required", True),
                                "description": field.get("description", "")
                            }
                            normalized_fields.append(normalized_field)
                    
                    if normalized_fields:
                        return {"fields": normalized_fields}
            
            # If we got a description field, split it into multiple fields
            if isinstance(parsed_result, dict) and any(isinstance(f, dict) and "description" in f for f in parsed_result.get("fields", [])):
                fields = parsed_result.get("fields", [])
                for field in fields:
                    if "description" in field and isinstance(field["description"], str):
                        # Split description by | and create separate fields
                        descriptions = [d.strip() for d in field["description"].split("|") if d.strip()]
                        if len(descriptions) > 1:
                            normalized_fields = []
                            for i, desc in enumerate(descriptions):
                                normalized_field = {
                                    "name": f"field_{i+1}",
                                    "type": "text",
                                    "label": desc,
                                    "required": True,
                                    "description": desc
                                }
                                normalized_fields.append(normalized_field)
                            return {"fields": normalized_fields}
            
            # Fallback to generic field if parsing failed
            return {
                "fields": [{
                    "name": "form_content",
                    "type": "text",
                    "label": "Form Content",
                    "required": True,
                    "description": "Please fill out the form content"
                }]
            }
            
        except Exception as e:
            print(f"⚠️ Form field extraction failed: {e}")
            return {
                "fields": [{
                    "name": "form_content",
                    "type": "text",
                    "label": "Form Content",
                    "required": True,
                    "description": "Error extracting fields, please fill manually"
                }]
            }
