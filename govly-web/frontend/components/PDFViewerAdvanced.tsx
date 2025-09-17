import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Worker, Viewer, SpecialZoomLevel, ScrollMode } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { searchPlugin, Match, SearchPlugin } from '@react-pdf-viewer/search';
import { highlightPlugin, MessageIcon, RenderHighlightTargetProps, HighlightPlugin } from '@react-pdf-viewer/highlight';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { scrollModePlugin } from '@react-pdf-viewer/scroll-mode';

// Import CSS
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

interface PDFViewerAdvancedProps {
  url: string;
  onTextExtracted?: (text: string) => void;
  scrollToSection?: string;
  onLoadSuccess?: () => void;
  onLoadError?: (error: any) => void;
  searchQuery?: string;
  highlightedSections?: string[];
  persistentHighlights?: string[];
}

interface HighlightArea {
  id: string;
  pageIndex: number;
  rects: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
  content: string;
}

export default function PDFViewerAdvanced({
  url,
  onTextExtracted,
  scrollToSection,
  onLoadSuccess,
  onLoadError,
  searchQuery = '',
  highlightedSections = [],
  persistentHighlights = []
}: PDFViewerAdvancedProps) {
  const [currentSearchKeyword, setCurrentSearchKeyword] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState<number>(0);
  const [highlights, setHighlights] = useState<HighlightArea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const searchPluginInstance = searchPlugin();
  const { highlight, jumpToMatch, setTargetPages } = searchPluginInstance;

  const highlightPluginInstance = highlightPlugin();

  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { jumpToPage } = pageNavigationPluginInstance;

  const scrollModePluginInstance = scrollModePlugin();

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      // Keep only essential tabs
      defaultTabs[0], // Thumbnail
      defaultTabs[1], // Bookmark
    ],
      toolbarPlugin: {
        searchPlugin: {
          enableShortcuts: true,
        },
      },
  });

  // Custom highlight renderer for persistent highlights
  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      style={{
        background: '#ffeb3b',
        opacity: 0.4,
        mixBlendMode: 'multiply',
      }}
    />
  );

  // Search in PDF content using built-in search
  const searchInPDF = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchMatches([]);
      setCurrentMatch(0);
      setCurrentSearchKeyword('');
      return;
    }

    console.log('🔍 Using PDF built-in search for:', searchTerm);
    setCurrentSearchKeyword(searchTerm);
    highlight(searchTerm);
  }, [highlight]);

  // Handle section references without autoscroll
  useEffect(() => {
    if (scrollToSection && scrollToSection.trim() && !isLoading) {
      console.log('📄 PDF section referenced:', scrollToSection);
      // Just search for the section without scrolling
      searchInPDF(scrollToSection);
    }
  }, [scrollToSection, searchInPDF, isLoading]);

  // Use PDF viewer's built-in search when searchQuery changes
  useEffect(() => {
    if (searchQuery && searchQuery.trim() && !isLoading) {
      console.log('🔍 Using PDF built-in search for:', searchQuery);
      highlight(searchQuery);
    } else if (!searchQuery || !searchQuery.trim()) {
      // Clear search results when query is empty
      setSearchMatches([]);
      setCurrentMatch(0);
      setCurrentSearchKeyword('');
    }
  }, [searchQuery, highlight, isLoading]);

  // Handle document load
  const handleDocumentLoad = () => {
    console.log('📄 PDF document loaded successfully');
    setIsLoading(false);

    if (onLoadSuccess) {
      onLoadSuccess();
    }

    // Extract text for AI analysis
    // Note: @react-pdf-viewer doesn't provide direct text extraction
    // but we can simulate it for AI purposes
    if (onTextExtracted) {
      const mockContent = `PDF Document loaded from: ${url}\n\nThis PDF has been successfully loaded and is ready for search and navigation. You can ask questions about its contents and I'll help you find relevant sections.`;
      onTextExtracted(mockContent);
    }
  };

  const handleDocumentError = (error: any) => {
    console.error('❌ PDF load error:', error);
    setIsLoading(false);
    if (onLoadError) {
      onLoadError(error);
    }
  };

  // Navigation controls with scrolling
  const goToPrevMatch = () => {
    if (searchMatches.length > 0) {
      const newIndex = currentMatch > 0 ? currentMatch - 1 : searchMatches.length - 1;
      setCurrentMatch(newIndex);
      
      // Get the match element and scroll to it
      const matchElements = document.querySelectorAll('.rpv-search__highlight, .textLayer .highlight, [data-search-highlight]');
      if (matchElements[newIndex]) {
        matchElements[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const goToNextMatch = () => {
    if (searchMatches.length > 0) {
      const newIndex = currentMatch < searchMatches.length - 1 ? currentMatch + 1 : 0;
      setCurrentMatch(newIndex);
      
      // Get the match element and scroll to it
      const matchElements = document.querySelectorAll('.rpv-search__highlight, .textLayer .highlight, [data-search-highlight]');
      if (matchElements[newIndex]) {
        matchElements[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-100">
      {/* Search Status Bar */}
      {(searchMatches.length > 0 || currentSearchKeyword) && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-blue-800">
              {searchMatches.length > 0 ? (
                <>
                  Found <strong>{searchMatches.length}</strong> matches for "{currentSearchKeyword}"
                  {searchMatches.length > 1 && (
                    <span className="ml-2">
                      (Showing {currentMatch + 1} of {searchMatches.length})
                    </span>
                  )}
                </>
              ) : (
                <>No matches found for "{currentSearchKeyword}"</>
              )}
            </span>
          </div>

          {searchMatches.length > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPrevMatch}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={goToNextMatch}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Persistent Highlights Indicator */}
      {persistentHighlights.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-yellow-800 font-medium">
              {persistentHighlights.length} referenced section{persistentHighlights.length > 1 ? 's' : ''} highlighted
            </span>
            <span className="text-xs text-yellow-600">
              ({persistentHighlights.slice(0, 2).join(', ')}{persistentHighlights.length > 2 ? '...' : ''})
            </span>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 overflow-y-auto">
        <Worker workerUrl="/pdf.worker.min.js">
          <Viewer
            fileUrl={url}
            plugins={[
              defaultLayoutPluginInstance,
              searchPluginInstance,
              highlightPluginInstance,
              pageNavigationPluginInstance,
              scrollModePluginInstance,
            ]}
            onDocumentLoad={handleDocumentLoad}
            defaultScale={1}
            scrollMode={ScrollMode.Vertical}
            theme={{
              theme: 'light',
            }}
          />
        </Worker>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-gray-600 font-medium">Loading PDF...</p>
              <p className="text-sm text-gray-500">Preparing advanced features</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}