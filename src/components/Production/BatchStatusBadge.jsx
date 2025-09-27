import React from 'react';
import { CheckCircle, Clock, PlayCircle, PauseCircle, Send, AlertTriangle } from 'lucide-react';

const BatchStatusBadge = ({ status, stage, size = 'md', showIcon = true }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'created':
        return 'bg-blue-100 text-blue-800';
      case 'mixing':
        return 'bg-yellow-100 text-yellow-800';
      case 'heating':
        return 'bg-orange-100 text-orange-800';
      case 'cooling':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'handed_over':
        return 'bg-gray-100 text-gray-800';
      case 'on_hold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    switch (status) {
      case 'completed':
      case 'handed_over':
        return <CheckCircle className={iconSize} />;
      case 'mixing':
      case 'heating':
      case 'cooling':
        return <PlayCircle className={iconSize} />;
      case 'on_hold':
        return <PauseCircle className={iconSize} />;
      default:
        return <Clock className={iconSize} />;
    }
  };

  const getStatusLabel = (status, stage) => {
    if (status === 'created' && stage) {
      return stage.replace('_', ' ').toUpperCase();
    }
    return status?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${getStatusColor(status)} ${sizeClasses[size]}`}>
      {showIcon && (
        <>
          {getStatusIcon(status)}
          <span className="ml-1">{getStatusLabel(status, stage)}</span>
        </>
      )}
      {!showIcon && getStatusLabel(status, stage)}
    </span>
  );
};

export default BatchStatusBadge;