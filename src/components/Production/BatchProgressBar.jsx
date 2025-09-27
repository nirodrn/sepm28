import React from 'react';

const BatchProgressBar = ({ 
  progress = 0, 
  targetQuantity, 
  outputQuantity, 
  unit,
  showDetails = true,
  size = 'md' 
}) => {
  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const efficiency = targetQuantity && outputQuantity ? 
    ((outputQuantity / targetQuantity) * 100).toFixed(1) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Progress</span>
        <span className="text-sm font-medium text-gray-900">{progress}%</span>
      </div>
      
      <div className={`w-full bg-gray-200 rounded-full ${heightClasses[size]}`}>
        <div 
          className={`${getProgressColor(progress)} ${heightClasses[size]} rounded-full transition-all duration-300`}
          style={{width: `${Math.min(progress, 100)}%`}}
        ></div>
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {outputQuantity ? `${outputQuantity}/${targetQuantity} ${unit}` : `Target: ${targetQuantity} ${unit}`}
          </span>
          {efficiency && (
            <span className={`font-medium ${
              efficiency >= 95 ? 'text-green-600' :
              efficiency >= 85 ? 'text-blue-600' :
              efficiency >= 75 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {efficiency}% efficiency
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchProgressBar;