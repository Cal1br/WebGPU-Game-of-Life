import { useEffect, useRef, useState } from "preact/hooks";
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
const cellStateArray = new Uint32Array(64 * 64);

//TODO Using something called Index Buffers, you can feed a separate list of values to the GPU that tells it what vertices to connect together into triangles

//reinitializng the pipeline is expensive

export function App() {
  const [grid, setGrid] = useState(64);
  const [initialized, setInitialized] = useState<boolean>(false);
  const stepRef = useRef(0);

  const vertexBufferRef = useRef<GPUBuffer>();
  const cellStatesRef = useRef<GPUBuffer[]>();
  const pipelineRef = useRef<GPURenderPipeline>();
  const computePipelineRef = useRef<GPUComputePipeline>();
  const bindGroupsRef = useRef<GPUBindGroup[]>();
  const deviceRef = useRef<GPUDevice>();
  const contextRef = useRef<GPUCanvasContext | null>();

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
      deviceRef.current = await adapter.requestDevice();
      if (deviceRef.current === undefined) {
        throw new Error("GPU device not found!");
      }
      contextRef.current = canvas.getContext("webgpu");
      if (!contextRef.current) {
        throw new Error("Can't get context");
      }
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      contextRef.current.configure({
        device: deviceRef.current,
        format: canvasFormat,
      });
      const device = deviceRef.current;
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
      vertexBufferRef.current = vertexBuffer;

      device.queue.writeBuffer(vertexBuffer, 0, vertices);

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
      for (let i = 0; i < cellStateArray.length; ++i) {
        cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
      }
      device.queue.writeBuffer(buffersCellState[0], 0, cellStateArray);

      cellStateArray.fill(0);

      device.queue.writeBuffer(buffersCellState[1], 0, cellStateArray);

      cellStatesRef.current = buffersCellState;

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
      pipelineRef.current = pipeline;

      const computePipeline = device.createComputePipeline({
        label: "Compute Layout",
        layout: pipelineLayout,
        compute: {
          module: computeModule,
          entryPoint: "main",
        },
      });

      computePipelineRef.current = computePipeline;

      bindGroupsRef.current = [
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
      ];

      device.queue.submit([encoder.finish()]);
      console.log("Initializaiton complete!");
      setInitialized(true);
    };
    asyncFunc();
  }, [grid]);

  useEffect(() => {
    const animationFrame = (time: number) => {
      //render pass
      if (
        !deviceRef.current ||
        !bindGroupsRef.current ||
        !pipelineRef.current ||
        !vertexBufferRef.current ||
        !contextRef.current ||
        !computePipelineRef.current ||
        !cellStatesRef.current
      ) {
        return;
      }

      const device = deviceRef.current;
      const step = stepRef.current;

      // Compute pass
      const encoder = device.createCommandEncoder();

      const computePass = encoder.beginComputePass();

      computePass.setPipeline(computePipelineRef.current);
      computePass.setBindGroup(0, bindGroupsRef.current[step % 2]);

      computePass.dispatchWorkgroups(grid / 8, grid / 8);
      computePass.end();
      // Start a render pass

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: contextRef.current.getCurrentTexture().createView(),
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
      pass.setPipeline(pipelineRef.current);
      pass.setBindGroup(0, bindGroupsRef.current[step % 2]); // Updated!
      pass.setVertexBuffer(0, vertexBufferRef.current);
      pass.draw(vertices.length / 2, grid * grid);

      // End the render pass and submit the command buffer
      pass.end();
      device.queue.submit([encoder.finish()]);
      stepRef.current = step + 1;
      setTimeout(() => window.requestAnimationFrame(animationFrame), 100);
    };
    window.requestAnimationFrame(animationFrame);
  }, [initialized]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <canvas id="canvas" width="900" height="900"></canvas>
    </div>
  );
}
