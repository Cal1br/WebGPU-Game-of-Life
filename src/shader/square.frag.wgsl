struct FragmentInput {
    @location(0) pos: vec2f,
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    return vec4f(input.pos, 1 - (input.pos.x + input.pos.y) / 2, 1);
}

//The return value needs to be given a @location attribute in order to indicate which colorAttachment from the beginRenderPass call the returned color is written to. Since you only had one attachment, the location is 0.