import React from 'react';
import CheckIcon from './icons/CheckIcon';
import SaveIcon from './icons/SaveIcon';
import type { SaveButtonProps } from '../types';

const SaveButton: React.FC<SaveButtonProps> = ({
  saving,
  saved,
  saveProgress,
  savePhase,
  disabled,
  onClick,
  label = 'Save',
}) => {
  const hasProgress = saveProgress !== undefined && savePhase !== undefined;
  
  return (
    <div className="w-full max-w-md">
      {saving && hasProgress && (
        <div className="w-full mb-4">
          <div className="text-sm text-gray-600 mb-2 text-center">
            Processing...
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${saveProgress}%` }}
            />
          </div>
        </div>
      )}
      
      <button
        className="w-full bg-purple-500 text-white px-4 py-3 rounded-xl shadow-neumorph disabled:opacity-50 hover:bg-purple-400 flex items-center justify-center gap-2 text-lg font-medium"
        disabled={disabled}
        onClick={onClick}
      >
        {saved ? (
          <CheckIcon width={20} height={20} />
        ) : (
          <SaveIcon width={20} height={20} />
        )}
        {saving 
          ? (hasProgress ? savePhase : 'Processing...') 
          : saved ? 'Saved!' : label
        }
      </button>
    </div>
  );
};

export default SaveButton;