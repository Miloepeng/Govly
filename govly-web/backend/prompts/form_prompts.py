"""
Form processing prompt templates
"""

from langchain_core.prompts import ChatPromptTemplate


def get_form_filling_prompt() -> ChatPromptTemplate:
    """Get the form filling prompt template"""
    return ChatPromptTemplate.from_messages([
        ("system", """You are SEA-LION helping fill government forms. 

IMPORTANT INSTRUCTIONS:
1. Analyze the chat history AND user profile to find personal information
2. Map that information to the form fields by name
3. For each field, either provide the value found in chat/profile OR "ASK_USER" if unclear
4. Look for: names, addresses, dates, phone numbers, occupations, etc.
5. Use user profile information when available - it's more reliable than chat
6. Output ONLY valid JSON: {{"fields": [{{"name": "field_name", "value": "value_or_ASK_USER"}}]}}

EXAMPLES:
- If chat says "My name is John Smith" and form has field "name" → {{"name": "name", "value": "John Smith"}}
- If user profile has "Name: John Smith" and form has field "name" → {{"name": "name", "value": "John Smith"}}
- If chat says "I live in Hanoi" and form has field "address" → {{"name": "address", "value": "Hanoi"}}
- If no info found for a field → {{"name": "field_name", "value": "ASK_USER"}}

No explanations, no markdown, just JSON.

User Profile Information:
{user_profile}

Chat history:
{chat_history}"""),
        ("human", "Here is the form schema: {form_schema}")
    ])


def get_form_extraction_prompt() -> ChatPromptTemplate:
    """Get the form field extraction prompt template"""
    return ChatPromptTemplate.from_messages([
        ("system", """You are an expert at analyzing Vietnamese government forms and extracting field information.

Your task is to analyze the provided form text (from OCR) and identify all fields that need to be filled out.

IMPORTANT RULES:
1. Look for fields marked with underscores (_____), empty spaces, or colons (:)
2. Create a SEPARATE field object for EACH field you find - DO NOT combine fields!
3. Common Vietnamese form fields include:
   - Họ và tên (Full name) -> field_name: "ho_va_ten"
   - Địa chỉ (Address) -> field_name: "dia_chi"
   - Số điện thoại (Phone) -> field_name: "so_dien_thoai"
   - CMND/CCCD (ID) -> field_name: "cmnd_cccd"
   - Ngày sinh (Birth date) -> field_name: "ngay_sinh"
   - Nghề nghiệp (Occupation) -> field_name: "nghe_nghiep"
   - Chữ ký (Signature) -> field_name: "chu_ky"
   - Ngày/tháng/năm (Date fields) -> field_name: "ngay_thang_nam"

For each field you find:
1. field_name: Normalize to lowercase with underscores (e.g., "ho_va_ten")
2. field_type: Choose the most appropriate:
   - "text" for general text input
   - "date" for dates
   - "checkbox" for yes/no
   - "signature" for signatures
3. label: Original Vietnamese text (keep diacritics)
4. required: true for essential fields
5. description: Brief explanation in Vietnamese

CRITICAL: Create a SEPARATE field object for EACH field - DO NOT combine fields into one!

Output ONLY valid JSON in this exact format:
{{
    "fields": [
        {{
            "name": "normalized_name",
            "type": "text|date|checkbox|signature",
            "label": "Original Vietnamese text",
            "required": true/false,
            "description": "Field description"
        }}
    ]
}}

EXAMPLE OUTPUT:
{{
    "fields": [
        {{
            "name": "ho_va_ten",
            "type": "text",
            "label": "Họ và tên",
            "required": true,
            "description": "Tên đầy đủ của người nộp đơn"
        }},
        {{
            "name": "cmnd_cccd",
            "type": "text",
            "label": "Số CMND/CCCD",
            "required": true,
            "description": "Số chứng minh nhân dân hoặc căn cước công dân"
        }},
        {{
            "name": "ngay_cap_cmnd",
            "type": "date",
            "label": "Ngày cấp CMND/CCCD",
            "required": true,
            "description": "Ngày cấp chứng minh nhân dân hoặc căn cước công dân"
        }},
        {{
            "name": "dia_chi",
            "type": "text",
            "label": "Địa chỉ",
            "required": true,
            "description": "Địa chỉ thường trú"
        }},
        {{
            "name": "ngay_thang_nam",
            "type": "date",
            "label": "Ngày tháng năm",
            "required": true,
            "description": "Ngày tháng năm khai báo"
        }},
        {{
            "name": "chu_ky",
            "type": "signature",
            "label": "Chữ ký",
            "required": true,
            "description": "Chữ ký người khai"
        }}
    ]
}}

Be thorough - extract ALL fields that need user input. The frontend will use this schema to render the form."""),
        ("human", "Here is the OCR text from a Vietnamese form. Please extract all fields that need to be filled out: {form_text}")
    ])
