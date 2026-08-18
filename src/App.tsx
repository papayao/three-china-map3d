import { useState } from "react";
import { ChinaMap3D } from "./lib";
import {
  RotateCw,
  Eye,
  Layers,
  Sparkles,
  Sliders,
  Maximize2,
  MapPin,
  Compass,
} from "lucide-react";

export default function App() {
  const [depth, setDepth] = useState(65);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showClouds, setShowClouds] = useState(true);
  const [showBars, setShowBars] = useState(true);
  const [showFlyLines, setShowFlyLines] = useState(true);
  const [flySpeed, setFlySpeed] = useState(0.8);
  const [flyLineWidth, setFlyLineWidth] = useState(15);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="relative w-full h-full bg-[#030712] select-none overflow-hidden">
      {/* 顶部标题栏 */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wider text-white">
              Three.js 3D 浮雕中国地图
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              @spriteverse/three-china-map3d · WebGL GIS 空间地理可视化
            </p>
          </div>
        </div>

        {/* 顶部快捷操作 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {selectedProvince && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-medium backdrop-blur-md animate-pulse">
              <MapPin className="w-3.5 h-3.5" />
              当前选中：{selectedProvince}
            </div>
          )}

          <button
            onClick={() => setShowPanel(!showPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition-colors backdrop-blur-md"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showPanel ? "隐藏控制面板" : "参数控制面板"}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors backdrop-blur-md"
            title="全屏切换"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3D 中国地图主画板 */}
      <main className="w-full h-full">
        <ChinaMap3D
          depth={depth}
          autoRotate={autoRotate}
          showClouds={showClouds}
          showBars={showBars}
          showFlyLines={showFlyLines}
          flyLineWidth={flyLineWidth}
          flySpeed={flySpeed}
          onProvinceClick={(name) => setSelectedProvince(name)}
        />
      </main>

      {/* 右侧交互参数控制抽屉 */}
      {showPanel && (
        <aside className="absolute right-6 top-20 z-20 w-72 rounded-xl bg-gray-950/80 border border-white/10 p-5 backdrop-blur-xl shadow-2xl text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-semibold text-gray-200">实时参数调节</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
              Live Config
            </span>
          </div>

          {/* 挤出高度 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-gray-300">
              <span>3D 挤出厚度 (Depth)</span>
              <span className="font-mono text-orange-400">{depth}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* 飞线宽度 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-gray-300">
              <span>飞线粗细 (LineWidth)</span>
              <span className="font-mono text-orange-400">{flyLineWidth}px</span>
            </div>
            <input
              type="range"
              min="8"
              max="35"
              step="1"
              value={flyLineWidth}
              onChange={(e) => setFlyLineWidth(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* 飞线流速 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-gray-300">
              <span>流光速度 (Speed)</span>
              <span className="font-mono text-orange-400">{flySpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={flySpeed}
              onChange={(e) => setFlySpeed(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          <div className="border-t border-white/10 pt-3 space-y-2">
            {/* 自动旋转 */}
            <label className="flex items-center justify-between text-gray-300 cursor-pointer hover:text-white">
              <span className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 text-gray-400" />
                自动自转 (Auto Rotate)
              </span>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
              />
            </label>

            {/* 显示光柱 */}
            <label className="flex items-center justify-between text-gray-300 cursor-pointer hover:text-white">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                数据冲天光柱 (Bars)
              </span>
              <input
                type="checkbox"
                checked={showBars}
                onChange={(e) => setShowBars(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
              />
            </label>

            {/* 显示飞线 */}
            <label className="flex items-center justify-between text-gray-300 cursor-pointer hover:text-white">
              <span className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                抛物线流光飞线 (FlyLines)
              </span>
              <input
                type="checkbox"
                checked={showFlyLines}
                onChange={(e) => setShowFlyLines(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
              />
            </label>

            {/* 显示云层 */}
            <label className="flex items-center justify-between text-gray-300 cursor-pointer hover:text-white">
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                3D 上空浮云 (Clouds)
              </span>
              <input
                type="checkbox"
                checked={showClouds}
                onChange={(e) => setShowClouds(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-2 text-[10px] text-gray-400 border-t border-white/5">
            提示：支持鼠标左键旋转、右键平移、滚轮缩放、悬停高亮与省份点击。
          </div>
        </aside>
      )}
    </div>
  );
}
