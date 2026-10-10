import { createContext, useContext } from 'react';
export const FeedbackContext = createContext(null);
export const useFeedback = () => useContext(FeedbackContext);
