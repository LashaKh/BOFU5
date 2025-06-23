import React from 'react';

interface DataboxEmbedProps {
  dashboardId?: string;
  className?: string;
}

const DataboxEmbed: React.FC<DataboxEmbedProps> = ({ 
  dashboardId = 'b6a2de55021b1a97b8c8c255e645d3913d348186835debf', 
  className = '' 
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div style={{ padding: '63% 0 0 0', position: 'relative' }}>
        <iframe 
          src={`https://app.databox.com/datawall/${dashboardId}?i`}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%' 
          }} 
          frameBorder="0" 
          allowFullScreen
          title="Analytics Dashboard"
        />
      </div>
    </div>
  );
};

export default DataboxEmbed; 