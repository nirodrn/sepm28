import React from 'react';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';

const SupplierGradeDisplay = ({ 
  grade, 
  averagePoints, 
  totalDeliveries, 
  lastDeliveryGrade, 
  showTrend = true,
  size = 'md' 
}) => {
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getGradeStars = (grade) => {
    const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const points = gradePoints[grade] || 0;
    const starSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${starSize} ${i < points ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getTrend = () => {
    if (!lastDeliveryGrade || !grade) return null;
    
    const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const currentPoints = gradePoints[grade] || 0;
    const lastPoints = gradePoints[lastDeliveryGrade] || 0;
    
    if (currentPoints > lastPoints) return { direction: 'up', color: 'text-green-500' };
    if (currentPoints < lastPoints) return { direction: 'down', color: 'text-red-500' };
    return { direction: 'stable', color: 'text-gray-500' };
  };

  const trend = getTrend();

  if (!grade || grade === 'Not graded yet') {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">Not graded yet</span>
        {totalDeliveries === 0 && (
          <span className="text-xs text-gray-400">(New supplier)</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        {getGradeStars(grade)}
      </div>
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(grade)}`}>
        Grade {grade}
      </span>
      {averagePoints && (
        <span className="text-xs text-gray-500">
          ({averagePoints.toFixed(1)}/4.0)
        </span>
      )}
      {totalDeliveries > 0 && (
        <span className="text-xs text-gray-500">
          {totalDeliveries} deliveries
        </span>
      )}
      {showTrend && trend && trend.direction !== 'stable' && (
        <div className={`${trend.color}`}>
          {trend.direction === 'up' ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
        </div>
      )}
    </div>
  );
};

export default SupplierGradeDisplay;