struct ComputeShaderInput {
    @builtin(global_invocation_id) cell: vec3u,
}

@group(0) @binding(0) var<uniform> grid_size: vec2f;
@group(0) @binding(1) var<storage>  cell_state_in: array<u32>;
@group(0) @binding(2) var<storage, read_write>  cell_state_out: array<u32>;

@compute
@workgroup_size(8,8)
fn main(input: ComputeShaderInput) {
    let cell = input.cell;
    //clear out buffer before computing from in
    cell_state_out[cellIndex(cell.xy)] = 0;

    //input.cell.xy
    //0,0 => 0
    //1,0 => x
    //2,0 => x*2 + 0

    let counter = cellActive(cell.x + 1, cell.y + 1) + cellActive(cell.x + 1, cell.y) + cellActive(cell.x + 1, cell.y - 1) + cellActive(cell.x, cell.y - 1) + cellActive(cell.x - 1, cell.y - 1) + cellActive(cell.x - 1, cell.y) + cellActive(cell.x - 1, cell.y + 1) + cellActive(cell.x, cell.y + 1);

    //var counter = 0;
   // Parenthesis are required.
    // for (var y = input.cell.y - 1; y <= input.cell.y + 1; y += 1) {
    //     for (var x = input.cell.x - 1; x <= input.cell.x + 1; x += 1) {
    //         if !(y == input.cell.y && x == input.cell.x) && cell_state_in[cellIndex(vec2u(x, y))] == 1 {
    //             counter++;
    //         }
    //     }
    // }

    let i = cellIndex(cell.xy);

      // Conway's game of life rules:
    switch counter {
        case 2: {
            cell_state_out[i] = cell_state_in[i];
        }
        case 3: {
            cell_state_out[i] = 1;
        }
        default: {
            cell_state_out[i] = 0;
        }
      }


//     if cell_state_in[cellIndex(vec2u(input.cell.x, input.cell.y - 1))] == 1 {
// //        cell_state_out[cellIndex(vec2u(input.cell.x, input.cell.y))] = 0;
//         cell_state_out[cellIndex(vec2u(input.cell.x, input.cell.y))] = 1;
//     }
}

fn cellIndex(cell: vec2u) -> u32 {
    //return cell.x * u32(grid_size.x) + cell.y;
    return (cell.x % u32(grid_size.x)) * u32(grid_size.y) + (cell.y % u32(grid_size.y));
}

fn cellActive(x: u32, y: u32) -> u32 {
    return cell_state_in[cellIndex(vec2(x, y))];
}