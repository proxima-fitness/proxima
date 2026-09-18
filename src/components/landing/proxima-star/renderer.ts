/**
 * @module proxima-star/renderer
 * Browser lifecycle for the baked Optimized Black Hole pipeline, retuned as a star.
 * VGPU stays dynamically imported. Dispose stops the loop, observers, and GPU.
 * Depends on: vgpu, pipeline, settings. Used by: ProximaStarCanvas.
 */

import type { Frame, Gpu, Surface } from "vgpu";

import {
    createEffects,
    createTargets,
    destroyTargets,
    prewarm,
    renderChain,
    setBakeUniforms,
    setBindings,
    setPostUniforms,
    setShadeUniforms,
    type IEffects,
    type ITargets,
} from "./pipeline";
import { defaultHeroSettings } from "./settings";

type TVgpuApi = typeof import("vgpu");

const SCENE_YAW_TAU_S = 0.325;

const MAX_FRAME_DT_S = 0.1;

const TARGET_FPS = 60;

const FRAME_PACING_EPSILON_MS = 2;

const MIN_FRAME_INTERVAL_MS = 1000 / TARGET_FPS - FRAME_PACING_EPSILON_MS;
const MOBILE_QUERY = "(max-width: 767px)";

interface IRendererOptions {
    canvas: HTMLCanvasElement;
    animate?: boolean;
}

type TRenderSize = { width: number; height: number };

