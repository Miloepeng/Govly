import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, RefreshCw, Globe, AlertTriangle, Loader2, Copy, Share } from 'lucide-react';

interface WebsiteViewerProps {
  url: string;
  onTextExtracted?: (text: string) => void;
  highlightedSections?: string[];
  persistentHighlights?: string[];
  onLoadSuccess?: () => void;
  onLoadError?: (error: any) => void;
}

export default function WebsiteViewer({
  url,
  onTextExtracted,
  highlightedSections = [],
  persistentHighlights = [],
  onLoadSuccess,
  onLoadError
}: WebsiteViewerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [canEmbed, setCanEmbed] = useState<boolean>(true);
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Clean and validate URL
  const cleanUrl = (inputUrl: string): string => {
    try {
      // Add https:// if no protocol is specified
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        inputUrl = `https://${inputUrl}`;
      }

      const urlObj = new URL(inputUrl);
      return urlObj.href;
    } catch {
      // If URL parsing fails, return original
      return inputUrl;
    }
  };

  const validatedUrl = cleanUrl(url);

  // Extract domain for display
  const getDomain = (inputUrl: string): string => {
    try {
      const urlObj = new URL(validatedUrl);
      return urlObj.hostname;
    } catch {
      return inputUrl;
    }
  };

  const domain = getDomain(validatedUrl);

  // Handle iframe load success
  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');

    // Try to extract text content from iframe (limited by CORS)
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        const textContent = iframe.contentDocument.body?.textContent || '';
        setExtractedContent(textContent);
        if (onTextExtracted && textContent.trim()) {
          onTextExtracted(textContent);
        }
      }
    } catch (error) {
      console.warn('Cannot extract text from cross-origin iframe:', error);
      // For cross-origin sites, we'll show a message about limited text extraction
    }

    if (onLoadSuccess) {
      onLoadSuccess();
    }
  };

  // Handle iframe load error
  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    setCanEmbed(false);
    setErrorMessage('This website cannot be embedded due to security restrictions.');

    if (onLoadError) {
      onLoadError(new Error('Iframe embedding failed'));
    }
  };

  // Refresh iframe
  const refreshIframe = () => {
    setIsLoading(true);
    setHasError(false);
    setLastRefresh(Date.now());
  };

  // Open in new tab
  const openInNewTab = () => {
    window.open(validatedUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy URL to clipboard
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(validatedUrl);
    } catch (error) {
      console.warn('Failed to copy URL:', error);
    }
  };

  // Check if URL is likely to work in iframe
  const isEmbeddable = (inputUrl: string): boolean => {
    const domain = getDomain(inputUrl);

    // Known problematic domains that block embedding
    const blockingDomains = [
      'google.com',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'github.com'
    ];

    return !blockingDomains.some(blocked => domain.includes(blocked));
  };

  useEffect(() => {
    setCanEmbed(isEmbeddable(validatedUrl));
  }, [validatedUrl]);

  // Mock text extraction for demonstration
  useEffect(() => {
    if (!hasError && !extractedContent && onTextExtracted) {
      // Since we can't extract text from cross-origin sites,
      // we'll provide a mock description for the AI to work with
      const mockContent = `
Website: ${domain}
URL: ${validatedUrl}

This is a government website or document page. The AI assistant can help answer questions about:
- General information about this type of government service
- Common procedures and requirements
- Related documentation and forms
- Contact information and office locations

Note: Due to security restrictions, the full text content cannot be extracted from external websites.
Please ask specific questions and the AI will provide relevant information based on the website URL and type.
      `.trim();

      setTimeout(() => {
        if (onTextExtracted) {
          onTextExtracted(mockContent);
        }
      }, 2000); // Simulate loading delay
    }
  }, [hasError, extractedContent, onTextExtracted, domain, validatedUrl]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Website Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 truncate max-w-md">
                {domain}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-lg">
                {validatedUrl}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!canEmbed && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-yellow-800">Limited embedding</span>
            </div>
          )}

          <button
            onClick={refreshIframe}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={copyUrl}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Copy URL"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={openInNewTab}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Website Content */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="text-gray-600 font-medium">Loading website...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Connecting to {domain}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasError && !canEmbed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Embedding Restricted
              </h3>
              <p className="text-gray-600 mb-4">
                This website cannot be displayed in an embedded frame due to security policies.
                You can still visit the site directly.
              </p>
              <div className="space-y-3">
                <button
                  onClick={openInNewTab}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visit {domain}</span>
                </button>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Alternative:</strong> You can still ask the AI assistant questions about this website.
                    The AI can provide general information about government services and procedures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={lastRefresh} // Force reload when refreshed
            src={validatedUrl}
            className="w-full h-full border-none"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            title={`Website: ${domain}`}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                hasError ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <span className="text-sm text-gray-600">
                {hasError ? 'Failed to load' : isLoading ? 'Loading...' : 'Loaded successfully'}
              </span>
            </div>

            {!extractedContent && !hasError && !isLoading && (
              <span className="text-xs text-yellow-600">
                Text extraction limited for cross-origin content
              </span>
            )}

            {persistentHighlights.length > 0 && (
              <div className="flex items-center space-x-2 bg-red-50 px-2 py-1 rounded">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-700 font-medium">
                  {persistentHighlights.length} section{persistentHighlights.length > 1 ? 's' : ''} referenced
                </span>
                <span className="text-xs text-red-600">
                  ({persistentHighlights.slice(0, 2).join(', ')}{persistentHighlights.length > 2 ? '...' : ''})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-500">
              {domain}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}