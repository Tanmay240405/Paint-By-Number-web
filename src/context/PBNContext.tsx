import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PBNResult } from '../services/paintByNumbersService';

interface PBNContextType {
  result: PBNResult | null;
  setResult: (result: PBNResult | null) => void;
  activePaintingId: string | null;
  setActivePaintingId: (id: string | null) => void;
}

const PBNContext = createContext<PBNContextType>({
  result: null,
  setResult: () => {},
  activePaintingId: null,
  setActivePaintingId: () => {},
});

export const usePBNResult = () => useContext(PBNContext);

export const PBNProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [result, setResult] = useState<PBNResult | null>(null);
  const [activePaintingId, setActivePaintingId] = useState<string | null>(null);
  
  return (
    <PBNContext.Provider value={{ result, setResult, activePaintingId, setActivePaintingId }}>
      {children}
    </PBNContext.Provider>
  );
};

