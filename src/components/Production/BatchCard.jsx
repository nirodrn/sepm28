import React from 'react';
import { Factory, Clock, CheckCircle, PlayCircle, PauseCircle, Send, Eye, Edit } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

const BatchCard = ({ 
  batch, 
  onUpdateProgress,
  onComplete,
  onViewDetails, 
  onEdit,
  showActions = true,
  processing = false 
}) => {
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
    switch (status) {
      case 'completed':
      case 'handed_over':
        return <CheckCircle className="h-4 w-4" />;
      case 'mixing':
      case 'heating':
      case 'cooling':
        return <PlayCircle className="h-4 w-4" />;
      case 'on_hold':
        return <PauseCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Factory className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{batch.batchNumber}</h4>
            <p className="text-sm text-gray-500">{batch.productName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}>
            {getStatusIcon(batch.status)}
            <span className="ml-1">{batch.status?.replace('_', ' ').toUpperCase()}</span>
          </span>
          {batch.priority && batch.priority !== 'normal' && (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(batch.priority)}`}>
              {batch.priority?.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Target:</span>
          <span className="font-medium">{batch.targetQuantity} {batch.unit}</span>
        </div>
        {batch.outputQuantity && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Output:</span>
            <span className="font-medium">{batch.outputQuantity} {batch.unit}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Stage:</span>
          <span className="font-medium capitalize">{batch.stage?.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Created:</span>
          <span className="font-medium">{formatDate(batch.createdAt)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{batch.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
            style={{width: `${batch.progress || 0}%`}}
          ></div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewDetails(batch.id)}
            className="text-blue-600 hover:text-blue-800 p-1 rounded"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          <div className="flex items-center space-x-1">
            {batch.progress < 100 && onUpdateProgress && (
              <button
                onClick={() => onUpdateProgress(batch.id)}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
              >
                Update
              </button>
            )}
            
            {batch.progress < 100 && onComplete && (
              <button
                onClick={() => onComplete(batch.id)}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
              >
                Complete
              </button>
            )}
            
            {onEdit && batch.status !== 'handed_over' && (
              <button
                onClick={() => onEdit(batch.id)}
                className="text-indigo-600 hover:text-indigo-800 p-1 rounded"
                title="Edit"
              >
                <Edit className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchCard;