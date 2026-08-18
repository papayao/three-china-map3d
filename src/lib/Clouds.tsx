import React, {
  createContext,
  useContext,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  REVISION,
  DynamicDrawUsage,
  Color,
  Group,
  Vector3,
  InstancedMesh,
  Matrix4,
  Quaternion,
  BufferAttribute,
  TextureLoader,
} from "three";
import {
  applyProps,
  useFrame,
  useLoader,
  type ThreeElements,
  type Vector3 as FiberVector3,
  type Color as FiberColor,
} from "@react-three/fiber";

type CloudState = {
  uuid: string;
  index: number;
  segments: number;
  dist: number;
  matrix: Matrix4;
  bounds: Vector3;
  position: Vector3;
  volume: number;
  length?: number;
  ref?: React.RefObject<Group>;
  speed: number;
  growth: number;
  opacity: number;
  fade: number;
  density: number;
  rotation: number;
  rotationFactor: number;
  color: Color;
};

export type CloudsProps = Omit<ThreeElements["group"], "ref"> & {
  ref?: React.Ref<Group>;
  limit?: number;
  range?: number;
  frustumCulled?: boolean;
  textureUrl?: string;
};

export type CloudProps = Omit<ThreeElements["group"], "ref"> & {
  ref?: React.Ref<Group>;
  seed?: number;
  segments?: number;
  bounds?: FiberVector3;
  concentrate?: "random" | "inside" | "outside";
  scale?: Vector3;
  volume?: number;
  smallestVolume?: number;
  distribute?: (
    cloud: CloudState,
    index: number
  ) => { point: Vector3; volume?: number };
  growth?: number;
  speed?: number;
  fade?: number;
  opacity?: number;
  color?: FiberColor;
};

const parentMatrix = new Matrix4();
const translation = new Vector3();
const rotation = new Quaternion();
const cpos = new Vector3();
const cquat = new Quaternion();
const scale = new Vector3();

const flatQuat = new Quaternion().setFromAxisAngle(
  new Vector3(1, 0, 0),
  -Math.PI / 2
);

export const setUpdateRange = (
  attribute: BufferAttribute,
  updateRange: { start: number; count: number }
): void => {
  attribute.updateRanges[0] = updateRange;
};

const context = createContext<React.MutableRefObject<CloudState[]>>(null!);

