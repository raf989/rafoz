export const formatDate = (ts: number) => {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const truncate = (str: string, limit: number) => {
  if (!str) return '-';
  return str.length > limit ? str.substring(0, limit) + '...' : str;
};

export const sanitizeFilename = (name: string) => {
  return name
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const normalizeLabel = (label: string) => label.trim().toLowerCase();