export function createRenderer({ canvas, animate = true }: IRendererOptions) {
    const settings = defaultHeroSettings();
    const desktopLayout = {
        centerX: settings.centerX,
        centerY: settings.centerY,
        cameraRoll: settings.cameraRoll,
        mouseYaw: settings.mouseYaw,
        centerFade: settings.centerFade,
    };
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const applyResponsiveLayout = () => {
        Object.assign(
            settings,
            mobileQuery.matches
                ? {
                    centerX: 0,
                    centerY: 0,
                    cameraRoll: 0,
                    mouseYaw: 0,
                    centerFade: 1,
                }
                : desktopLayout,
        );
    };
    applyResponsiveLayout();
    const bloomScale = Math.min(Math.max(window.devicePixelRatio, 1), 2) / 2;
    settings.bloom.radius *= bloomScale;
    settings.bloom.strength *= bloomScale;

    let disposed = false;

    let api: TVgpuApi | undefined;
    let gpu: Gpu | undefined;
    let surface: Surface | undefined;
    let effects: IEffects | undefined;
    let targets: ITargets | undefined;
    let loop: { stop(): void } | undefined;
    let observer: ResizeObserver | undefined;
    let intersection: IntersectionObserver | undefined;
    let documentVisible =
        typeof document === "undefined" ? true : !document.hidden;
    let canvasIntersecting = true;

    let started = false;
    let animationTime = 0;
    let lastFrameAt: number | undefined;
    let resizeFrame = 0;
    let pendingSize: TRenderSize | undefined;
    let forceBake = true;
    let pointerXNormalized = 0;
    let currentSceneYaw = 0;
    let lastYawAt: number | undefined;

    const onLayoutChange = () => {
        applyResponsiveLayout();
        forceBake = true;
    };
    mobileQuery.addEventListener("change", onLayoutChange);

    const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const width = Math.max(window.innerWidth, 1);
        pointerXNormalized = Math.min(
            1,
            Math.max(-1, (event.clientX / width) * 2 - 1),
        );
    };

    const recenterPointer = () => {
        pointerXNormalized = 0;
    };
    const onPointerOut = (event: PointerEvent) => {
        if (event.relatedTarget === null) recenterPointer();
    };
    const onVisibilityChange = () => {
        if (document.hidden) recenterPointer();
        documentVisible = !document.hidden;
        reconcileLoop();
    };

    function reconcileLoop(): void {
        if (!started || !gpu || !api || !animate) return;
        const shouldRun = !disposed && documentVisible && canvasIntersecting;
        if (shouldRun === Boolean(loop)) return;
        if (shouldRun) {
            lastFrameAt = undefined;
            lastYawAt = undefined;
            loop = startPacedLoop(api, gpu);
        } else {
            loop?.stop();
            loop = undefined;
        }
    }

    function startPacedLoop(vgpu: TVgpuApi, activeGpu: Gpu): { stop(): void } {
        let stopped = false;

        let lastPresentedAt: number | undefined;
        const tick = (timestamp: number): void => {
            if (stopped) return;
            if (
                lastPresentedAt === undefined ||
                timestamp - lastPresentedAt >= MIN_FRAME_INTERVAL_MS
            ) {
                lastPresentedAt = timestamp;
                try {
                    vgpu.frame(activeGpu, renderFrame);
                } catch (error) {
                    handleFailure(error);
                }
            }
            if (!stopped) frameHandle = requestAnimationFrame(tick);
        };
        let frameHandle = requestAnimationFrame(tick);
        return {
            stop(): void {
                stopped = true;
                cancelAnimationFrame(frameHandle);
            },
        };
    }

    const advanceAnimationTime = (now: number): number => {
        animationTime +=
            lastFrameAt === undefined ? 0 : Math.max(0, (now - lastFrameAt) / 1000);
        lastFrameAt = now;
        return animationTime;
    };

    const renderFrame = (frame: Frame): void => {
        if (disposed || !effects || !targets || !surface) return;
        const now = clockMs();
        const runBake = forceBake;
        forceBake = false;
        if (runBake) setBakeUniforms(effects, targets, settings);
        setShadeUniforms(
            effects,
            targets,
            settings,
            advanceAnimationTime(now),
            advanceSceneYaw(now),
        );
        renderChain(frame, effects, targets, surface, runBake);
    };

    const advanceSceneYaw = (now: number): number => {
        if (settings.mouseYaw <= 0) {
            currentSceneYaw = 0;
            lastYawAt = now;
            return 0;
        }
        const dt =
            lastYawAt === undefined
                ? 0
                : Math.min(Math.max((now - lastYawAt) / 1000, 0), MAX_FRAME_DT_S);
        lastYawAt = now;
        const target = pointerXNormalized * Math.max(0, settings.mouseYaw);
        currentSceneYaw +=
            (target - currentSceneYaw) * (1 - Math.exp(-dt / SCENE_YAW_TAU_S));
        return currentSceneYaw;
    };

    const applyResize = () => {
        resizeFrame = 0;
        const size = pendingSize;
        pendingSize = undefined;
        if (disposed || !size || !gpu || !api || !effects || !targets || !surface)
            return;
        try {
            const previousTargets = targets;
            const nextTargets = createTargets(api, gpu, [
                Math.max(1, Math.round(size.width)),
                Math.max(1, Math.round(size.height)),
            ]);
            try {
                setBindings(effects, nextTargets);
                setPostUniforms(effects, nextTargets, settings);
            } catch (error) {
                destroyTargets(nextTargets);
                throw error;
            }
            targets = nextTargets;
            destroyTargets(previousTargets);
            forceBake = true;
        } catch (error) {
            handleFailure(error);
        }
    };
    const resize = (size: TRenderSize) => {
        if (disposed || size.width <= 0 || size.height <= 0) return;
        pendingSize = size;
        if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
    };

    const measure = () => {
        resize({
            width: canvas.clientWidth,
            height: canvas.clientHeight,
        });
    };

    const dispose = () => {
        if (disposed) return;
        disposed = true;
        loop?.stop();
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        observer?.disconnect();
        intersection?.disconnect();
        if (typeof window !== "undefined") {
            mobileQuery.removeEventListener("change", onLayoutChange);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerout", onPointerOut);
            window.removeEventListener("blur", recenterPointer);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        }
        gpu?.dispose();
    };

    const initialize = async () => {
        const vgpu = await import("vgpu");
        const { init } = vgpu;
        if (disposed) return;
        const nextGpu = await init();
        if (disposed) {
            nextGpu.dispose();
            return;
        }
        gpu = nextGpu;
        api = vgpu;
        surface = vgpu.surface(gpu, canvas, { dpr: 1 });
        effects = createEffects(vgpu, gpu);
        targets = createTargets(vgpu, gpu, surface.size);
        setBakeUniforms(effects, targets, settings);
        setShadeUniforms(effects, targets, settings, animationTime, currentSceneYaw);
        setBindings(effects, targets);
        setPostUniforms(effects, targets, settings);
        await prewarm(effects, targets, surface);
        if (disposed) return;
        observer =
            typeof ResizeObserver === "undefined"
                ? undefined
                : new ResizeObserver(measure);
        observer?.observe(canvas);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerout", onPointerOut, { passive: true });
        window.addEventListener("blur", recenterPointer);
        document.addEventListener("visibilitychange", onVisibilityChange);
        if (typeof IntersectionObserver !== "undefined") {
            intersection = new IntersectionObserver(
                (entries) => {
                    canvasIntersecting =
                        entries[entries.length - 1]?.isIntersecting ?? canvasIntersecting;
                    reconcileLoop();
                },
                { threshold: 0 },
            );
            intersection.observe(canvas);
        }
        measure();
        started = true;
        documentVisible = !document.hidden;
        if (animate) {
            reconcileLoop();
        } else if (gpu && api) {
            try {
                api.frame(gpu, renderFrame);
            } catch (error) {
                handleFailure(error);
            }
        }
    };

    function handleFailure(error: unknown): void {
        dispose();
        console.warn("Proxima star WebGPU renderer failed", error);
    }

    const ready = initialize().catch((error: unknown) => {
        if (disposed) return;
        handleFailure(error);
    });

    return { ready, dispose };
}

function clockMs(): number {
    return typeof performance === "undefined" ? Date.now() : performance.now();
}
