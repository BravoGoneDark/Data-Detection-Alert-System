// src/constants/classifications.js

export const API_URL = (() => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
    if (window.location.port === '3000') {
      return '/api';
    }
  }
  return 'http://127.0.0.1:8000';
})();

export const CLASSIFICATIONS = [
  { value: 'INTERNAL', label: 'Internal', desc: 'Standard internal access (Students, Faculty, Researchers, Admins)' },
  { value: 'PUBLIC', label: 'Public', desc: 'Accessible to everyone, including guests' },
  { value: 'RESTRICTED', label: 'Restricted', desc: 'Higher security clearance (Faculty, Researchers, Admins)' },
  { value: 'CONFIDENTIAL', label: 'Confidential', desc: 'Strict clearance (Admins only)' },
];

export function getClassificationBadge(classification) {
  const cls = (classification || 'INTERNAL').toUpperCase();
  switch (cls) {
    case 'PUBLIC':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
    case 'RESTRICTED':
      return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    case 'CONFIDENTIAL':
      return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
    case 'INTERNAL':
    default:
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
  }
}
