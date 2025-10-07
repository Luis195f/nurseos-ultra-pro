import React, { useState } from 'react';
import { useFeatureFlag } from '../featureFlags/useFeatureFlag';
import { logKPI } from '../../utils/kpi';

export const BCMAModule: React.FC = () => {
  const enabled = useFeatureFlag('BCMA');
  const [adminDraft, setAdminDraft] = useState<any>(null);

  if (!enabled) return null;

  const handleDraft = () => {
    setAdminDraft({ medication: 'Ejemplo', status: 'draft' });
    logKPI('bcma_draft', { time: Date.now() });
  };

  return <div>
    <button onClick={handleDraft}>Nuevo registro BCMA</button>
    {adminDraft && <div>Draft creado: {JSON.stringify(adminDraft)}</div>}
  </div>;
};