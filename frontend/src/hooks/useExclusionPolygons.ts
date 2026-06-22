import { useCallback, useMemo, useState } from 'react';
import { ExclusionFeatureCollection, ExclusionPolygon } from '../types/exclusion';

export interface UseExclusionPolygonsResult {
  /** All stored exclusion polygons as GeoJSON features */
  exclusions: ExclusionPolygon[];
  /** Number of exclusion polygons currently stored */
  exclusionCount: number;
  /** All exclusions as a GeoJSON FeatureCollection */
  exclusionCollection: ExclusionFeatureCollection;
  /** Append a newly drawn exclusion polygon */
  addExclusion: (feature: ExclusionPolygon) => void;
  /** Remove all stored exclusion polygons */
  clearExclusions: () => void;
}

export function useExclusionPolygons(): UseExclusionPolygonsResult {
  const [exclusions, setExclusions] = useState<ExclusionPolygon[]>([]);

  const exclusionCount = exclusions.length;

  const exclusionCollection = useMemo(
    (): ExclusionFeatureCollection => ({
      type: 'FeatureCollection',
      features: exclusions,
    }),
    [exclusions],
  );

  const addExclusion = useCallback((feature: ExclusionPolygon) => {
    setExclusions(prev => [...prev, feature]);
  }, []);

  const clearExclusions = useCallback(() => {
    setExclusions([]);
  }, []);

  return {
    exclusions,
    exclusionCount,
    exclusionCollection,
    addExclusion,
    clearExclusions,
  };
}
