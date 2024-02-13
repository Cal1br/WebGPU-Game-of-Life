import { useEffect } from "preact/hooks";
import "./app.css";

export function App() {
  useEffect(() => {
    const initialize = async () => {
      const devicePixelRatio = window.devicePixelRatio;
      const canvas: HTMLCanvasElement | null =
        document.querySelector("#canvas");
      if (canvas == null) {
        return;
      }
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;

      const presentationFormat: GPUTextureFormat =
        navigator.gpu.getPreferredCanvasFormat();

      if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
      }
      const adapter = await navigator.gpu.requestAdapter();

      if (!adapter) {
        throw new Error("No adapter found!");
      }
      const device = await adapter.requestDevice();
      const context = canvas.getContext("webgpu");
      if (!context) {
        return;
      }
      context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
      });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: [0.5, 0.3, 0.2, 1],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.end();

      device.queue.submit([encoder.finish()]);
    };
    initialize();
  }, []);

  return (
    <>
      <canvas id="canvas" width="512" height="512"></canvas>
    </>
  );
}
