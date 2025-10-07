import React from 'react';
import { useFeatureFlag } from '../featureFlags/useFeatureFlag';
import { logKPI } from '../../utils/kpi';

export const EscalasModule: React.FC = () => {
  const enabled = useFeatureFlag('ESCALAS');
  if (!enabled) return null;

  const handleSave = () => {
    logKPI('escalas_save', { time: Date.now() });
  };

  return <div>
    <button onClick={handleSave}>Guardar Escala</button>
  </div>;
};