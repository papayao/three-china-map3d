import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gsap } from "gsap";
import { TextureLoader, type Group, type Texture } from "three";
import Province from "./province";
import ProvinceBar from "./ProvinceBar";
import FlyLines from "./FlyLines";
import { MapCloudGroup } from "./Clouds";
import { buildProvinceRegions } from "./province-data";
import Loading from "./Loading";
import type { CityGeoJSON } from "./types";

import defaultChinaGeo from "@/data/china-geo.json";
import defaultSatelliteTexture from "@/assets/natural_earth_china_8k.jpg";

/** 地图中心世界坐标 */
export const DEFAULT_WORLD_CENTER: [number, number, number] = [-211.6, 160, 232.6];
/** 默认挤出高度 */
export const DEFAULT_MAP_DEPTH = 65;
/** 相机观察距离 */
export const DEFAULT_CAM_DISTANCE = 1100;
export const DEFAULT_CAM_ALPHA = Math.PI / 15;
export const DEFAULT_CAM_BETA = Math.PI / 3;

export interface NodeBarData {
  name: string;
  pos: [number, number];
  h: number;
}

export const DEFAULT_NODE_BARS: NodeBarData[] = [
  { name: "北京 HQ", pos: [-0.3, -5.8], h: 570 },
  { name: "上海 Hub", pos: [88.1, -178.0], h: 400 },
  { name: "广东 R&D", pos: [-55.2, -338.8], h: 484 },
  { name: "四川 Cluster", pos: [-215.7, -189.1], h: 930 },
  { name: "重庆 Node", pos: [-172.3, -210.9], h: 665 },
  { name: "内蒙 Node", pos: [-82.9, 12.3], h: 244 },
  { name: "浙江 Node", pos: [65.1, -196.8], h: 360 },
  { name: "湖北 Node", pos: [-36.8, -192.1], h: 510 },
  { name: "陕西 Node", pos: [-130.5, -116.2], h: 496 },
  { name: "西藏 Node", pos: [-441.7, -209.5], h: 600 },
  { name: "新疆 Node", pos: [-501.6, 71.1], h: 538 },
];

export const BAR_HEIGHT_FOR_930 = 150;
export const nodeBarHeight = (h: number) => (h / 930) * BAR_HEIGHT_FOR_930;

let cachedSatelliteTexture: Texture | null = null;
let textureLoadingPromise: Promise<Texture> | null = null;

function getSharedSatelliteTexture(customSrc?: string): Promise<Texture> {
  if (cachedSatelliteTexture && !customSrc) return Promise.resolve(cachedSatelliteTexture);
  if (!textureLoadingPromise || customSrc) {
    const loader = new TextureLoader();
    const src = customSrc || (typeof defaultSatelliteTexture === "string" ? defaultSatelliteTexture : (defaultSatelliteTexture as any).src);
    textureLoadingPromise = loader.loadAsync(src).then((tex) => {
      if (!customSrc) cachedSatelliteTexture = tex;
      return tex;
    });
  }
  return textureLoadingPromise;
}

export interface ChinaMap3DProps {
  /** 自定义 GeoJSON 数据（默认内置高精全量中国地图数据） */
  geoData?: CityGeoJSON;
  /** 自定义卫星纹理 URL */
  satelliteTextureUrl?: string;
  /** 挤出高度（默认 65） */
  depth?: number;
  /** 省份板块底色（未贴纹理时） */
  color?: string;
  /** hover 高亮色 */
  hoverColor?: string;
  /** 边缘线颜色 */
  edgeColor?: string;
  /** 侧壁颜色（默认暖米白 #f9f3e7） */
  sideWallColor?: string;
  /** 是否启用自动旋转 */
  autoRotate?: boolean;
  /** 是否显示上空浮动云层 */
  showClouds?: boolean;
  /** 是否显示数据光柱 */
  showBars?: boolean;
  /** 是否显示流光飞线 */
  showFlyLines?: boolean;
  /** 自定义数据柱节点列表 */
  bars?: NodeBarData[];
  /** 飞线中心节点省份名称（默认 四川） */
  flyCenterProvince?: string;
  /** 飞线宽度 */
  flyLineWidth?: number;
  /** 飞线流动速度 */
  flySpeed?: number;
  /** 省份点击回调 */
  onProvinceClick?: (name: string) => void;
  /** 动画就绪回调 */
  onIntroComplete?: () => void;
}

function camPos(): [number, number, number] {
  const [tx, ty, tz] = DEFAULT_WORLD_CENTER;
  const x = tx + DEFAULT_CAM_DISTANCE * Math.sin(DEFAULT_CAM_ALPHA) * Math.cos(DEFAULT_CAM_BETA);
  const y = ty + DEFAULT_CAM_DISTANCE * Math.sin(DEFAULT_CAM_BETA);
  const z = tz + DEFAULT_CAM_DISTANCE * Math.cos(DEFAULT_CAM_ALPHA) * Math.cos(DEFAULT_CAM_BETA);
  return [x, y, z];
}

