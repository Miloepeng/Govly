import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ApplicationService } from '../../lib/applicationService';
import DynamicForm from '../../components/DynamicForm';
import DashboardHeader from '../../components/DashboardHeader';
import toast from 'react-hot-toast';

interface Application {
  id: string;
  formTitle: string;
  dateApplied: string;
  status: string;
  formData: Record<string, any>;
  schema?: any;
}

export default function EditApplicationPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!router.isReady || !id || !user) return;

    const loadApplication = async () => {
      try {
        const { data, error } = await ApplicationService.getApplication(id as string, user.id);

        if (error || !data) {
          console.error('Error loading application:', error);
          toast.error('Failed to load application. Redirecting back to status page.');
          router.push('/status');
          return;
        }

        setApplication(data);
        setFormData(data.formData || {});
      } catch (error) {
        console.error('Error loading application:', error);
        alert('Failed to load application. Redirecting back to status page.');
        router.push('/status');
      } finally {
        setIsLoading(false);
      }
    };

    loadApplication();
  }, [router.isReady, id, user]);

  const handleFormUpdate = (updatedFormData: Record<string, any>) => {
    setFormData(updatedFormData);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!application || !user) return;

    setIsSaving(true);
    try {
      const { error } = await ApplicationService.updateApplicationData(
        application.id,
        formData
      );

      if (error) {
        console.error('Error saving application:', error);
        toast.error('Failed to save changes. Please try again.');
        return;
      }

      setHasChanges(false);
      toast.success('Application updated successfully!');
      router.push('/status');
    } catch (error) {
      console.error('Error saving application:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page?'
      );
      if (!confirmed) return;
    }
    router.push('/status');
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
          <span className="text-gray-600">Loading application...</span>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h1>
          <p className="text-gray-600 mb-6">The application you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/status')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex flex-col">
      <DashboardHeader />

      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Application</h1>
              <p className="text-sm text-gray-600 mt-1">
                {application.formTitle} • ID: {application.id.slice(-8)}
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasChanges && !isSaving
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Form */}
        {application.schema ? (
          <DynamicForm
            schema={application.schema}
            formState={Object.entries(formData).map(([name, value]) => ({ name, value }))}
            onFormUpdate={handleFormUpdate}
          />
        ) : (
          <div className="w-full max-w-none bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Form Schema Available</h3>
            <p className="text-gray-600 mb-4">
              This application doesn't have an editable form schema.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Data:</h4>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {hasChanges && (
          <div className="mt-4 text-center">
            <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              You have unsaved changes
            </span>
          </div>
        )}
      </div>
    </div>
  );
}