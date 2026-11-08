import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BodyMetrics, PoseKey } from '../domain/types';
import {
  createAnatomicalFigure,
  type AnatomicalFigure,
} from '../three/anatomicalFigure';

export type CameraPreset = 'front' | 'side' | 'angle';

export interface BodyStageHandle {
  capture: () => string | null;
}

interface BodyStageProps {
  metrics: BodyMetrics;
  preset: CameraPreset;
  pose: PoseKey;
}

interface LabelSet {
  top: HTMLDivElement | null;
  bust: HTMLDivElement | null;
  waist: HTMLDivElement | null;
  hip: HTMLDivElement | null;
}

const OFFSETS: Record<keyof LabelSet, { x: number; y: number }> = {
  top: { x: 0, y: -28 },
  bust: { x: 28, y: 0 },
  waist: { x: -30, y: 0 },
  hip: { x: 24, y: 0 },
};

export const BodyStage = forwardRef<BodyStageHandle, BodyStageProps>(
  function BodyStage({ metrics, preset, pose }, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const labelRefs = useRef<LabelSet>({
      top: null,
      bust: null,
      waist: null,
      hip: null,
    });
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const figureRef = useRef<AnatomicalFigure | null>(null);
    const frameRef = useRef(0);
    const sizeRef = useRef({ width: 1, height: 1 });
    const heightRef = useRef(metrics.height / 100);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        capture: () => {
          const renderer = rendererRef.current;
          if (!renderer) return null;
          renderer.render(
            sceneRef.current as THREE.Scene,
            cameraRef.current as THREE.Camera,
          );
          return renderer.domElement.toDataURL('image/png');
        },
      }),
      [],
    );

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        });
      } catch {
        setError('当前浏览器无法启动 3D 渲染，请切换到二维比例视图。');
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute(
        'aria-label',
        '中国女性参数化比例人台，可拖动旋转',
      );
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      sceneRef.current = scene;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      scene.environmentIntensity = 0.5;

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
      cameraRef.current = camera;
      const targetY = heightRef.current * 0.52;
      camera.position.set(0, targetY, 3);
      camera.lookAt(0, targetY, 0);

      const controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.enablePan = false;
      controls.rotateSpeed = 0.55;
      controls.zoomSpeed = 0.75;
      controls.minPolarAngle = Math.PI * 0.32;
      controls.maxPolarAngle = Math.PI * 0.52;
      controls.minZoom = 0.65;
      controls.maxZoom = 2.4;
      controls.target.set(0, targetY, 0);
      controls.update();

      const hemi = new THREE.HemisphereLight(0xfff7ea, 0x8f7d6b, 0.85);
      scene.add(hemi);

      const key = new THREE.DirectionalLight(0xfff1dc, 3.4);
      key.position.set(2.2, 3.8, 2.8);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.near = 0.1;
      key.shadow.camera.far = 8;
      key.shadow.camera.left = -1.2;
      key.shadow.camera.right = 1.2;
      key.shadow.camera.top = 2.3;
      key.shadow.camera.bottom = -0.4;
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.012;
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc9d8de, 1.2);
      fill.position.set(-2.5, 1.8, 1.2);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xffd9b8, 2.1);
      rim.position.set(0.8, 2.1, -3);
      scene.add(rim);

      const backGlow = new THREE.PointLight(0xf5dcc5, 1.8, 4);
      backGlow.position.set(-0.8, 1.2, -1.5);
      scene.add(backGlow);

      const resize = () => {
        if (!mount) return;
        const width = Math.max(mount.clientWidth, 1);
        const height = Math.max(mount.clientHeight, 1);
        sizeRef.current = { width, height };
        renderer.setSize(width, height);
        const aspect = width / height;
        const viewHeight = heightRef.current * 1.24;
        const viewWidth = viewHeight * aspect;
        camera.left = -viewWidth / 2;
        camera.right = viewWidth / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(mount);

      const updateLabels = () => {
        const anchors = figureRef.current?.anchors;
        if (!anchors) return;
        const { width, height } = sizeRef.current;
        const projected = new THREE.Vector3();
        (Object.keys(anchors) as (keyof LabelSet)[]).forEach((key) => {
          const element = labelRefs.current[key];
          if (!element) return;
          projected.copy(anchors[key]).project(camera);
          const x = (projected.x * 0.5 + 0.5) * width;
          const y = (-projected.y * 0.5 + 0.5) * height;
          const offset = OFFSETS[key];
          element.style.transform = `translate3d(${x + offset.x}px, ${
            y + offset.y
          }px, 0) translate(-50%, -50%)`;
          element.style.opacity = projected.z > 1 ? '0' : '1';
        });
      };

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        updateLabels();
      };
      animate();
      setReady(true);

      return () => {
        cancelAnimationFrame(frameRef.current);
        observer.disconnect();
        controls.dispose();
        renderer.dispose();
        pmrem.dispose();
        envTexture.dispose();
        if (figureRef.current) {
          scene.remove(figureRef.current.group);
          figureRef.current.dispose();
          figureRef.current = null;
        }
        if (renderer.domElement.parentElement === mount) {
          mount.removeChild(renderer.domElement);
        }
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        controlsRef.current = null;
      };
    }, []);

    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      if (figureRef.current) {
        scene.remove(figureRef.current.group);
        figureRef.current.dispose();
      }
      const figure = createAnatomicalFigure(metrics, pose);
      scene.add(figure.group);
      figureRef.current = figure;
      heightRef.current = figure.height;

      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const targetY = heightRef.current * 0.52;
      const previousTargetY = controls.target.y;
      camera.position.y += targetY - previousTargetY;
      controls.target.set(0, targetY, 0);

      const mount = mountRef.current;
      if (mount) {
        const aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
        const viewHeight = heightRef.current * 1.24;
        const viewWidth = viewHeight * aspect;
        camera.left = -viewWidth / 2;
        camera.right = viewWidth / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();
      }
      controls.update();
    }, [metrics, pose]);

    useEffect(() => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const targetY = heightRef.current * 0.52;
      const distance = 3;
      if (preset === 'front') {
        camera.position.set(0, targetY, distance);
      } else if (preset === 'side') {
        camera.position.set(distance, targetY, 0);
      } else {
        camera.position.set(distance * 0.72, targetY + 0.36, distance * 0.72);
      }
      controls.target.set(0, targetY, 0);
      controls.update();
    }, [preset]);

    return (
      <div className="stage-canvas-wrap">
        <div className="stage-canvas" ref={mountRef} />
        {!ready && !error ? (
          <div className="stage-loading">
            <span className="stage-loading-dot" />
            正在生成比例人台
          </div>
        ) : null}
        {error ? (
          <div className="stage-error">
            <strong>3D 视图暂不可用</strong>
            <span>{error}</span>
          </div>
        ) : null}
        <div className="body-labels" aria-hidden="true">
          <div
            className="body-label body-label--height"
            ref={(node) => {
              labelRefs.current.top = node;
            }}
          >
            <span className="body-label__tag">HEIGHT</span>
            <strong>{metrics.height.toFixed(1)}</strong>
            <span className="body-label__unit">cm</span>
          </div>
          <div
            className="body-label body-label--bust"
            ref={(node) => {
              labelRefs.current.bust = node;
            }}
          >
            <span className="body-label__dot" />
            <span className="body-label__tag">胸围</span>
            <strong>{metrics.bust.toFixed(1)}</strong>
          </div>
          <div
            className="body-label body-label--waist"
            ref={(node) => {
              labelRefs.current.waist = node;
            }}
          >
            <span className="body-label__dot" />
            <span className="body-label__tag">腰围</span>
            <strong>{metrics.waist.toFixed(1)}</strong>
          </div>
          <div
            className="body-label body-label--hip"
            ref={(node) => {
              labelRefs.current.hip = node;
            }}
          >
            <span className="body-label__dot" />
            <span className="body-label__tag">臀围</span>
            <strong>{metrics.hip.toFixed(1)}</strong>
          </div>
        </div>
        <div className="stage-note stage-note--left">
          <span className="stage-note__line" />
          正交投影
        </div>
        <div className="stage-note stage-note--right">
          拖动旋转 · 滚轮缩放
        </div>
      </div>
    );
  },
);
