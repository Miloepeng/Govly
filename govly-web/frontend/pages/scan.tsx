import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Upload, FileText, Image, Loader2, AlertCircle, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import DynamicForm from '../components/DynamicForm';
import AgencyDetection from '../components/AgencyDetection';
import DashboardHeader from '../components/DashboardHeader';
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

interface AgencyInfo {
  name: string;
  confidence: number;
  description?: string;
}

// Custom form component for scan page that handles submission differently
function CustomDynamicForm({
  schema,
  detectedAgency,
  onSubmission,
  onAskClarification,
}: {
  schema: Schema;
  detectedAgency: AgencyInfo | null;
  onSubmission: () => void;
  onAskClarification?: (fieldName: string, label: string) => void;
}) {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ field: string; label: string; index: number; value: string }[]>([]);
  const [autofillSuggestions, setAutofillSuggestions] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate autofill suggestions when profile or schema changes
  React.useEffect(() => {
    if (profile && schema.fields) {
      const suggestions = FormAutofillService.getAutofillSuggestions(schema.fields, profile);
      setAutofillSuggestions(suggestions);
    }
  }, [profile, schema]);

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

    setIsSubmitting(true);

    try {
      // Create application object for scan page
      const application = {
        id: Date.now().toString(),
        formTitle: `Scanned Form - ${detectedAgency?.name || 'Government Form'}`,
        dateApplied: new Date().toISOString(),
        status: "applied" as const,
        formData: formData,
        schema: schema,
        agency: detectedAgency?.name || 'Unknown Agency',
        submissionType: 'scanned',
        progress: {
          applied: { date: new Date().toISOString(), completed: true },
          reviewed: { date: null, completed: false },
          confirmed: { date: null, completed: false }
        }
      };

      // Save to Supabase
      const { error } = await ApplicationService.saveApplication(user.id, application);

      if (error) {
        alert("Failed to save application. Please try again.");
        return;
      }

      onSubmission();
    } catch (error) {
      alert("Failed to save application. Please try again.");
    } finally {
      setIsSubmitting(false);
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

  // Search functionality
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
      .slice(0, 5);

    setSearchResults(results);
  };

  const fillFieldFromSearch = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setSearchQuery("");
    setSearchResults([]);

    const fieldIndex = schema.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex !== -1) {
      setCurrentFieldIndex(fieldIndex);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Scanned Form</h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {totalFields} fields
        </span>
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
            placeholder="Search for fields..."
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
                <div className="font-medium text-gray-900">{result.label}</div>
                <div className="text-sm text-gray-500">{result.field}</div>
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
          disabled={isSubmitting}
          className={`px-8 py-3 rounded-lg transition-colors text-lg font-medium ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Submitting...
            </>
          ) : (
            `Submit to ${detectedAgency?.name || 'Government Agency'}`
          )}
        </button>
      </div>
    </div>
  );
}

export default function ScanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [uploadComplete, setUploadComplete] = useState<Record<string, boolean>>({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);

  // Form state
  const [extractedSchema, setExtractedSchema] = useState<Schema | null>(null);
  const [detectedAgency, setDetectedAgency] = useState<AgencyInfo | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Validate each file
      for (const file of files) {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
          setError('Please select PDF or image files (JPEG, PNG)');
          return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setError('File size must be less than 10MB');
          return;
        }
      }

      setSelectedFiles(prev => [...prev, ...files]);
      setError(null);
      
      // Start upload for each new file
      files.forEach(file => startUpload(file));
    }
  };

  const startUpload = (file: File) => {
    const fileId = file.name + file.size; // Unique identifier for each file
    setIsUploading(prev => ({ ...prev, [fileId]: true }));
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const currentProgress = prev[fileId] || 0;
        if (currentProgress >= 100) {
          clearInterval(interval);
          setIsUploading(prev => ({ ...prev, [fileId]: false }));
          setUploadComplete(prev => ({ ...prev, [fileId]: true }));
          return { ...prev, [fileId]: 100 };
        }
        return { ...prev, [fileId]: currentProgress + 10 };
      });
    }, 200);
  };

  const handleConvertToForm = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Process the first file for now (can be extended to process multiple files)
      const selectedFile = selectedFiles[0];
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);

      // First, upload the file to the backend
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let fileUrl: string;

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        fileUrl = uploadResult.url;
      } else {
        // Fallback: use file name directly (assuming backend can access it)
        fileUrl = selectedFile.name;
      }

      // Extract form fields using OCR
      const extractResponse = await fetch('/api/extractFormPreprocessed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: fileUrl
        }),
      });

      if (!extractResponse.ok) {
        throw new Error('Failed to extract form fields');
      }

      const extractResult = await extractResponse.json();
      setExtractedSchema(extractResult);

      // Detect agency from the extracted text
      // We'll use the first few field labels as context for agency detection
      const contextText = extractResult.fields
        .slice(0, 5)
        .map((field: Field) => `${field.label}: ${field.description || ''}`)
        .join(' ');

      if (contextText.trim()) {
        const agencyResponse = await fetch('/api/detectAgency', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: contextText,
            country: 'Vietnam',
            conversationContext: []
          }),
        });

        if (agencyResponse.ok) {
          const agencyResult = await agencyResponse.json();
          if (agencyResult.detected_agency) {
            setDetectedAgency({
              name: agencyResult.detected_agency,
              confidence: agencyResult.confidence || 0.8,
              description: agencyResult.description
            });
          }
        }
      }

      setProcessComplete(true);

    } catch (err) {
      console.error('Error processing form:', err);
      setError(err instanceof Error ? err.message : 'Failed to process form');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmission = () => {
    setFormSubmitted(true);
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setUploadProgress({});
    setIsUploading({});
    setUploadComplete({});
    setIsProcessing(false);
    setProcessComplete(false);
    setExtractedSchema(null);
    setDetectedAgency(null);
    setFormSubmitted(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scan Your Form</h1>
            <p className="text-gray-600 mt-1">Upload a PDF or image of your form to automatically extract and submit it</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: File Upload */}
        {selectedFiles.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-red-400 transition-colors">
            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Form</h3>
            <p className="text-gray-600 mb-6">
              Select PDF documents or images (JPEG, PNG) of your government form
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Choose Files
            </button>
            <p className="text-sm text-gray-500 mt-4">Maximum file size: 10MB per file</p>
          </div>
        )}

        {/* Step 2: Upload Progress */}
        {selectedFiles.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Uploaded Files</h3>
              <span className="text-sm text-gray-600">{selectedFiles.length} file(s)</span>
            </div>
            
            {selectedFiles.map((file, index) => {
              const fileId = file.name + file.size;
              const isFileUploading = isUploading[fileId] || false;
              const isFileComplete = uploadComplete[fileId] || false;
              const fileProgress = uploadProgress[fileId] || 0;
              
              return (
                <div key={fileId} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      {file.type.includes('pdf') ? (
                        <FileText className="w-6 h-6 text-red-600" />
                      ) : (
                        <Image className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{file.name}</h4>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    {isFileComplete && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>

                  {isFileUploading && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Uploading...</span>
                        <span>{fileProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Upload More Button */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Upload More Files
                </button>
              </div>
            )}

            {/* Convert to Form Button - Only show when all files are uploaded */}
            {selectedFiles.length > 0 && 
             selectedFiles.every(file => uploadComplete[file.name + file.size]) && 
             !isProcessing && 
             !processComplete && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleConvertToForm}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Convert to Form
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Processing */}
        {isProcessing && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Your Form</h3>
            <p className="text-gray-600">
              Using OCR to extract text and AI to identify form fields...
            </p>
          </div>
        )}

        {/* Step 4: Agency Detection */}
        {processComplete && detectedAgency && !formSubmitted && (
          <div className="mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏛️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detected Agency: {detectedAgency.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Confidence: {Math.round(detectedAgency.confidence * 100)}%
                  </p>
                  {detectedAgency.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {detectedAgency.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Form Display */}
        {processComplete && extractedSchema && !formSubmitted && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Extracted Form Fields</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {extractedSchema.fields.length} fields detected
              </span>
            </div>

            <CustomDynamicForm
              schema={extractedSchema}
              detectedAgency={detectedAgency}
              onSubmission={handleFormSubmission}
              onAskClarification={(fieldName, label) => {
                console.log(`Need clarification for ${fieldName}: ${label}`);
              }}
            />

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Submission Success */}
        {formSubmitted && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Form Submitted Successfully!</h3>
            <p className="text-gray-600 mb-6">
              Your form has been processed and submitted to {detectedAgency?.name || 'the appropriate government agency'}.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/status')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Track Application
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Scan Another Form
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}