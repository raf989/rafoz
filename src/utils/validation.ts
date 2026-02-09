const SEGMENT_CHAR_LIMIT = 50;

export const validateSegments = (val: string) => {
  if (!val) return { isValid: true, invalidSegments: [] };
  const segments = val.split('/');
  const invalidSegments = segments.filter(s => s.trim().length > SEGMENT_CHAR_LIMIT);
  return {
    isValid: invalidSegments.length === 0,
    invalidSegments
  };
};

export const SEGMENT_CHAR_LIMIT_EXPORT = SEGMENT_CHAR_LIMIT;
