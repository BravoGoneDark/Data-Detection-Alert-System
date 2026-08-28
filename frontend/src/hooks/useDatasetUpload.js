// frontend/src/hooks/useDatasetUpload.js
import { useState } from 'react';
import { API_URL } from '../constants/classifications';

export function useDatasetUpload(token, logout, fetchDatasets, feeds, qFeeds) {
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState('INTERNAL');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isAsyncMode, setIsAsyncMode] = useState(false);
  const [asyncTask, setAsyncTask] = useState(null);

  const handleUpload = async (isForceOrEvent = false, explicitForce = false) => {
    let isForce = false;
    if (typeof isForceOrEvent === 'boolean') {
      isForce = isForceOrEvent;
    } else if (typeof explicitForce === 'boolean') {
      isForce = explicitForce;
    }
    if (isForceOrEvent && typeof isForceOrEvent.preventDefault === 'function') {
      isForceOrEvent.preventDefault();
    }
    if (!file) return;

    setLoading(true);
    setError(null);
    if (!isForce) setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('classification', classification);
    if (description) formData.append('description', description);
    if (isForce) formData.append('force', 'true');

    try {
      if (isAsyncMode) {
        setAsyncTask({ progress: 10, message: 'Queueing task in Redis background pool...', status: 'PENDING' });
        const response = await fetch(`${API_URL}/datasets/upload-async`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Async upload dispatch failed');
        }

        const data = await response.json();
        const taskId = data.task_id;

        const pollTimer = setInterval(async () => {
          try {
            const taskRes = await fetch(`${API_URL}/tasks/${taskId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (taskRes.ok) {
              const taskData = await taskRes.json();
              setAsyncTask(taskData);
              if (taskData.status === 'COMPLETED') {
                clearInterval(pollTimer);
                setLoading(false);
                if (taskData.result) {
                  setResult(taskData.result);
                  await fetchDatasets();
                  if (feeds?.fetchLshStats) await feeds.fetchLshStats();
                  if (feeds?.fetchAnomalies) await feeds.fetchAnomalies();
                }
              } else if (taskData.status === 'FAILED' || taskData.status === 'CANCELLED') {
                clearInterval(pollTimer);
                setLoading(false);
                setError(taskData.error || taskData.message || 'Async task failed');
              }
            }
          } catch (pollErr) {
            console.error('Task poll error:', pollErr);
          }
        }, 400);
        return;
      }

      // Synchronous Direct Path
      const response = await fetch(`${API_URL}/datasets/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);
      await fetchDatasets();
      if (feeds?.fetchLshStats) await feeds.fetchLshStats();
      if (feeds?.fetchAnomalies) await feeds.fetchAnomalies();
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      if (!isAsyncMode) setLoading(false);
    }
  };

  const handleDownload = async (datasetId, filename) => {
    setDownloadingId(datasetId);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        if (qFeeds?.fetchMyQuarantineStatus) await qFeeds.fetchMyQuarantineStatus();
        if (qFeeds?.fetchQuarantines) await qFeeds.fetchQuarantines();
        throw new Error(`[SECURITY ACCESS DENIAL] ${errData.detail || 'Access restricted by security policy'}`);
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `dataset_${datasetId}.bin`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await fetchDatasets();
      if (feeds?.fetchAnomalies) await feeds.fetchAnomalies();
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return {
    file,
    setFile,
    classification,
    setClassification,
    description,
    setDescription,
    loading,
    result,
    setResult,
    error,
    setError,
    downloadingId,
    isAsyncMode,
    setIsAsyncMode,
    asyncTask,
    handleUpload,
    handleDownload,
  };
}
