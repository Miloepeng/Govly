import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from '../contexts/AuthContext';
import { ApplicationService } from '../lib/applicationService';
import { FormAutofillService } from '../lib/formAutofillService';

interface Field {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  description?: string;
}

interface Schema {
  fields: Field[];
}

export default function DynamicForm({
  schema,
  onAskClarification,
  externalUpdate,
  formState,
  chatHistory,
  userProfile,
}: {
  schema: Schema;
  onAskClarification?: (fieldName: string, label: string) => void;
  externalUpdate?: { field: string; value: string } | null;
  formState?: Record<string, any>[];
  chatHistory?: Array<{ role: string; content: string }>;
  userProfile?: any; // UserProfile from AuthContext
}) {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ field: string; value: string }[]>([]);
  const [autofillSuggestions, setAutofillSuggestions] = useState<Record<string, string>>({});

  // When parent sends formState, sync it in
  useEffect(() => {
    if (formState && formState.length > 0) {
      const mapped: Record<string, any> = {};
      formState.forEach((f) => {
        mapped[f.name] = f.value;
      });
      setFormData(mapped);
    }
  }, [formState]);

  // Generate autofill suggestions when profile or schema changes
  useEffect(() => {
    if (profile && schema.fields) {
      const suggestions = FormAutofillService.getAutofillSuggestions(schema.fields, profile);
      setAutofillSuggestions(suggestions);
    }
  }, [profile, schema]);

  // Apply external updates from parent (chat answers)
  useEffect(() => {
    if (externalUpdate) {
      setFormData((prev) => ({
        ...prev,
        [externalUpdate.field]: externalUpdate.value,
      }));
    }
  }, [externalUpdate]);

  useEffect(() => {
    if (formState) setFormData(formState);
  }, [formState]);

  if (!schema || !schema.fields || schema.fields.length === 0) {
    return <p className="text-gray-500">No form fields available.</p>;
  }

  const currentField = schema.fields[currentFieldIndex];
  const totalFields = schema.fields.length;
  const progress = ((currentFieldIndex + 1) / totalFields) * 100;

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("Please sign in to submit applications.");
      return;
    }
    
    // Create application object
    const application = {
      id: Date.now().toString(),
      formTitle: schema.fields[0]?.label || "Government Form",
      dateApplied: new Date().toISOString(),
      status: "applied" as const,
      formData: formData,
      schema: schema,
      progress: {
        applied: { date: new Date().toISOString(), completed: true },
        reviewed: { date: null, completed: false },
        confirmed: { date: null, completed: false }
      }
    };

    try {
      // Save to Supabase
      const { error } = await ApplicationService.saveApplication(user.id, application);
      
      if (error) {
        alert("Failed to save application. Please try again.");
        return;
      }

      alert("Application submitted and saved! You can track it on the Status page.");
    } catch (error) {
      alert("Failed to save application. Please try again.");
    }
  };

  const goToNextField = () => {
    if (currentFieldIndex < totalFields - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    }
  };

  const goToPreviousField = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
    }
  };



  // Search functionality - filter fields and show suggestions
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    const results = schema.fields
      .map((field, index) => ({
        field: field.name,
        label: field.label,
        index,
        value: formData[field.name] || ""
      }))
      .filter(item => 
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.field.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 results

    setSearchResults(results);
  };

  // Fill form field from search
  const fillFieldFromSearch = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setSearchQuery("");
    setSearchResults([]);
    
    // Find and go to the field that was filled
    const fieldIndex = schema.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex !== -1) {
      setCurrentFieldIndex(fieldIndex);
    }
  };

  // --- AI-assisted fill ---
  const [isAIFilling, setIsAIFilling] = useState(false);
  
  const handleFillWithAI = async () => {
    try {
      setIsAIFilling(true);
      
      // Use chat history from parent component, fallback to localStorage if not provided
      let filteredHistory = chatHistory || [];
      
      if (filteredHistory.length === 0) {
        const rawHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");
        filteredHistory = rawHistory.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
      }

      // Check if we have any chat history to work with
      if (filteredHistory.length === 0) {
        alert("⚠️ No chat history found. Please have a conversation first so AI can understand what to fill in.");
        return;
      }

      // Debug: Show what we're sending
      console.log("📤 Chat history being sent:", filteredHistory);
      console.log("📋 Form schema being sent:", schema);
      
      // Show specific chat content for debugging
      console.log("🔍 Chat content analysis:");
      filteredHistory.forEach((msg: any, index: number) => {
        console.log(`  Message ${index + 1} (${msg.role}): "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`);
      });
      
      // Show form field names for debugging
      console.log("🔍 Form field names:");
      if (schema.fields) {
        schema.fields.forEach((field: any, index: number) => {
          console.log(`  Field ${index + 1}: ${field.name} (${field.label || 'no label'})`);
        });
      }

      // Get user profile data for AI context
      const profileData = profile || userProfile;
      
      console.log("🤖 Sending to AI autofill:", {
        form_schema: schema,
        chat_history: filteredHistory,
        user_profile: profileData,
        chatHistoryLength: filteredHistory.length,
        schemaFieldsCount: schema.fields?.length || 0
      });

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch("/api/fillForm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_schema: schema,
          chat_history: filteredHistory,
          user_profile: profileData,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log("🤖 AI suggested values:", data);
        console.log("🔍 Detailed field analysis:");
        
        if (data.fields && Array.isArray(data.fields)) {
          data.fields.forEach((f: any, index: number) => {
            console.log(`  Field ${index + 1}: ${f.name} = "${f.value}"`);
          });
        }

        if (data.fields && Array.isArray(data.fields)) {
          const filled: Record<string, any> = {};
          let fieldsFilled = 0;
          let fieldsToAsk = 0;
          
          data.fields.forEach((f: any) => {
            if (f.value === "ASK_USER" || f.value === null || f.value === undefined) {
              filled[f.name] = "";
              fieldsToAsk++;
              if (onAskClarification) {
                // Trigger clarifying question into chat
                onAskClarification(f.name, f.label || f.name.replace(/_/g, " "));
              }
            } else {
              filled[f.name] = f.value;
              fieldsFilled++;
            }
          });
          
          setFormData(filled);
          
          // Show success message
          if (fieldsFilled > 0) {
            alert(`✅ AI successfully filled ${fieldsFilled} fields! ${fieldsToAsk > 0 ? `${fieldsToAsk} fields need your input.` : ''}`);
          } else if (fieldsToAsk > 0) {
            alert(`ℹ️ AI couldn't determine values for ${fieldsToAsk} fields. Please fill them manually.`);
          }
          
          // Update the form data display to show which fields were filled by AI
          console.log(`🤖 AI autofill summary: ${fieldsFilled} fields filled, ${fieldsToAsk} fields need input`);
        } else {
          console.error("Invalid response format from AI autofill");
          alert("❌ AI autofill failed: Invalid response format");
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fill form with AI:", response.status, errorText);
        alert(`❌ AI autofill failed: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error("Error in AI fill:", err);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          alert("⏰ AI autofill timed out after 60 seconds. Please try again with a shorter conversation.");
        } else {
          alert(`❌ AI autofill error: ${err.message}`);
        }
      } else {
        alert(`❌ AI autofill error: Unknown error occurred`);
      }
    } finally {
      setIsAIFilling(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Dynamic Form</h2>
        <button
          type="button"
          onClick={handleFillWithAI}
          disabled={isAIFilling}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isAIFilling 
              ? 'bg-purple-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white`}
        >
          {isAIFilling ? (
            <>
              <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              AI is filling...
            </>
          ) : (
            '🤖 Ask AI to help'
          )}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Field {currentFieldIndex + 1} of {totalFields}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search for fields or type to fill them..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => fillFieldFromSearch(result.field, result.value)}
              >
                <div className="font-medium text-gray-900">{result.field}</div>
                <div className="text-sm text-gray-500">Value: {result.value}</div>
                {result.value && (
                  <div className="text-xs text-blue-600 mt-1">Current: {result.value}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Field Card */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              {currentField.label}
            </h3>
            <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {currentField.type}
            </span>
          </div>
          
          {currentField.description && (
            <p className="text-blue-700 mb-4 text-sm">{currentField.description}</p>
          )}

          {/* Autofill Button */}
          {autofillSuggestions[currentField.name] && !formData[currentField.name] && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => handleChange(currentField.name, autofillSuggestions[currentField.name])}
                className="text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
              >
                ✨ Autofill: {autofillSuggestions[currentField.name]}
              </button>
            </div>
          )}

          {/* Field Input */}
          <div className="mb-4">
            {currentField.type === "text" && (
              <input
                type="text"
                placeholder={`Enter ${currentField.label.toLowerCase()}...`}
                required={currentField.required}
                value={formData[currentField.name] || ""}
                className={`w-full border-2 px-4 py-3 rounded-lg text-lg transition-all duration-200 ${
                  formData[currentField.name] 
                    ? "border-green-300 bg-green-50" 
                    : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                }`}
                onChange={(e) => handleChange(currentField.name, e.target.value)}
              />
            )}

            {currentField.type === "date" && (
              <input
                type="date"
                required={currentField.required}
                value={formData[currentField.name] || ""}
                className={`w-full border-2 px-4 py-3 rounded-lg text-lg transition-all duration-200 ${
                  formData[currentField.name] 
                    ? "border-green-300 bg-green-50" 
                    : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                }`}
                onChange={(e) => handleChange(currentField.name, e.target.value)}
              />
            )}

            {currentField.type === "checkbox" && (
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData[currentField.name] || false}
                  className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  onChange={(e) => handleChange(currentField.name, e.target.checked)}
                />
                <span className="text-lg text-gray-700">Check this box</span>
              </div>
            )}

            {currentField.type === "signature" && (
              <input
                type="text"
                placeholder="Type your signature..."
                required={currentField.required}
                value={formData[currentField.name] || ""}
                className={`w-full border-2 px-4 py-3 rounded-lg text-lg italic text-gray-600 transition-all duration-200 ${
                  formData[currentField.name] 
                    ? "border-green-300 bg-green-50" 
                    : "border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                }`}
                onChange={(e) => handleChange(currentField.name, e.target.value)}
              />
            )}
          </div>

          {/* Field Status */}
          <div className="flex items-center justify-between text-sm">
            <span className={`px-3 py-1 rounded-full ${
              formData[currentField.name] 
                ? "bg-green-100 text-green-800" 
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {formData[currentField.name] ? "✅ Filled" : "⏳ Pending"}
            </span>
            {currentField.required && (
              <span className="text-red-600 font-medium">Required Field</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousField}
          disabled={currentFieldIndex === 0}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            currentFieldIndex === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Question {currentFieldIndex + 1} of {totalFields}
          </span>
        </div>

        <button
          onClick={goToNextField}
          disabled={currentFieldIndex === totalFields - 1}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            currentFieldIndex === totalFields - 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>



      {/* Submit Button */}
      <div className="text-center">
        <button
          type="submit"
          onClick={handleSubmit}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
        >
          Submit Form
        </button>
      </div>
    </div>
  );
}
