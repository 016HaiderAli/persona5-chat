import { createContext, useContext, useState, useCallback } from 'react';

const PanelContext = createContext(null);

export function PanelProvider({ children }) {
  const [activePanel, setActivePanel] = useState(null);

  const open = useCallback((panel) => {
    setActivePanel(panel);
  }, []);

  const close = useCallback((panel) => {
    setActivePanel((prev) => (prev === panel ? null : prev));
  }, []);

  const toggle = useCallback((panel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const closeAll = useCallback(() => setActivePanel(null), []);

  return (
    <PanelContext.Provider value={{ activePanel, open, close, toggle, closeAll }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('usePanel must be used within PanelProvider');
  return ctx;
}

export default PanelContext;
