import { useCallback, useMemo, useState } from 'react';
import { RestoreFeatureCollection, RestorePolygon } from '../types/exclusion';

export interface UseRestorePolygonsResult {
  /** All stored restore polygons as GeoJSON features */
  restores: RestorePolygon[];
  /** Number of restore polygons currently stored */
  restoreCount: number;
  /** All restores as a GeoJSON FeatureCollection */
  restoreCollection: RestoreFeatureCollection;
  /** Append a newly drawn restore polygon */
  addRestore: (feature: RestorePolygon) => void;
  /** Remove all stored restore polygons */
  clearRestores: () => void;
}

export function useRestorePolygons(): UseRestorePolygonsResult {
  const [restores, setRestores] = useState<RestorePolygon[]>([]);

  const restoreCount = restores.length;

  const restoreCollection = useMemo(
    (): RestoreFeatureCollection => ({
      type: 'FeatureCollection',
      features: restores,
    }),
    [restores],
  );

  const addRestore = useCallback((feature: RestorePolygon) => {
    setRestores(prev => [...prev, feature]);
  }, []);

  const clearRestores = useCallback(() => {
    setRestores([]);
  }, []);

  return {
    restores,
    restoreCount,
    restoreCollection,
    addRestore,
    clearRestores,
  };
}
