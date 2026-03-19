import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PBNResult } from '../services/paintByNumbersService';

interface PBNContextType {
  result: PBNResult | null;
  setResult: (result: PBNResult | null) => void;
}

const PBNContext = createContext<PBNContextType>({
  result: null,
  setResult: () => {},
});

export const usePBNResult = () => useContext(PBNContext);

export const PBNProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [result, setResult] = useState<PBNResult | null>(null);
  return (
    <PBNContext.Provider value={{ result, setResult }}>
      {children}
    </PBNContext.Provider>
  );
};