export const Clouds = ({
  children,
  range,
  limit = 200,
  frustumCulled,
  textureUrl = "/cloud.png",
  ...props
}: CloudsProps) => {
  const instance = useRef<InstancedMesh>(null!);
  const clouds = useRef<CloudState[]>([]);
  const opacities = useMemo(
    () => new Float32Array(Array.from({ length: limit }, () => 1)),
    [limit]
  );
  const colors = useMemo(
    () =>
      new Float32Array(Array.from({ length: limit }, () => [1, 1, 1]).flat()),
    [limit]
  );

  const texture = useLoader(TextureLoader, textureUrl);

  let t = 0;
  let index = 0;
  let config: CloudState;
  const qat = new Quaternion();
  const dir = new Vector3(0, 0, 1);
  const pos = new Vector3();

  useFrame((state, delta) => {
    if (!instance.current) return;
    t = state.clock.elapsedTime;
    parentMatrix.copy(instance.current.matrixWorld).invert();
    state.camera.matrixWorld.decompose(cpos, cquat, scale);

    for (index = 0; index < clouds.current.length; index++) {
      config = clouds.current[index];
      if (!config.ref?.current) continue;
      config.ref.current.matrixWorld.decompose(translation, rotation, scale);
      translation.add(
        pos.copy(config.position).applyQuaternion(rotation).multiply(scale)
      );
      rotation
        .copy(flatQuat)
        .multiply(
          qat.setFromAxisAngle(
            dir,
            (config.rotation += delta * config.rotationFactor)
          )
        );
      scale.multiplyScalar(
        config.volume +
        ((1 + Math.sin(t * config.density * config.speed)) / 2) *
        config.growth
      );
      config.matrix
        .compose(translation, rotation, scale)
        .premultiply(parentMatrix);
      const worldPos = config.matrix.elements;
      config.dist = cpos
        .clone()
        .distanceTo(pos.set(worldPos[12], worldPos[13], worldPos[14]));
    }

    clouds.current.sort((a, b) => b.dist - a.dist);
    for (index = 0; index < clouds.current.length; index++) {
      config = clouds.current[index];
      opacities[index] =
        config.opacity *
        (config.dist < config.fade - 1 ? config.dist / config.fade : 1);
      instance.current.setMatrixAt(index, config.matrix);
      instance.current.setColorAt(index, config.color);
    }

    if (instance.current.geometry.attributes.cloudOpacity) {
      (instance.current.geometry.attributes.cloudOpacity as BufferAttribute).needsUpdate = true;
    }
    instance.current.instanceMatrix.needsUpdate = true;
    if (instance.current.instanceColor)
      instance.current.instanceColor.needsUpdate = true;
  });

  useLayoutEffect(() => {
    if (!instance.current) return;
    const count = Math.min(
      limit,
      range !== undefined ? range : limit,
      clouds.current.length
    );
    instance.current.count = count;
    setUpdateRange(instance.current.instanceMatrix, {
      start: 0,
      count: count * 16,
    });
    if (instance.current.instanceColor) {
      setUpdateRange(instance.current.instanceColor, {
        start: 0,
        count: count * 3,
      });
    }
    if (instance.current.geometry.attributes.cloudOpacity) {
      setUpdateRange(
        instance.current.geometry.attributes.cloudOpacity as BufferAttribute,
        { start: 0, count: count }
      );
    }
  });

  let imageBounds: [number, number] = [
    texture?.image?.width ?? 1,
    texture?.image?.height ?? 1,
  ];
  const max = Math.max(imageBounds[0], imageBounds[1]);
  imageBounds = [imageBounds[0] / max, imageBounds[1] / max];

  return (
    <group {...props}>
      <context.Provider value={clouds}>
        {children}
        <instancedMesh
          matrixAutoUpdate={false}
          ref={instance}
          args={[undefined, undefined, limit]}
          frustumCulled={frustumCulled}>
          <instancedBufferAttribute
            usage={DynamicDrawUsage}
            attach="instanceColor"
            args={[colors, 3]}
          />
          <planeGeometry args={[...imageBounds]}>
            <instancedBufferAttribute
              usage={DynamicDrawUsage}
              attach="attributes-cloudOpacity"
              args={[opacities, 1]}
            />
          </planeGeometry>
          <meshLambertMaterial
            transparent
            map={texture}
            depthWrite={false}
            onBeforeCompile={(shader) => {
              const opaque_fragment =
                parseInt(REVISION.replace(/\D+/g, "")) >= 154
                  ? "opaque_fragment"
                  : "output_fragment";
              shader.vertexShader =
                `attribute float cloudOpacity;
               varying float vOpacity;
              ` +
                shader.vertexShader.replace(
                  "#include <fog_vertex>",
                  `#include <fog_vertex>
                 vOpacity = cloudOpacity;
                `
                );
              shader.fragmentShader =
                `varying float vOpacity;
              ` +
                shader.fragmentShader.replace(
                  `#include <${opaque_fragment}>`,
                  `#include <${opaque_fragment}>
                 gl_FragColor = vec4(outgoingLight, diffuseColor.a * vOpacity);
                `
                );
            }}
          />
        </instancedMesh>
      </context.Provider>
    </group>
  );
};

