import React from 'react';
import { useDashboardEmbed } from '../../hooks/useDashboardEmbed';

interface DataboxEmbedProps {
  dashboardName?: string;
  className?: string;
  fallbackMessage?: string;
  showTitle?: boolean;
}

export const DataboxEmbed: React.FC<DataboxEmbedProps> = ({
  dashboardName = 'Main Dashboard',
  className = '',
  fallbackMessage = 'Dashboard not configured for this user',
  showTitle = true
}) => {
  const { dashboardEmbed, loading, error } = useDashboardEmbed(dashboardName);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="aspect-video bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{dashboardName}</h3>
        )}
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-800 font-medium">Error loading dashboard</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardEmbed?.dashboard_identifier) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{dashboardName}</h3>
        )}
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Dashboard Not Available</p>
          <p className="text-gray-500 text-sm mt-1">{fallbackMessage}</p>
        </div>
      </div>
    );
  }

  const embedUrl = `https://app.databox.com/datawall/${dashboardEmbed.dashboard_identifier}?i`;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {showTitle && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{dashboardName}</h3>
        </div>
      )}
      <div className="relative" style={{ padding: '63% 0 0 0' }}>
        <iframe
          src={embedUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
          frameBorder="0"
          allow="fullscreen"
          allowFullScreen
          title={`${dashboardName} Analytics`}
        />
      </div>
    </div>
  );
}; 