import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, FileText, ArrowRight, ArrowLeft, X, Eye, Download } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { ApplicationService } from '../lib/applicationService';
import DashboardHeader from '../components/DashboardHeader';

interface ApplicationProgress {
  applied: { date: string | null; completed: boolean };
  reviewed: { date: string | null; completed: boolean };
  confirmed: { date: string | null; completed: boolean };
}

interface Application {
  id: string;
  formTitle: string;
  dateApplied: string;
  status: string;
  formData: Record<string, any>;
  schema?: any;
  progress: ApplicationProgress;
}

export default function StatusPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const loadApplications = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // First, try to migrate any localStorage applications
        await ApplicationService.migrateLocalStorageApplications(user.id);
        
        // Then load applications from Supabase
        const { data, error } = await ApplicationService.getUserApplications(user.id);
        
        if (error) {
          // Fallback to localStorage if Supabase fails
          const localApplications = JSON.parse(localStorage.getItem('applications') || '[]');
          setApplications(localApplications);
        } else {
          setApplications(data || []);
        }
      } catch (error) {
        // Fallback to localStorage
        const localApplications = JSON.parse(localStorage.getItem('applications') || '[]');
        setApplications(localApplications);
      } finally {
        setIsLoading(false);
      }
    };

    loadApplications();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <Clock className="w-4 h-4" />;
      case 'reviewed': return <AlertCircle className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  const updateApplicationStatus = (appId: string, newStatus: string) => {
    const updatedApplications = applications.map(app => {
      if (app.id === appId) {
        const progress = { ...app.progress };
        
        // Update progress based on new status
        if (newStatus === 'reviewed') {
          progress.reviewed = { date: new Date().toISOString(), completed: true };
        } else if (newStatus === 'confirmed') {
          progress.reviewed = { date: new Date().toISOString(), completed: true };
          progress.confirmed = { date: new Date().toISOString(), completed: true };
        }
        
        return {
          ...app,
          status: newStatus,
          progress
        };
      }
      return app;
    });
    
    setApplications(updatedApplications);
    localStorage.setItem('applications', JSON.stringify(updatedApplications));
  };

  const handleViewDetails = async (application: Application) => {
    setIsLoadingDetails(true);
    setSelectedApplication(application);
    setIsModalOpen(true);
    setIsLoadingDetails(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedApplication(null);
  };

  const exportApplicationData = (application: Application) => {
    const dataStr = JSON.stringify(application, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `application-${application.id.slice(-8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleContinueInChat = (application: Application) => {
    // Store the application data in localStorage for the chat to pick up
    localStorage.setItem('continueApplication', JSON.stringify({
      id: application.id,
      formTitle: application.formTitle,
      formData: application.formData,
      schema: application.schema,
      status: application.status,
      progress: application.progress
    }));
    
    // Navigate to the main chat page
    router.push('/');
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
        <DashboardHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
        <DashboardHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
            <p className="text-gray-600 mb-6">You need to sign in to view your applications.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Application Status</h1>
            <p className="text-gray-600 mt-1">Track your government form applications and their progress</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Applications ({applications.length})
          </button>
          <button
            onClick={() => setFilterStatus('applied')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              filterStatus === 'applied'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Applied ({applications.filter(app => app.status === 'applied').length})
          </button>
          <button
            onClick={() => setFilterStatus('reviewed')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              filterStatus === 'reviewed'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Under Review ({applications.filter(app => app.status === 'reviewed').length})
          </button>
          <button
            onClick={() => setFilterStatus('confirmed')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              filterStatus === 'confirmed'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Confirmed ({applications.filter(app => app.status === 'confirmed').length})
          </button>
        </div>

        {/* Applications Grid */}
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">
              {filterStatus === 'all' 
                ? "You haven't submitted any applications yet. Fill out a form to get started!"
                : `No applications in ${filterStatus} status.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {app.formTitle}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    Applied: {formatDate(app.dateApplied)}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Application ID: {app.id.slice(-8)}
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Application Progress</h4>
                  
                  <div className="space-y-4">
                    {/* Applied Stage */}
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        app.progress.applied.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}>
                        {app.progress.applied.completed ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-white text-sm font-medium">1</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Applied</div>
                        {app.progress.applied.date && (
                          <div className="text-xs text-gray-500">
                            {formatDate(app.progress.applied.date)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Reviewed Stage */}
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        app.progress.reviewed.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}>
                        {app.progress.reviewed.completed ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-white text-sm font-medium">2</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Under Review</div>
                        {app.progress.reviewed.date && (
                          <div className="text-xs text-gray-500">
                            {formatDate(app.progress.reviewed.date)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Confirmed Stage */}
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        app.progress.confirmed.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}>
                        {app.progress.confirmed.completed ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-white text-sm font-medium">3</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Confirmed</div>
                        {app.progress.confirmed.date && (
                          <div className="text-xs text-gray-500">
                            {formatDate(app.progress.confirmed.date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6">
                  <div className="flex gap-2">
                    {app.status === 'applied' && (
                      <button
                        onClick={() => updateApplicationStatus(app.id, 'reviewed')}
                        className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Mark as Reviewed
                      </button>
                    )}
                    {app.status === 'reviewed' && (
                      <button
                        onClick={() => updateApplicationStatus(app.id, 'confirmed')}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Mark as Confirmed
                      </button>
                    )}
                    <button
                      onClick={() => handleContinueInChat(app)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Continue in Chat
                    </button>
                    <button
                      onClick={() => handleViewDetails(app)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {isModalOpen && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
                <p className="text-sm text-gray-500 mt-1">ID: {selectedApplication.id.slice(-8)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportApplicationData(selectedApplication)}
                  className="px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading details...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Application Overview */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Application Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Form Title</label>
                        <p className="text-gray-900">{selectedApplication.formTitle}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(selectedApplication.status)}`}>
                          {getStatusIcon(selectedApplication.status)}
                          {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                        </span>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date Applied</label>
                        <p className="text-gray-900">{formatDate(selectedApplication.dateApplied)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Application ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedApplication.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Data */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Form Data</h3>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {Object.keys(selectedApplication.formData).length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No form data available
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {Object.entries(selectedApplication.formData).map(([key, value]) => (
                            <div key={key} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                  <label className="text-sm font-medium text-gray-500 capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </label>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-gray-900 break-words">
                                    {value === null || value === undefined ? (
                                      <span className="text-gray-400 italic">Not provided</span>
                                    ) : typeof value === 'object' ? (
                                      <pre className="text-sm bg-gray-50 p-2 rounded border overflow-x-auto">
                                        {JSON.stringify(value, null, 2)}
                                      </pre>
                                    ) : (
                                      String(value)
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Progress Timeline</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="space-y-4">
                        {/* Applied Stage */}
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            selectedApplication.progress.applied.completed ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {selectedApplication.progress.applied.completed ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <span className="text-white text-sm font-medium">1</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Applied</div>
                            {selectedApplication.progress.applied.date && (
                              <div className="text-xs text-gray-500">
                                {formatDate(selectedApplication.progress.applied.date)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reviewed Stage */}
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            selectedApplication.progress.reviewed.completed ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {selectedApplication.progress.reviewed.completed ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <span className="text-white text-sm font-medium">2</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Under Review</div>
                            {selectedApplication.progress.reviewed.date && (
                              <div className="text-xs text-gray-500">
                                {formatDate(selectedApplication.progress.reviewed.date)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Confirmed Stage */}
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            selectedApplication.progress.confirmed.completed ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {selectedApplication.progress.confirmed.completed ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <span className="text-white text-sm font-medium">3</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Confirmed</div>
                            {selectedApplication.progress.confirmed.date && (
                              <div className="text-xs text-gray-500">
                                {formatDate(selectedApplication.progress.confirmed.date)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Raw Data (for debugging) */}
                  <details className="bg-gray-50 rounded-lg p-4">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      Raw Application Data (for debugging)
                    </summary>
                    <pre className="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto text-gray-600">
                      {JSON.stringify(selectedApplication, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 