export const CloudInstance = ({
  opacity = 1,
  speed = 0,
  bounds = [5, 1, 1],
  segments = 20,
  color = "#ffffff",
  fade = 10,
  volume = 6,
  smallestVolume = 0.25,
  distribute,
  growth = 4,
  concentrate = "inside",
  seed = Math.random(),
  ref: fref,
  ...props
}: CloudProps) => {
  function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const parent = useContext(context);
  const ref = useRef<Group>(null!);
  const uuid = useId();
  const clouds: CloudState[] = useMemo(() => {
    return [...new Array(segments)].map(
      (_, index) =>
      ({
        segments,
        bounds: new Vector3(1, 1, 1),
        position: new Vector3(),
        uuid,
        index,
        ref,
        dist: 0,
        matrix: new Matrix4(),
        color: new Color(),
        rotation: index * (Math.PI / segments),
      } as CloudState)
    );
  }, [segments, uuid]);

  useLayoutEffect(() => {
    clouds.forEach((cloud, index) => {
      applyProps(cloud as any, {
        volume,
        color,
        speed,
        growth,
        opacity,
        fade,
        bounds,
        density: Math.max(0.5, random()),
        rotationFactor: Math.max(0.2, 0.5 * random()) * speed,
      });

      const distributed = distribute?.(cloud, index);

      if (distributed || segments > 1) {
        cloud.position.copy(cloud.bounds).multiply(
          distributed?.point ??
          ({
            x: random() * 2 - 1,
            y: random() * 2 - 1,
            z: random() * 2 - 1,
          } as Vector3)
        );
      }
      const xDiff = Math.abs(cloud.position.x);
      const yDiff = Math.abs(cloud.position.y);
      const zDiff = Math.abs(cloud.position.z);
      const max = Math.max(xDiff, yDiff, zDiff);
      cloud.length = 1;
      if (xDiff === max) cloud.length -= xDiff / cloud.bounds.x;
      if (yDiff === max) cloud.length -= yDiff / cloud.bounds.y;
      if (zDiff === max) cloud.length -= zDiff / cloud.bounds.z;
      cloud.volume =
        (distributed?.volume !== undefined
          ? distributed.volume
          : Math.max(
            Math.max(0, smallestVolume),
            concentrate === "random"
              ? random()
              : concentrate === "inside"
                ? cloud.length
                : 1 - cloud.length
          )) * volume;
    });
  }, [
    concentrate,
    bounds,
    fade,
    color,
    opacity,
    growth,
    volume,
    seed,
    segments,
    speed,
  ]);

  useLayoutEffect(() => {
    const temp = clouds;
    if (parent?.current) {
      parent.current = [...parent.current, ...temp];
    }
    return () => {
      if (parent?.current) {
        parent.current = parent.current.filter((item) => item.uuid !== uuid);
      }
    };
  }, [clouds, parent, uuid]);

  useImperativeHandle(fref, () => ref.current, []);

  return <group ref={ref} {...props} />;
};

export const Cloud = (props: CloudProps) => {
  const parent = useContext(context);
  if (parent) return <CloudInstance {...props} />;
  return (
    <Clouds>
      <CloudInstance {...props} />
    </Clouds>
  );
};

export function MapCloudGroup({ textureUrl }: { textureUrl?: string }) {
  const ref = useRef<Group>(null!);
  const BASE_X = -211;
  const BASE_Y = 360;
  const BASE_Z = 232;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = BASE_Y + Math.sin(t * 0.8) * 18;
    ref.current.position.x = BASE_X + Math.cos(t * 0.5) * 30;
    ref.current.position.z = BASE_Z;
  });

  return (
    <Clouds ref={ref} position={[BASE_X, BASE_Y, BASE_Z]} textureUrl={textureUrl}>
      {/* 云朵 1：西北方 */}
      <Cloud
        bounds={[110, 20, 20]}
        position={[-291, 0, -303]}
        segments={6}
        volume={400}
        opacity={0.7}
        fade={60}
      />
      {/* 云朵 2：中部 */}
      <Cloud
        bounds={[120, 16, 16]}
        position={[-5, 0, -43]}
        segments={5}
        volume={350}
        opacity={0.65}
        fade={60}
      />
      {/* 云朵 3：东北部 */}
      <Cloud
        bounds={[140, 18, 18]}
        position={[280, 0, -200]}
        segments={5}
        volume={380}
        opacity={0.7}
        fade={60}
      />
    </Clouds>
  );
}
