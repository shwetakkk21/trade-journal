import { useState, useCallback } from 'react';

export function useNotifications() {
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'INFO',
    onConfirm: null,
  });

  const notify = useCallback((title, message, type = 'INFO', onConfirm = null) => {
    setAlertConfig({ isOpen: true, title, message, type, onConfirm });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { alertConfig, notify, closeAlert };
}
