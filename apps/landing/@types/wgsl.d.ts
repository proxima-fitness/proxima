declare module "*.wgsl" {
    import type { ShaderSource } from "@vgpu/wgsl";
    const source: ShaderSource;
    export default source;
}
