import { createContext, useContext } from 'react';
export const AcademicContext = createContext(null);
export const useAcademic = () => useContext(AcademicContext);