function SceneContent({
  geoData = defaultChinaGeo as unknown as CityGeoJSON,
  satelliteTextureUrl,
  depth = DEFAULT_MAP_DEPTH,
  color,
  hoverColor,
  edgeColor,
  sideWallColor,
  autoRotate = false,
  showClouds = true,
  showBars = true,
  showFlyLines = true,
  bars = DEFAULT_NODE_BARS,
  flyCenterProvince = "四川",
  flyLineWidth = 15,
  flySpeed = 0.8,
  onProvinceClick,
  onIntroComplete,
}: ChinaMap3DProps) {
  const { gl, camera } = useThree();
  const { regions, bbox } = useMemo(() => {
    return buildProvinceRegions(geoData, depth);
  }, [geoData, depth]);

  const [satelliteMap, setSatelliteMap] = useState<Texture | undefined>(() => cachedSatelliteTexture ?? undefined);

  useEffect(() => {
    let isMounted = true;
    getSharedSatelliteTexture(satelliteTextureUrl).then((tex) => {
      if (isMounted) setSatelliteMap(tex);
    });
    return () => {
      isMounted = false;
    };
  }, [satelliteTextureUrl]);

  const mapGroupRef = useRef<Group>(null!);
  const onIntroCompleteRef = useRef(onIntroComplete);
  onIntroCompleteRef.current = onIntroComplete;

  const centerNode = useMemo(
    () => bars.find((n) => n.name.includes(flyCenterProvince)) ?? bars[0],
    [bars, flyCenterProvince]
  );
  const flyTargets = useMemo(
    () =>
      bars
        .filter((n) => n !== centerNode)
        .map((n) => ({
          pos: n.pos,
          height: nodeBarHeight(n.h),
        })),
    [bars, centerNode]
  );

  useLayoutEffect(() => {
    if (!mapGroupRef.current || !camera || !gl) return;
    const group = mapGroupRef.current;
    group.scale.set(1, 1, 0.001);
    onIntroCompleteRef.current?.();

    const controls = new OrbitControls(camera, gl.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.zoomSpeed = 0.5;
    controls.minDistance = 400;
    controls.maxDistance = 3500;
    controls.maxPolarAngle = 1.5;
    controls.target.set(DEFAULT_WORLD_CENTER[0], DEFAULT_WORLD_CENTER[1], DEFAULT_WORLD_CENTER[2]);
    controls.update();

    let animId: number;
    function animate() {
      controls.update();
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);

    const pos = camPos();
    const tl = gsap.timeline();

    // 1) 0.0s ~ 1.2s: 相机从远处俯冲飞入到近景视角（此时地图保持 2D 扁平）
    tl.fromTo(
      camera.position,
      { x: pos[0] * 1.6, y: pos[1] * 1.6, z: pos[2] * 1.6 },
      {
        x: pos[0],
        y: pos[1],
        z: pos[2],
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => controls.update(),
      },
      0
    );

    // 2) 0.8s ~ 2.3s: 相机就位后，地图在近景特写下从 2D 扁平垂直拔高升起为 3D 浮雕形态！
    tl.fromTo(
      group.scale,
      { x: 1, y: 1, z: 0.001 },
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.5,
        ease: "power2.out",
      },
      0.8
    );

    return () => {
      tl.kill();
      cancelAnimationFrame(animId);
      controls.dispose();
    };
  }, [camera, gl, autoRotate]);

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight
        intensity={3.2}
        position={[DEFAULT_WORLD_CENTER[0], 2000, DEFAULT_WORLD_CENTER[2]]}
        color="#ffffff"
      />
      <directionalLight
        intensity={2.0}
        position={[DEFAULT_WORLD_CENTER[0] - 800, 1000, DEFAULT_WORLD_CENTER[2] + 800]}
        color="#fff5ea"
      />

      <group ref={mapGroupRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 160, 0]} scale={[1, 1, 0.001]}>
        {regions.map((region, idx) => (
          <Province
            key={`${region.name}-${idx}`}
            data={region}
            bbox={bbox}
            depth={depth}
            color={color}
            hoverColor={hoverColor}
            edgeColor={edgeColor}
            sideWallColor={sideWallColor}
            map={satelliteMap}
            highlight={region.name.includes(flyCenterProvince)}
            onPointerClick={onProvinceClick}
          />
        ))}

        {showBars &&
          bars.map((node) => (
            <ProvinceBar
              key={node.name}
              position={[node.pos[0], node.pos[1], depth]}
              height={(node.h / 930) * BAR_HEIGHT_FOR_930}
              factor={150}
              riseDelay={1.4}
              riseDuration={0.9}
            />
          ))}

        {showFlyLines && centerNode && (
          <FlyLines
            origin={centerNode.pos}
            originHeight={nodeBarHeight(centerNode.h)}
            targets={flyTargets}
            depth={depth}
            lineWidth={flyLineWidth}
            speed={flySpeed}
            baseColor="#f59e0b"
            flyColor="#ff7700"
            dashSize={0.12}
            headPower={0.3}
            showBaseLine={true}
            visibleAfter={2.5}
          />
        )}
      </group>

      {showClouds && <MapCloudGroup />}
    </>
  );
}

export default function ChinaMap3D(props: ChinaMap3DProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full relative bg-transparent overflow-hidden">
      <div
        className={`absolute inset-0 z-30 transition-opacity duration-300 pointer-events-none ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      >
        <Loading />
      </div>
      <Canvas
        flat
        camera={{ position: camPos(), fov: 50, far: 6000, near: 1 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, logarithmicDepthBuffer: true }}
      >
        <SceneContent {...props} onIntroComplete={() => setLoading(false)} />
      </Canvas>
    </div>
  );
}
