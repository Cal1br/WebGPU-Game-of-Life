import { useEffect, useState } from "preact/hooks";
import "./app.css";
import vertexShader from "./shader/square.vert.wgsl?raw";
import fragmentShader from "./shader/square.frag.wgsl?raw";
import computeShader from "./shader/game_of_life.compute.wgsl?raw";

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
const cellStateArray = new Uint32Array(32 * 32);

const WORKGROUP_SIZE = 8;

//TODO Using something called Index Buffers, you can feed a separate list of values to the GPU that tells it what vertices to connect together into triangles

//reinitializng the pipeline is expensive

export function App() {
  const [grid, setGrid] = useState(32);
  const [step, setStep] = useState(0);
  const [vertexBuffer, setVertexBuffer] = useState<GPUBuffer>();
  const [cellStates, setCellStates] = useState<GPUBuffer[]>();

  const [pipeline, setPipeline] = useState<GPURenderPipeline>();
  const [computePipeline, setComputePipeline] = useState<GPUComputePipeline>();
  const [bindGroups, setBindGroups] = useState<GPUBindGroup[]>();
  const [device, setDevice] = useState<GPUDevice>();
  const [context, setContext] = useState<GPUCanvasContext>();

  useEffect(() => {
    const asyncFunc = async () => {
      const devicePixelRatio = window.devicePixelRatio;
      const canvas: HTMLCanvasElement | null =
        document.querySelector("#canvas");
      if (canvas == null) {
        throw new Error("No canvas found!");
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
      if (device === undefined) {
        throw new Error("GPU device not found!");
      }
      const context = canvas.getContext("webgpu");
      if (!context) {
        throw new Error("Can't get context");
      }
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device: device,
        format: canvasFormat,
      });
      setDevice(device);
      setContext(context);
    };
    asyncFunc();
  }, []);

  useEffect(() => {
    if (!device) {
      return;
    }
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
    const computeModule = device.createShaderModule({
      label: "Compute Shader",
      code: computeShader,
    });

    //create bind group layout and pipeline layout
    const bindGroupLayout = device.createBindGroupLayout({
      label: "Cell Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: {}, // Grid uniform buffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // Cell state input buffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // Cell state output buffer
        },
      ],
    });

    //write data
    const vertexBuffer = device.createBuffer({
      label: "Vertices",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    setVertexBuffer(vertexBuffer);

    const buffersCellState = [
      device.createBuffer({
        label: "Cell State buffer A",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      device.createBuffer({
        label: "Cell State buffer B",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    ];

    for (let i = 0; i < cellStateArray.length; i += 4) {
      cellStateArray[i + 1] = 1;
    }
    device.queue.writeBuffer(buffersCellState[0], 0, cellStateArray);

    cellStateArray.fill(0);

    device.queue.writeBuffer(buffersCellState[1], 0, cellStateArray);

    setCellStates(buffersCellState);

    const uniformArray = new Float32Array([grid, grid]);
    const uniformBuffer = device.createBuffer({
      label: "Grid Uniforms",
      size: uniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

    //rendering

    const pipelineLayout = device.createPipelineLayout({
      label: "Cell Pipeline Layout",
      bindGroupLayouts: [bindGroupLayout],
    });

    const pipeline = device.createRenderPipeline({
      label: "Pipeline",
      layout: pipelineLayout,
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
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
    });
    setPipeline(pipeline);
    const computePipeline = device.createComputePipeline({
      label: "Compute Layout",
      layout: pipelineLayout,
      compute: {
        module: computeModule,
        entryPoint: "main",
      },
    });
    setComputePipeline(computePipeline);

    setBindGroups([
      device.createBindGroup({
        label: "Cell renderer bind group B",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: buffersCellState[0] },
          },
          {
            binding: 2,
            resource: { buffer: buffersCellState[1] },
          },
        ],
      }),
      device.createBindGroup({
        label: "Cell renderer bind group A",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: buffersCellState[1] },
          },
          {
            binding: 2,
            resource: { buffer: buffersCellState[0] },
          },
        ],
      }),
    ]);
    device.queue.submit([encoder.finish()]);
    console.log("Initializaiton complete!");
  }, [grid, device]);

  useEffect(() => {
    //render pass
    if (
      !device ||
      !bindGroups ||
      !pipeline ||
      !vertexBuffer ||
      !context ||
      !computePipeline ||
      !cellStates
    ) {
      return;
    }

    // Compute pass
    const encoder = device.createCommandEncoder();

    const computePass = encoder.beginComputePass();

    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroups[step % 2]);

    computePass.dispatchWorkgroups(grid / 8, grid / 8);
    computePass.end();
    // Start a render pass

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: {
            r: (step % 333) / 333,
            g: (step % 666) / 666,
            b: (step % 999) / 999,
            a: 1.0,
          },
          storeOp: "store",
        },
      ],
    });

    // Draw the grid.
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroups[step % 2]); // Updated!
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(vertices.length / 2, grid * grid);

    // End the render pass and submit the command buffer
    pass.end();
    device.queue.submit([encoder.finish()]);

    //todo move rendering to callback
  }, [step, vertexBuffer]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <canvas id="canvas" width="512" height="512"></canvas>

      <button onClick={() => setStep(step + 1)}>Click me</button>
    </div>
  );
}
