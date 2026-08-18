import { useLayoutEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import {
  Box2,
  DoubleSide,
  Float32BufferAttribute,
  Shape,
  ShapeGeometry,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Texture,
} from "three";
import type { ProvinceRegion } from "./province-data";

export interface ProvinceProps {
  data: ProvinceRegion;
  /** 全局投影 bbox（用于顶面纹理 UV 归一化） */
  bbox: Box2;
  /** 挤出高度 */
  depth?: number;
  /** 悬停时抬升倍数 */
  hoverScale?: number;
  /** 顶面卫星纹理 */
  map?: Texture;
  /** 纯色兜底 */
  color?: string;
  /** hover 高亮色 */
  hoverColor?: string;
  /** 默认高亮（该省常亮，如四川） */
  highlight?: boolean | string;
  /** 边缘线颜色 */
  edgeColor?: string;
  /** 侧壁颜色（默认暖米白 #f9f3e7） */
  sideWallColor?: string;
  onPointerClick?: (name: string) => void;
}

export default function Province({
  data,
  bbox,
  depth = 40,
  hoverScale = 1.35,
  map,
  color = "#0e2a47",
  hoverColor = "#ff9100",
  highlight,
  edgeColor = "#ffffff",
  sideWallColor = "#f9f3e7",
  onPointerClick,
}: ProvinceProps) {
  const groupRef = useRef<Group>(null!);
  const materialRef = useRef<MeshStandardMaterial>(null!);
  const topMeshRef = useRef<Mesh>(null!);

  const [shapes, shapeGeometry] = useMemo(() => {
    const shapeList = data.points
      .filter((ring) => ring.length >= 3)
      .map((ring) => new Shape(ring));
    const geometry = new ShapeGeometry(shapeList);
    return [shapeList, geometry];
  }, [data.points]);

  // 顶面 UV 归一化
  useLayoutEffect(() => {
    const mesh = topMeshRef.current;
    if (!mesh) return;
    const geometry = mesh.geometry;
    const pos = geometry.attributes.position;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    if (width <= 0 || height <= 0) return;
    const uv: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.push((x - bbox.min.x) / width, (y - bbox.min.y) / height);
    }
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  }, [bbox, shapeGeometry]);

  useLayoutEffect(() => {
    if (materialRef.current && map) {
      materialRef.current.needsUpdate = true;
    }
  }, [map]);

  useLayoutEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    if (highlight) {
      mat.emissive.set(highlight === true ? hoverColor : highlight);
      mat.emissiveIntensity = 0.35;
    } else {
      mat.emissive.set("#000000");
      mat.emissiveIntensity = 0;
    }
  }, [highlight, hoverColor]);

  const handleOver = (e: any) => {
    e.stopPropagation();
    if (groupRef.current) {
      gsap.to(groupRef.current.scale, { z: hoverScale, duration: 0.2, overwrite: "auto" });
    }
    const mat = materialRef.current;
    if (mat) {
      if (map) {
        mat.emissive.set(hoverColor);
        mat.emissiveIntensity = 0.4;
      } else {
        mat.color.set(hoverColor);
      }
    }
    document.body.style.cursor = "pointer";
  };

  const handleOut = () => {
    if (groupRef.current) {
      gsap.to(groupRef.current.scale, { z: 1, duration: 0.2, overwrite: "auto" });
    }
    const mat = materialRef.current;
    if (mat) {
      if (map) {
        if (highlight) {
          mat.emissive.set(highlight === true ? hoverColor : highlight);
          mat.emissiveIntensity = 0.35;
        } else {
          mat.emissive.set("#000000");
          mat.emissiveIntensity = 0;
        }
      } else {
        mat.color.set(color);
      }
    }
    document.body.style.cursor = "auto";
  };

  return (
    <group
      ref={groupRef}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={(e) => {
        e.stopPropagation();
        onPointerClick?.(data.name);
      }}>
      {/* 1. 顶面（贴自然地球卫星影像） */}
      {shapes.length > 0 && (
        <mesh ref={topMeshRef} position-z={depth + 0.1} renderOrder={1}>
          <shapeGeometry args={[shapes]} />
          <meshStandardMaterial
            ref={materialRef}
            map={map}
            color={map ? "#ffffff" : color}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      )}

      {/* 2. 3D 浮雕立体侧壁 */}
      {shapes.length > 0 && (
        <mesh castShadow receiveShadow renderOrder={0}>
          <extrudeGeometry
            args={[shapes, { depth, steps: 1, bevelEnabled: false }]}
          />
          <meshStandardMaterial
            color={map ? sideWallColor : color}
            metalness={0.2}
            roughness={0.5}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* 3. 省份边界线 */}
      {shapes.length > 0 && (
        <lineSegments position-z={depth + 0.6} renderOrder={10} raycast={() => null}>
          <edgesGeometry args={[shapeGeometry]} />
          <lineBasicMaterial transparent opacity={0.88} color={edgeColor} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
}
