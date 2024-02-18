struct ComputeShaderInput {
    @builtin(global_invocation_id) cell: vec3u,
}

@group(0) @binding(0) var<uniform> grid_size: vec2f;
@group(0) @binding(1) var<storage>  cell_state_in: array<u32>;
@group(0) @binding(2) var<storage, read_write>  cell_state_out: array<u32>;

@compute
@workgroup_size(8,8)
fn main(input: ComputeShaderInput) {
    //input.cell.xy
    //0,0 => 0
    //1,0 => x
    //2,0 => x*2 + 0

//     var counter = 0;
//   // Parenthesis are required.

//     for (var y = input.cell.y - 1; y <= input.cell.y + 1; y += 1) {
//         for (var x = input.cell.x - 1; x <= input.cell.y + 1; x += 1) {
//             if (y != input.cell.y && x != input.cell.x) && cell_state_in[cellIndex(vec2u(x, y))] == 1 {
//                 counter++;
//             }
//         }
//     }


//     if counter < 2 {
//         cell_state_out[cellIndex(input.cell.xy)] = 0;
//     } else if (counter == 2 || counter == 3) && cell_state_in[cellIndex(input.cell.xy)] == 1 {
//         cell_state_out[cellIndex(input.cell.xy)] = 1;
//     } else if counter > 3 {
//         cell_state_out[cellIndex(input.cell.xy)] = 0;
//     } else if counter == 3 && cell_state_in[cellIndex(input.cell.xy)] == 0 {
//         cell_state_out[cellIndex(input.cell.xy)] = 1;
//     }


    if cell_state_in[cellIndex(vec2u(input.cell.x, input.cell.y))] == 1 {
//        cell_state_out[cellIndex(vec2u(input.cell.x, input.cell.y))] = 0;
        cell_state_out[cellIndex(vec2u(input.cell.x, input.cell.y + 1))] = 1;
    }
}

fn cellIndex(cell: vec2u) -> u32 {
    return cell.x / u32(grid_size.x) * u32(grid_size.y) + cell.y;
    //return (cell.y % u32(grid_size.y)) * u32(grid_size.x) + (cell.x % u32(grid_size.x));
}