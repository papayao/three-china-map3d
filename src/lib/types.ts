import type { Shape, Vector2 } from "three";

export type GeoJSONPolygon = number[][][];
export type GeoJSONMultiPolygon = number[][][][];

export interface FeatureProperties {
  name: string;
  center?: [number, number];
  centroid?: [number, number];
  [key: string]: any;
}

export interface CityGeoFeature {
  type: "Feature";
  properties: FeatureProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: GeoJSONPolygon | GeoJSONMultiPolygon;
  };
}

export interface CityGeoJSON {
  type: "FeatureCollection";
  features: CityGeoFeature[];
}

export interface ProvinceRegionData {
  name: string;
  center: [number, number];
  shapes: Shape[];
  linePoints: Vector2[][];
}

export interface MapBoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
