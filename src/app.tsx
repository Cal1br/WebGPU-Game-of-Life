import { useEffect, useState } from "preact/hooks";
import "./app.css";
import vertexShader from "./shader/square.vert.wgsl?raw";
import fragmentShader from "./shader/square.frag.wgsl?raw";

const vertices = new Float32Array([
  -0.8,
  -0.8, // Triangle 1
  0.8,
  -0.8,
  0.8,
  0.8,

  -0.8,
  -0.8, // Triangle 2
  0.8,
  0.8,
  -0.8,
  0.8,
]);

const vertexBufferLayout: GPUVertexBufferLayout = {
  arrayStride: 8,
  attributes: [
    {
      format: "float32x2",
      offset: 0,
      shaderLocation: 0, // Position, see vertex shader
    },
  ],
};

//TODO Using something called Index Buffers, you can feed a separate list of values to the GPU that tells it what vertices to connect together into triangles

//reinitializng the pipeline is expensive
const initialize = async (gridSize: number) => {
  const devicePixelRatio = window.devicePixelRatio;
  const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
  if (canvas == null) {
    return;
  }
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

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
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });
  const encoder = device.createCommandEncoder();

  //initialize shaders (compiling etc)
  const vertexModule = device.createShaderModule({
    label: "Vert Shader",
    code: vertexShader,
  });
  const fragmentModule = device.createShaderModule({
    label: "Frag Shader",
    code: fragmentShader,
  });

  //write data
  const vertexBuffer = device.createBuffer({
    label: "Vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const uniformArray = new Float32Array([gridSize, gridSize]);
  const uniformBuffer = device.createBuffer({
    label: "Grid Uniforms",
    size: uniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

  //rendering

  const pipeline = device.createRenderPipeline({
    label: "Pipeline",
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [
        {
          format: canvasFormat,
        },
      ],
    },
  });

  const bindGroup = device.createBindGroup({
    label: "Cell renderer bind group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
    ],
  });

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 0.5],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });
  pass.setPipeline(pipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.setBindGroup(0, bindGroup);

  pass.draw(vertices.length / 2, gridSize * gridSize);

  pass.end();

  device.queue.submit([encoder.finish()]);
};

export function App() {
  const [grid, setGrid] = useState(64);

  useEffect(() => {
    initialize(grid);
  }, [grid]);

  return (
    <>
      <canvas id="canvas" width="512" height="512"></canvas>
    </>
  );
}
