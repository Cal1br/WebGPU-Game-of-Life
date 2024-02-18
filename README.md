# Useful links

## WGSL

GSLS to WGSL converter: https://jsfiddle.net/cx20/vmkaqw2b/

## Vite

Assets, static assets importing: https://vitejs.dev/guide/assets

# Useful info

## WGSL

Note: You can also create a separate shader module for your vertex and fragment shaders, if you want. That can be beneficial if, for example, you want to use several different fragment shaders with the same vertex shader.

Note: As the above code snippet shows, once you call writeBuffer(), you don't have to preserve the contents of the source TypedArray any more. At that point, the contents have been copied and the GPU buffer is guaranteed to receive the data as it was at the time the call is made. This allows you to reuse the JavaScript object for the next upload, which saves on memory!

### Compute

Note: For more advanced uses of compute shaders, the workgroup size becomes more important. Shader invocations within a single workgroup are allowed to share faster memory and use certain types of synchronization primitives. You don't need any of that, though, since your shader executions are fully independent.

You could make the workgroup size (1 x 1 x 1), and it would still work correctly, but that also restricts how well the GPU can run the shader in parallel. Picking something bigger helps the GPU divide the work better.

There is a theoretical ideal workgroup size for every GPU, but it's dependent on architectural details that WebGPU doesn't expose, so usually you want to pick a number driven by the requirements of the shader. Lacking that, given the wide range of hardware that WebGPU content may run on, 64 is a good number that's unlikely to exceed any hardware limits but still handles large enough batches to be reasonably efficient. (8 x 8 == 64, so your workgroup size follows this advice.)
