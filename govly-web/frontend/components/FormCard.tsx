import { useState } from 'react';
import DynamicForm from './DynamicForm';

interface FormResult {
  title: string;
  description: string;
  url: string;
  similarity?: number;
}

interface FormCardProps {
  result: FormResult;
  setFormSchema?: (schema: any) => void;
  chatHistory?: Array<{ role: string; content: string }>;
}

export default function FormCard({ result, setFormSchema, chatHistory }: FormCardProps) {
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [extractedFormSchema, setExtractedFormSchema] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleFormClick = async () => {
    setIsLoadingForm(true);
    setExtractedFormSchema(null);
    setErrorMessage(null);
    setDebugInfo(null);

    try {
      console.log("🔍 Attempting to extract form from:", result.url);
      setDebugInfo({ step: "Starting extraction", url: result.url });

      const response = await fetch('/api/extractFormPreprocessed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url }),
      });

      console.log("🌐 API Response status:", response.status);
      setDebugInfo({ step: "API response received", status: response.status });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ extractFormPreprocessed response:", data);
        setDebugInfo({ step: "Data received", data });

        // Check if we have valid form fields
        if (data && data.fields && Array.isArray(data.fields) && data.fields.length > 0) {
          setExtractedFormSchema(data);
          if (setFormSchema) setFormSchema(data); // also send to sidebar
          setDebugInfo({ step: "Success", fieldsCount: data.fields.length });
        } else {
          console.warn("⚠️ No valid form fields found in response:", data);
          setDebugInfo({ step: "No fields found, trying fallback", data });
          // Try fallback extraction using OCR
          await tryFallbackExtraction();
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        setDebugInfo({ step: "API error", status: response.status, error: errorText });
        // Try fallback extraction using OCR
        await tryFallbackExtraction();
      }
    } catch (err) {
      console.error('💥 Error extracting form:', err);
      setErrorMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDebugInfo({ step: "Exception caught", error: String(err) });
      // Try fallback extraction using OCR
      await tryFallbackExtraction();
    } finally {
      setIsLoadingForm(false);
    }
  };

  const tryFallbackExtraction = async () => {
    try {
      console.log("🔄 Trying fallback OCR extraction for:", result.url);

      const response = await fetch('/api/extractForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ OCR fallback response:", data);

        if (data && data.fields && Array.isArray(data.fields) && data.fields.length > 0) {
          setExtractedFormSchema(data);
          if (setFormSchema) setFormSchema(data);
        } else {
          console.warn("⚠️ OCR fallback also failed to extract fields");
          // Create a minimal form for testing
          createTestForm();
        }
      } else {
        console.error('❌ OCR fallback failed');
        createTestForm();
      }
    } catch (err) {
      console.error('💥 OCR fallback error:', err);
      createTestForm();
    }
  };

  const createTestForm = () => {
    console.log("🧪 Creating test form for:", result.title);
    const testSchema = {
      fields: [
        {
          name: "full_name",
          type: "text",
          label: "Full Name",
          required: true,
          description: "Enter your full legal name"
        },
        {
          name: "email",
          type: "text",
          label: "Email Address",
          required: true,
          description: "Enter your contact email"
        },
        {
          name: "phone",
          type: "text",
          label: "Phone Number",
          required: false,
          description: "Enter your phone number"
        },
        {
          name: "date_of_birth",
          type: "date",
          label: "Date of Birth",
          required: true,
          description: "Select your date of birth"
        },
        {
          name: "agreement",
          type: "checkbox",
          label: "I agree to the terms and conditions",
          required: true,
          description: "You must agree to proceed"
        }
      ]
    };
    setExtractedFormSchema(testSchema);
    if (setFormSchema) setFormSchema(testSchema);
  };

  return (
    <>
      <div
        className="rag-card p-4 cursor-pointer"
        onClick={handleFormClick}
      >
        <div className="flex items-start justify-between mb-2">
          <h5 className="font-medium text-gray-900 line-clamp-2 flex-1">
            📋 {result.title}
          </h5>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Form
          </span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-3 mb-3">{result.description}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-600 font-medium">Click to load form</span>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                createTestForm();
              }}
              className="text-purple-600 hover:text-purple-800 text-xs underline"
            >
              🧪 Test Form
            </button>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              📄 View PDF
            </a>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingForm && (
        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-blue-700 font-medium">🔄 Processing Form...</span>
          </div>
          <p className="text-center text-sm text-blue-600 mt-2">
            Extracting form fields and structure...
          </p>
          {debugInfo && (
            <div className="mt-3 p-3 bg-white border border-blue-200 rounded text-xs">
              <p><strong>Status:</strong> {debugInfo.step}</p>
              {debugInfo.url && <p><strong>URL:</strong> {debugInfo.url}</p>}
              {debugInfo.status && <p><strong>HTTP Status:</strong> {debugInfo.status}</p>}
              {debugInfo.fieldsCount && <p><strong>Fields Found:</strong> {debugInfo.fieldsCount}</p>}
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {errorMessage && !isLoadingForm && (
        <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-red-600 font-medium">❌ Error</span>
          </div>
          <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
          {debugInfo && (
            <div className="mt-3 p-3 bg-white border border-red-200 rounded text-xs">
              <pre className="text-gray-600">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
          <button
            onClick={() => {
              setErrorMessage(null);
              createTestForm();
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Show Test Form Instead
          </button>
        </div>
      )}

      {/* Extracted Form Display */}
      {extractedFormSchema && !isLoadingForm && (
        <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                📋 {result.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Fill out this form with AI assistance
              </p>
            </div>
            <button
              onClick={() => setExtractedFormSchema(null)}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
              title="Close form"
            >
              ✕
            </button>
          </div>
          <DynamicForm
            schema={extractedFormSchema}
            onAskClarification={(fieldName, label) => {
              console.log(`Need clarification for: ${fieldName} - ${label}`);
            }}
            chatHistory={chatHistory}
          />
        </div>
      )}
    </>
  );
}
