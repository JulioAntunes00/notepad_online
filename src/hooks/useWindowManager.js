import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

let windowIdCounter = 100;

export default function useWindowManager(loggedUser) {
  const [windowsState, setWindowsState] = useState([]);
  const windowsRef = useRef([]);

  useEffect(() => {
    // Ao trocar de usuário, remove tudo exceto a janela de login
    setWindowsState(prev => prev.filter(w => w.type === 'login'));
    windowsRef.current = windowsRef.current.filter(w => w.type === 'login');

    if (!loggedUser) return;
    
    let isMounted = true;

    const loadDb = async () => {
       let parsed = [];
       if (loggedUser === 'Anônimo') {
         const w = localStorage.getItem('retronote_windows');
         if (w) parsed = JSON.parse(w);
       } else if (loggedUser.id) {
         const { data } = await supabase.from('retronote_windows').select('*').eq('user_id', loggedUser.id).single();
         if (data && data.windows_json) parsed = data.windows_json;
       }
       
       if (isMounted && parsed && parsed.length > 0) {
           setWindowsState(prev => {
              const activeIds = new Set(parsed.map(p => p.id));
              const prevKept = prev.filter(p => !activeIds.has(p.id) && p.type === 'login');
              const next = [...parsed, ...prevKept];
              windowsRef.current = next;
              const maxId = Math.max(100, ...parsed.map(w => parseInt(w.id.replace('win-', '')) || 0));
              windowIdCounter = maxId;
              return next;
           });
       }
    };
    loadDb();
    return () => { isMounted = false; };
  }, [loggedUser]);

  useEffect(() => {
    if (!loggedUser) return;
    const timeout = setTimeout(() => {
       const storable = windowsState.filter(w => w.type !== 'login');
       if (loggedUser === 'Anônimo') {
           localStorage.setItem('retronote_windows', JSON.stringify(storable));
       } else if (loggedUser.id) {
           supabase.from('retronote_windows')
                   .upsert([{ user_id: loggedUser.id, windows_json: storable }])
                   .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao salvar janelas:', error.message); });
       }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [windowsState, loggedUser]);

  const setWindows = useCallback((setter) => {
    setWindowsState((prev) => {
      const next = typeof setter === 'function' ? setter(prev) : setter;
      windowsRef.current = next;
      return next;
    });
  }, []);

  const focusWindow = useCallback((id) => {
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
      return prev.map((w) => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  }, [setWindows]);

  const restoreWindow = useCallback((id) => {
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
      return prev.map((w) => w.id === id ? { ...w, minimized: false, zIndex: maxZ + 1 } : w);
    });
  }, [setWindows]);

  const openWindow = useCallback((type, title, context = {}, defaultState = {}) => {
    if (context.noteId) {
      const existing = windowsRef.current.find(w => w.context?.noteId === context.noteId);
      if (existing) {
        focusWindow(existing.id);
        restoreWindow(existing.id);
        return existing.id;
      }
    }

    const id = `win-${++windowIdCounter}`;
    const offset = (windowIdCounter % 5) * 30;
    const maxZ = Math.max(...windowsRef.current.map(w => w.zIndex), 10);
    const newWindow = {
      id,
      type,
      title,
      context,
      minimized: false,
      maximized: false,
      zIndex: maxZ + 1,
      x: defaultState.x !== undefined ? defaultState.x : 100 + offset,
      y: defaultState.y !== undefined ? defaultState.y : 60 + offset,
      width: defaultState.width || 600,
      height: defaultState.height || 400,
    };
    setWindows([...windowsRef.current, newWindow]);
    return id;
  }, [focusWindow, restoreWindow, setWindows]);

  const closeWindow = useCallback((id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, [setWindows]);

  const minimizeWindow = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  }, [setWindows]);

  const toggleMaximize = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized } : w
      )
    );
  }, [setWindows]);

  const updateWindow = useCallback((id, updates) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  }, [setWindows]);

  return { windows: windowsState, openWindow, closeWindow, minimizeWindow, restoreWindow, toggleMaximize, focusWindow, updateWindow };
}
