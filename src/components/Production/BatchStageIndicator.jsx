import React from 'react';
import { CheckCircle, Clock, PlayCircle } from 'lucide-react';

const BatchStageIndicator = ({ 
  stages = ['preparation', 'mixing', 'heating', 'cooling', 'final_qc'], 
  currentStage, 
  qcStages = {},
  size = 'md',
  orientation = 'horizontal' 
}) => {
  const getStageStatus = (stage) => {
    const isCompleted = qcStages[stage]?.completed || 
      stages.indexOf(currentStage) > stages.indexOf(stage);
    const isCurrent = currentStage === stage;
    
    return { isCompleted, isCurrent };
  };

  const getStageColor = (stage) => {
    const { isCompleted, isCurrent } = getStageStatus(stage);
    
    if (isCompleted) return 'bg-green-500 text-white';
    if (isCurrent) return 'bg-blue-500 text-white';
    return 'bg-gray-300 text-gray-600';
  };

  const getStageIcon = (stage) => {
    const { isCompleted, isCurrent } = getStageStatus(stage);
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    if (isCompleted) return <CheckCircle className={iconSize} />;
    if (isCurrent) return <PlayCircle className={iconSize} />;
    return <Clock className={iconSize} />;
  };

  const containerClasses = orientation === 'vertical' ? 'space-y-2' : 'flex items-center space-x-2';
  const stageClasses = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';

  return (
    <div className={containerClasses}>
      {stages.map((stage, index) => {
        const { isCompleted, isCurrent } = getStageStatus(stage);
        
        return (
          <div key={stage} className="flex items-center space-x-2">
            <div className={`${stageClasses} rounded-full flex items-center justify-center ${getStageColor(stage)} transition-colors`}>
              {getStageIcon(stage)}
            </div>
            <div className={orientation === 'vertical' ? 'block' : 'hidden md:block'}>
              <span className={`text-sm font-medium capitalize ${
                isCurrent ? 'text-blue-900' :
                isCompleted ? 'text-green-900' : 'text-gray-600'
              }`}>
                {stage.replace('_', ' ')}
              </span>
              {qcStages[stage]?.completedAt && (
                <div className="text-xs text-gray-500">
                  {new Date(qcStages[stage].completedAt).toLocaleDateString()}
                </div>
              )}
            </div>
            {orientation === 'horizontal' && index < stages.length - 1 && (
              <div className={`hidden md:block w-8 h-0.5 ${
                stages.indexOf(currentStage) > index ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BatchStageIndicator;