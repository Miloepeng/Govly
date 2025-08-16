import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, FileText, ArrowRight } from 'lucide-react';

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
  progress: ApplicationProgress;
}

export default function StatusPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    // Load applications from localStorage
    let savedApplications = JSON.parse(localStorage.getItem('applications') || '[]');
    
    // Add demo data if no applications exist
    if (savedApplications.length === 0) {
      const demoApplications = [
        {
          id: 'demo-1',
          formTitle: 'Housing Application Form',
          dateApplied: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          status: 'reviewed',
          formData: { name: 'John Doe', address: '123 Main St' },
          schema: { fields: [] },
          progress: {
            applied: { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), completed: true },
            reviewed: { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), completed: true },
            confirmed: { date: null, completed: false }
          }
        },
        {
          id: 'demo-2',
          formTitle: 'Business Registration Form',
          dateApplied: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          status: 'applied',
          formData: { businessName: 'Tech Corp', owner: 'Jane Smith' },
          schema: { fields: [] },
          progress: {
            applied: { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), completed: true },
            reviewed: { date: null, completed: false },
            confirmed: { date: null, completed: false }
          }
        },
        {
          id: 'demo-3',
          formTitle: 'Land Use Permit Application',
          dateApplied: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
          status: 'confirmed',
          formData: { propertyAddress: '456 Oak Ave', purpose: 'Residential' },
          schema: { fields: [] },
          progress: {
            applied: { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), completed: true },
            reviewed: { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), completed: true },
            confirmed: { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), completed: true }
          }
        }
      ];
      
      localStorage.setItem('applications', JSON.stringify(demoApplications));
      savedApplications = demoApplications;
    }
    
    setApplications(savedApplications);
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Status</h1>
              <p className="text-gray-600">Track your government form applications and their progress</p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              ← Back to Chat
            </a>
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
                      onClick={() => {
                        // View application details
                        console.log('View application:', app);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 