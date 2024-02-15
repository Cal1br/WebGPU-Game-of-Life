struct VertexInput {
    @location(0) pos: vec2f,
    @builtin(instance_index) instance_index: u32,
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) xy: vec2f,
};

@group(0) @binding(0) var<uniform>  grid: vec2f;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    let i = f32(input.instance_index);
    let cell = vec2f(floor(i / grid.x), i % grid.x);
    let cell_offset = cell / grid * 2;
    let xy: vec2f = vec2f((input.pos + 1) / grid) + cell_offset - 1;
    var out: VertexOutput;
    out.pos = vec4f(xy, 0, 1);
    out.xy = xy;
    return out;
}