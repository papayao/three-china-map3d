import { useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  QuadraticBezierCurve3,
  Vector3,
  Vector2,
  Color,
  Mesh,
  AdditiveBlending,
} from "three";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";

export interface FlyLineTarget {
  pos: [number, number];
  height: number;
}

export interface FlyLinesProps {
  origin: [number, number];
  originHeight: number;
  targets: FlyLineTarget[];
  depth?: number;
  arcHeight?: number;
  baseColor?: string;
  flyColor?: string;
  headColor?: string;
  headPower?: number;
  lineWidth?: number;
  dashSize?: number;
  speed?: number;
  showBaseLine?: boolean;
  visibleAfter?: number;
}

export default function FlyLines({
  origin,
  originHeight,
  targets,
  depth = 40,
  arcHeight = 120,
  baseColor = "#f59e0b",
  flyColor = "#ff7700",
  headColor = "#ffffff",
  headPower = 0.3,
  lineWidth = 15,
  dashSize = 0.12,
  speed = 0.8,
  showBaseLine = true,
  visibleAfter = 0,
}: FlyLinesProps) {
  const { size } = useThree();
  const SEGMENTS = 48;
  const [visible, setVisible] = useState(visibleAfter <= 0);

  useEffect(() => {
    if (visibleAfter <= 0) return;
    const timer = setTimeout(() => setVisible(true), visibleAfter * 1000);
    return () => clearTimeout(timer);
  }, [visibleAfter]);

  const start = useMemo(
    () => new Vector3(origin[0], origin[1], depth + originHeight),
    [origin, depth, originHeight]
  );

  const arcs = useMemo(() => {
    return targets.map((t) => {
      const end = new Vector3(t.pos[0], t.pos[1], depth + t.height);
      const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
      const control = new Vector3(mid.x, mid.y, mid.z + arcHeight);
      const curve = new QuadraticBezierCurve3(start, control, end);

      const points = curve.getPoints(SEGMENTS);
      const length = curve.getLength();

      // 1. 基准线条：renderOrder=30, depthTest=false, 全视角永不遮挡
      const baseMat = new MeshLineMaterial({
        color: new Color(baseColor),
        lineWidth: lineWidth * 0.45,
        resolution: new Vector2(size.width || 1920, size.height || 1080),
        opacity: 0.4,
        sizeAttenuation: 0,
        ...({ transparent: true, depthTest: false, depthWrite: false } as any),
      });

      const baseGeo = new MeshLineGeometry();
      baseGeo.setPoints(points as any);
      const baseLine = new Mesh(baseGeo, baseMat);
      baseLine.renderOrder = 30;
      baseLine.raycast = () => null;

      // 2. 发光流动飞线：renderOrder=35, depthTest=false
      const flyMat = new MeshLineMaterial({
        lineWidth: lineWidth * 1.2,
        resolution: new Vector2(size.width || 1920, size.height || 1080),
        opacity: 1.0,
        blending: AdditiveBlending,
        useDash: 1,
        dashArray: 1,
        dashRatio: dashSize,
        dashOffset: 0,
        sizeAttenuation: 0,
        ...({ transparent: true, depthTest: false, depthWrite: false } as any),
      });

      flyMat.onBeforeCompile = (shader) => {
        shader.uniforms.gradStart = { value: new Color(headColor) };
        shader.uniforms.gradEnd = { value: new Color(flyColor) };
        shader.uniforms.gradPower = { value: headPower };
        shader.fragmentShader = `
          uniform vec3 gradStart;
          uniform vec3 gradEnd;
          uniform float gradPower;
        ` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          `if (useDash == 1.) diffuseColor.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));`,
          `
          if (useDash == 1.) {
            float d = mod(vCounters + dashOffset, dashArray) / dashArray;
            if (d < dashRatio) {
              float t = 1.0 - (d / dashRatio);
              // 色彩渐变：头部纯白 -> 尾部亮橙
              diffuseColor.rgb = mix(gradStart, gradEnd, pow(t, gradPower));
              // 透明度：头部最亮聚光，尾部羽化全透明
              float alphaCurve = smoothstep(0.0, 0.1, 1.0 - t) * pow(1.0 - t, 1.5);
              diffuseColor.a *= alphaCurve;
            } else {
              diffuseColor.a = 0.0;
            }
          }
          `
        );
      };

      const flyGeo = new MeshLineGeometry();
      flyGeo.setPoints(points as any);
      const flyLine = new Mesh(flyGeo, flyMat);
      flyLine.renderOrder = 35;
      flyLine.raycast = () => null;

      return { curve, length, flyMat, baseLine, flyLine, baseMat };
    });
  }, [targets, start, depth, arcHeight, baseColor, flyColor, headColor, headPower, lineWidth, dashSize, size.width, size.height]);

  // 动态同步画布分辨率
  useEffect(() => {
    const res = new Vector2(size.width, size.height);
    arcs.forEach((a) => {
      a.baseMat.resolution.copy(res);
      a.flyMat.resolution.copy(res);
    });
  }, [arcs, size.width, size.height]);

  // 每帧推进流光
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const arc of arcs) {
      const offset = (t * speed * (arc.length / 800)) % 1;
      arc.flyMat.dashOffset = -offset;
    }
  });

  return (
    <group visible={visible}>
      {arcs.map((arc, i) => (
        <group key={i}>
          {showBaseLine && <primitive object={arc.baseLine} />}
          <primitive object={arc.flyLine} />
        </group>
      ))}
    </group>
  );
}
