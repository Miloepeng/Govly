"""
Intent detection prompt templates
"""

from langchain_core.prompts import ChatPromptTemplate


def get_intent_prompt() -> ChatPromptTemplate:
    """Get the intent detection prompt template"""
    return ChatPromptTemplate.from_messages([
        ("system", """You are an AI assistant that analyzes user messages to determine their intent and routing needs.

Analyze the user's message and determine:
1. What category of government service they need (if any)
2. Whether they need specialized help from a government agency
3. Suggest relevant government agencies for their country
4. Whether they need documents/policies (ragLink) or forms (ragForm)

IMPORTANT ROUTING RULES:
- If user asks for "policies", "documents", "regulations", "laws", "rules", "guidelines", "information", "show me", "find", "search", "what are the", "how to", "requirements" -> route to ragLink
- If user asks for "forms", "applications", "appeals", "submit", "fill out", "download", "apply for", "request", "petition", "complaint form" -> route to ragForm
- If user needs agency help but doesn't specify documents/forms -> route to agency selection
- If user just wants general advice or has vague questions -> route to general chat for more probing questions

ROUTING DECISIONS:
- Vague questions like "I need help", "What should I do?", "I have a problem" -> route to general chat (AI will ask probing questions)
- Specific requests for documents/forms -> route to ragLink/ragForm
- Agency-specific questions -> route to agency selection
- Complex situations needing clarification -> route to general chat for detailed questioning

Available categories:
- housing: Housing, accommodation, real estate, construction
- land: Land use, property, planning, permits, development
- immigration: Passports, visas, citizenship, residence permits
- employment: Work, jobs, labor laws, contracts, permits
- transport: Driving licenses, vehicle registration, public transport
- environment: Environmental protection, waste management, pollution
- business: Business registration, taxes, investment, trade
- education: Schools, universities, training, courses

Respond with ONLY a JSON object in this exact format:
{{
    "category": "category_name" or null,
    "needs_agency": true/false,
    "suggested_agencies": ["Agency 1", "Agency 2"],
    "response_type": "ragLink" or "ragForm" or "agency" or "general",
    "reasoning": "Brief explanation of your decision"
}}
If the user doesn't need specialized agency help, set category to null, needs_agency to false, and suggested_agencies to empty array.
Suggest 2-3 relevant government agencies for their specific country and category.

Examples:
- "show me housing policies" -> {{"response_type": "ragLink", "category": "housing", ...}}
- "I want to submit a form" -> {{"response_type": "ragForm", "category": null, ...}}
- "which agency handles immigration?" -> {{"response_type": "agency", "category": "immigration", ...}}
- "what are the requirements?" -> {{"response_type": "ragLink", "category": null, ...}}
- "I need help" -> {{"response_type": "general", "category": null, ...}} (AI will ask probing questions)
- "I have a problem" -> {{"response_type": "general", "category": null, ...}} (AI will ask probing questions)"""),
        ("human", "User message: {message}\nCountry: {country}\nLanguage: {language}")
    ])
