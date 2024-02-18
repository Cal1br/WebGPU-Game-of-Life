struct VertexInput {
    @location(0) pos: vec2f,
    @builtin(instance_index) instance_index: u32,
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) xy: vec2f,
};

@group(0) @binding(0) var<uniform>  grid: vec2f;
@group(0) @binding(1) var<storage>  cell_state: array<u32>;

@vertex
fn main(input: VertexInput) -> VertexOutput {

    let state: u32 = cell_state[input.instance_index];

    let i = f32(input.instance_index);
    let cell = vec2f(i % grid.x, floor(i / grid.y));
    let cell_offset = cell / grid * 2;
    let xy: vec2f = vec2f((input.pos + 1) / grid) + cell_offset - 1;

    var out: VertexOutput;
    out.pos = vec4f(xy * f32(state), 0, 1);
    out.xy = cell / grid;
    return out;
}