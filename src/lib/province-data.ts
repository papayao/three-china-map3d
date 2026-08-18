import { geoEquirectangular } from "d3-geo";
import { Box2, Vector2 } from "three";
import type { CityGeoJSON } from "./types";

/** 纵向拉伸系数：补偿等距圆柱的南北压缩 */
export const STRETCH_Y = 1.138;

export interface ProvinceRegion {
  name: string;
  center: [number, number, number];
  points: Vector2[][];
}

export function buildProvinceRegions(
  data: CityGeoJSON,
  depth: number
): { regions: ProvinceRegion[]; bbox: Box2 } {
  const firstFeature = data.features[0];
  const centerCoord = firstFeature.properties.centroid ?? firstFeature.properties.center;

  const projection = geoEquirectangular()
    .center(centerCoord as [number, number])
    .scale(1000)
    .translate([0, 0]);

  const bbox = new Box2();
  const toV2 = (coord: number[]) => {
    const [x, y] = projection(coord as [number, number])!;
    const projected = new Vector2(x, -y * STRETCH_Y);
    bbox.expandByPoint(projected);
    return projected;
  };

  const regions: ProvinceRegion[] = data.features.map((feature) => {
    const geometry = feature.geometry;
    const coords = geometry.coordinates as unknown;
    const polygons: number[][][][] =
      geometry.type === "MultiPolygon"
        ? (coords as number[][][][])
        : [(coords as number[][][])];

    const points: Vector2[][] = polygons.flatMap((polygon) =>
      polygon.map((ring) => ring.map(toV2))
    );

    const cp = feature.properties.centroid ?? feature.properties.center;
    const centerCoord: [number, number] = Array.isArray(cp)
      ? (cp as [number, number])
      : ((polygons[0]?.[0]?.[0] ?? [0, 0]) as [number, number]);
    const [cx, cy] = projection(centerCoord)!;

    return {
      name: feature.properties.name,
      center: [cx, -cy * STRETCH_Y, depth + 0.1],
      points,
    };
  });

  return { regions, bbox };
}
