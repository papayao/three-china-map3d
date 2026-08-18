# Three.js 3D 浮雕中国地图与 GIS 数据可视化组件 (three-china-map3d)

一套基于 Three.js、React Three Fiber 和 GSAP 构建的高质感 3D 浮雕中国地图及地理空间数据可视化解决方案。支持从 2D 扁平底图平滑垂直拔高变为 3D 浮雕形态的级联入场动画，内置冲天动态光柱、抛物线流光飞线与 3D 动态云层粒子系统。

* **预览网址**：[https://www.spriteverse.cn/](https://www.spriteverse.cn/)

---

## 核心特性

- **2D 转 3D 浮雕垂直生长动画**：
  入场时相机由远及近俯冲就位，地图在特写视角下自地表平滑垂直拔高，从 2D 扁平平面图渐变为立体 3D 浮雕形态。
- **高精卫星影像与 UV 自动归一化**：
  支持高清卫星影像贴图，基于全局 BoundingBox 实现多边形顶面 UV 自动计算与对齐，侧壁呈现温润质感。
- **动态立体光柱 (ProvinceBar)**：
  包含底部发光旋转光环、垂直伫立的三面立体辉光与基于 GLSL 自定义 Shader 的双色垂直渐变柱体，支持随地图入场从地表面垂直破土长高。
- **抛物线流光飞线 (FlyLines)**：
  基于 MeshLine 架构，内置头部高亮聚光至尾部自然羽化全透明的自定义着色器，配置独立渲染层级与自适应分辨率，无论正俯视、仰视还是平视视角均清晰可见且不发生形变。
- **3D 浮动云层 (Clouds)**：
  基于 InstancedMesh 的轻量化三维点云体系，模拟高空自然呼吸浮动的云雾效果。
- **原生交互与事件监听**：
  集成 OrbitControls 阻尼平滑拖拽、旋转缩放与自动自转；支持省份 Hover 悬停抬升与高亮、点击事件监听及自定义数据柱。

---

## 环境要求

* **Node.js**：`>= 18.0.0`（推荐 `20.x` 或 `22.x` LTS 版本）
* **包管理器**：推荐 `pnpm >= 9.0.0`，亦兼容 `npm` / `yarn`

---

## 快速上手

### 1. 安装依赖

```bash
pnpm add three-china-map3d three @react-three/fiber @react-three/drei gsap d3-geo meshline
# 或使用 npm / yarn
npm install three-china-map3d three @react-three/fiber @react-three/drei gsap d3-geo meshline
```

### 2. 基础使用示例

```tsx
import React from "react";
import { ChinaMap3D } from "three-china-map3d";

export default function MyDataVDashboard() {
  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: "#030712" }}>
      <ChinaMap3D
        depth={65}
        autoRotate={false}
        showClouds={true}
        showBars={true}
        showFlyLines={true}
        onProvinceClick={(provinceName) => {
          console.log("点击了省份:", provinceName);
        }}
      />
    </div>
  );
}
```

---

## 组件 API 参考 (API Reference)

### `<ChinaMap3D />` 属性说明

| 属性名 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `depth` | `number` | `65` | 3D 地图侧壁挤出厚度（推荐 20 ~ 80） |
| `autoRotate` | `boolean` | `false` | 是否开启地图自动旋转 |
| `showClouds` | `boolean` | `true` | 是否渲染上空 3D 浮动云层 |
| `showBars` | `boolean` | `true` | 是否渲染各省节点数据光柱 |
| `showFlyLines` | `boolean` | `true` | 是否渲染中心辐射流光飞线 |
| `bars` | `NodeBarData[]` | 默认 11 节点 | 自定义数据光柱节点列表 |
| `flyCenterProvince` | `string` | `"四川"` | 飞线发射中心省份名称 |
| `flyLineWidth` | `number` | `15` | 飞线基础线宽 |
| `flySpeed` | `number` | `0.8` | 飞线流动推进速度倍率 |
| `color` | `string` | `"#0e2a47"` | 省份未贴图时的底色 |
| `hoverColor` | `string` | `"#ff9100"` | 鼠标悬停高亮颜色 |
| `edgeColor` | `string` | `"#ffffff"` | 省份边界轮廓线颜色 |
| `sideWallColor` | `string` | `"#f9f3e7"` | 3D 浮雕侧壁颜色 |
| `geoData` | `CityGeoJSON` | 内置全国 GeoJSON | 自定义地图 GeoJSON 数据 |
| `satelliteTextureUrl` | `string` | 内置 8K 卫星图 | 自定义顶面卫星贴图 URL |
| `onProvinceClick` | `(name: string) => void` | `undefined` | 点击省份板块时的回调函数 |
| `onIntroComplete` | `() => void` | `undefined` | 入场动画就绪回调 |

---

### `<ProvinceBar />` 属性说明

用于在 3D 地图上独立构建冲天数据光柱：

| 属性名 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `position` | `[number, number, number]` | **必填** | 光柱在地图局部的 `[x, y, z]` 坐标 |
| `height` | `number` | `150` | 光柱目标高度 |
| `factor` | `number` | `150` | 柱体截面粗细比例系数 |
| `uColor1` | `THREE.Color` | `#fbdf88` | 光柱底部渐变色 |
| `uColor2` | `THREE.Color` | `#ea580c` | 光柱顶部渐变色 |
| `riseDelay` | `number` | `0` | 光柱开始从地表生长的延迟秒数 |
| `riseDuration` | `number` | `0.8` | 光柱升起到最大高度的动画时长（秒） |

---

### `<FlyLines />` 属性说明

用于构建节点间空间抛物线流光飞线：

| 属性名 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `origin` | `[number, number]` | **必填** | 发射起点 `[x, y]` 坐标 |
| `originHeight` | `number` | **必填** | 起点所在光柱顶部高度 |
| `targets` | `FlyLineTarget[]` | **必填** | 目标节点列表 `[{ pos: [x, y], height }]` |
| `depth` | `number` | `40` | 地图基准高度 |
| `arcHeight` | `number` | `120` | 抛物线最高点抬升拱度 |
| `baseColor` | `string` | `"#f59e0b"` | 底层基准弧线颜色 |
| `flyColor` | `string` | `"#ff7700"` | 发光流线尾部渐变色 |
| `headColor` | `string` | `"#ffffff"` | 发光流线头部最亮聚光色 |
| `lineWidth` | `number` | `15` | 飞线像素线宽 |
| `dashSize` | `number` | `0.12` | 流动光段占整条抛物线弧长的比例（0.0 ~ 1.0） |
| `speed` | `number` | `0.8` | 流光飞驰速度 |
| `visibleAfter` | `number` | `0` | 延迟显现秒数（用于等待光柱升起就位后展示） |

---

## 本地开发与单独启动调试

本项目内置了完整的全屏交互式 Demo 演示页面（包含实时控制抽屉、参数动态调节与全屏模式）：

```bash
# 1. 进入项目根目录
cd three-china-map3d

# 2. 安装项目依赖 (推荐使用 pnpm)
pnpm install

# 3. 启动本地交互开发服务器
pnpm dev
```

本地开发服务启动后，在浏览器中打开 `http://localhost:3000` 即可实时预览并进行参数调节。

### 打包构建

```bash
# 构建 Demo 静态演示产物
pnpm build

# 构建可发布的 npm 组件库产物 (ESM / CJS / d.ts)
pnpm build:lib
```

---

## 相关链接

* **官方在线预览**：[https://www.spriteverse.cn/](https://www.spriteverse.cn/)
* **GitHub 仓库**：[https://github.com/papayao/three-china-map3d](https://github.com/papayao/three-china-map3d)

---

## 开源协议

本项目基于 [MIT License](./LICENSE) 协议开源。
