import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type Mesh,
  type Texture,
} from "three";

import guangquan01 from "@/assets/guangquan01.png";
import huiguang from "@/assets/huiguang.png";

let cachedTexturesPromise: Promise<[Texture, Texture]> | null = null;
function getSharedTextures(): Promise<[Texture, Texture]> {
  if (!cachedTexturesPromise) {
    const loader = new TextureLoader();
    const src1 = typeof guangquan01 === "string" ? guangquan01 : (guangquan01 as any).src;
    const src2 = typeof huiguang === "string" ? huiguang : (huiguang as any).src;

    cachedTexturesPromise = Promise.all([
      loader.loadAsync(src1),
      loader.loadAsync(src2),
    ]).then(([t1, t2]) => {
      t2.colorSpace = SRGBColorSpace;
      t2.wrapS = t2.wrapT = RepeatWrapping;
      return [t1, t2];
    });
  }
  return cachedTexturesPromise;
}

export interface ProvinceBarProps {
  /** 该省在地图 group 内的局部坐标 [x, y, 0] */
  position: [number, number, number];
  /** 柱子高度 */
  height?: number;
  /** 柱体粗细系数 */
  factor?: number;
  /** 渐变底部色 */
  uColor1?: Color;
  /** 渐变顶部色 */
  uColor2?: Color;
  /** 是否显示 */
  visible?: boolean;
  /** 柱子开始升起的延迟（秒，配合地图 3D 拔高完成后升起） */
  riseDelay?: number;
  /** 柱子从 0 长到目标高度的时长（秒） */
  riseDuration?: number;
}

export default function ProvinceBar({
  position,
  height = 150,
  factor = 150,
  uColor1 = new Color(0xfbdf88),
  uColor2 = new Color(0xea580c),
  visible = true,
  riseDelay = 0,
  riseDuration = 0.8,
}: ProvinceBarProps) {
  const quanRef = useRef<Mesh>(null!);
  const groupRef = useRef<Group>(null!);
  const growStateRef = useRef<{ scale: number; started: number }>({ scale: 0, started: -1 });
  const [textures, setTextures] = useState<[Texture | null, Texture | null]>([null, null]);

  useEffect(() => {
    let isMounted = true;
    getSharedTextures().then(([t1, t2]) => {
      if (isMounted) setTextures([t1, t2]);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const [texture1, texture2] = textures;
  const barHeight = height;

  const boxGeometry = useMemo(
    () => new BoxGeometry(0.1 * factor, 0.1 * factor, barHeight),
    [factor, barHeight]
  );

  // 光环旋转
  useEffect(() => {
    let animId: number;
    function animate() {
      if (quanRef.current) {
        quanRef.current.rotation.z += 0.02;
      }
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 柱子从 0 升到目标高度（scale.z 从贴图地表面垂直向上生长）
  useFrame(({ clock }) => {
    const g = growStateRef.current;
    const t = clock.elapsedTime;
    if (g.started < 0) {
      if (t >= riseDelay) {
        g.started = t;
      }
      return;
    }
    const p = Math.min((t - g.started) / riseDuration, 1);
    g.scale = 1 - Math.pow(1 - p, 3); // easeOutCubic
    if (groupRef.current) groupRef.current.scale.z = g.scale;
    if (p >= 1) g.scale = 1;
  });

  return (
    <group position={position} visible={visible}>
      {/* 光柱主体与三面辉光生长容器 */}
      <group ref={groupRef} scale={[1, 1, 0]}>
        {/* 光柱（渐变柱体） */}
        <mesh renderOrder={5} position={[0, 0, barHeight / 2]} raycast={() => null}>
          <primitive object={boxGeometry} attach="geometry" />
          <meshBasicMaterial
            transparent
            color="#ffffff"
            opacity={1}
            depthTest={false}
            fog={false}
            onBeforeCompile={(shader) => {
              shader.uniforms = {
                ...shader.uniforms,
                uColor1: { value: uColor1 },
                uColor2: { value: uColor2 },
                uSize: { value: barHeight },
              };
              shader.vertexShader = shader.vertexShader.replace(
                "void main() {",
                `
                  varying vec3 vPosition;
                  void main() {
                    vPosition = position;
                `
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                "void main() {",
                `
                  varying vec3 vPosition;
                  uniform vec3 uColor1;
                  uniform vec3 uColor2;
                  uniform float uSize;
                  void main() {
                `
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                "#include <opaque_fragment>",
                /* glsl */ `
                #ifdef OPAQUE
                diffuseColor.a = 1.0;
                #endif
                #ifdef USE_TRANSMISSION
                diffuseColor.a *= transmissionAlpha + 0.1;
                #endif
                vec3 gradient = mix(uColor1, uColor2, (vPosition.z + uSize / 2.0) / uSize);
                outgoingLight = outgoingLight * gradient;
                gl_FragColor = vec4(outgoingLight, diffuseColor.a);
                `
              );
            }}
          />
        </mesh>

        {/* 三面竖直辉光：垂直伫立在地图表面（沿 Z 轴立起），三面以 0°、60°、120° 穿透柱体立体发光 */}
        {texture2 && (
          <group position={[0, 0, barHeight / 2]}>
            {[0, 60, 120].map((deg) => (
              <group key={deg} rotation={[0, 0, (Math.PI / 180) * deg]}>
                <mesh
                  rotation={[Math.PI / 2, 0, 0]}
                  renderOrder={10}
                  raycast={() => null}
                >
                  <planeGeometry args={[18, barHeight]} />
                  <meshBasicMaterial
                    transparent
                    color={uColor2}
                    map={texture2}
                    opacity={0.65}
                    depthWrite={false}
                    depthTest={false}
                    side={DoubleSide}
                    blending={AdditiveBlending}
                  />
                </mesh>
              </group>
            ))}
          </group>
        )}
      </group>

      {/* 旋转光环：平躺在柱子地表面（z=0.5），围绕柱底旋转 */}
      {texture1 && (
        <mesh renderOrder={6} ref={quanRef} position={[0, 0, 0.5]} raycast={() => null}>
          <planeGeometry args={[30, 30]} />
          <meshBasicMaterial
            transparent
            color={0xffffff}
            map={texture1}
            alphaMap={texture1}
            opacity={0.9}
            depthWrite={false}
            depthTest={false}
            fog={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}
