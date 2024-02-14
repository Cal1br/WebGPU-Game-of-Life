@fragment
fn main() -> @location(0) vec4f {
    return vec4f(1, 0, 0, 1);
}

//The return value needs to be given a @location attribute in order to indicate which colorAttachment from the beginRenderPass call the returned color is written to. Since you only had one attachment, the location is 0.