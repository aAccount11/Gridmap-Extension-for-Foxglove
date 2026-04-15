
import {
  Color,
  SceneEntity,
  SceneEntityDeletionType,
  SceneUpdate,
  TriangleListPrimitive,
  Vector3,
} from "@foxglove/schemas";
import { Time } from "@foxglove/schemas/schemas/typescript/Time";

import {
  GridMapMsg,
  ConvertToGridMapSettings,
  ColorTransform
} from "./types";

// const MAX_TRIANGLES = 40_000;

export function convertGridMap(
  gridMap: GridMapMsg,
  settings?: ConvertToGridMapSettings
): SceneUpdate {
  // 1) Basic checks
  if (!gridMap?.header?.frame_id 
    || !gridMap?.info?.resolution 
    || !gridMap.layers?.length
  ) {
    return { deletions: [], entities: [] };
  }

  if( settings === undefined ){
    settings = {};
    settings.color_layer = gridMap.layers[0]!;
    settings.height_layer = gridMap.layers[0]!;
    settings.color_transform = ColorTransform.INTENSITY;
    settings.auto_compute_bounds = true;
    settings.bound_min = 0;
    settings.bound_max = 10;
  }
  else {
    settings.color_layer ??= gridMap.layers[0]!;
    settings.height_layer ??= gridMap.layers[0]!;
    settings.color_transform ??= ColorTransform.INTENSITY;
    settings.auto_compute_bounds ??= true;
    settings.bound_min ??= 0;
    settings.bound_max ??= 10;
  }

  const { frame_id } = gridMap.header;
  const timestamp = gridMap.header.stamp;
  const entityId = `grid_map_${frame_id}`;

  // Remove any prior entity with the same ID
  const deletions = [{
    timestamp,
    type: SceneEntityDeletionType.MATCHING_ID,
    id: entityId,
  }];

  // 2) Pick a layer for height and color
  const { resolution, length_x, length_y } = gridMap.info;
  const colorLayerIndex = gridMap.layers.indexOf(
    settings.color_layer
  );
  if( colorLayerIndex === -1 ){
    return { deletions, entities: [] };
  }
  
  const heightLayerIndex = gridMap.layers.indexOf(
    settings.height_layer
  );
  if( heightLayerIndex === -1 ){
    return { deletions, entities: [] };
  }

  const heightData = gridMap.data[heightLayerIndex]?.data 
    ?? new Float32Array();
  if (heightData.length === 0) {
    return { deletions, entities: [] };
  }

  const colorData = gridMap.data[colorLayerIndex]?.data 
    ?? new Float32Array();
  if (colorData.length === 0){
    return { deletions, entities: [] };
  }

  // 3) Dimensions
  const gridWidth = Math.round(length_x / resolution);
  const gridHeight = Math.round(length_y / resolution);
  if (gridWidth < 2 || gridHeight < 2) {
    return { deletions, entities: [] };
  }

  // 4) Build a mesh entity
  const entity = createTriangleList(
    entityId,
    timestamp,
    frame_id,
    gridMap.info.pose?.position?.x ?? 0,
    gridMap.info.pose?.position?.y ?? 0,
    resolution,
    length_x,
    length_y,
    heightData,
    colorData,
    settings
  );
  if (!entity) {
    return { deletions, entities: [] };
  }

  return {
    deletions,
    entities: [entity],
  };
}


function createTriangleList(
  entityId: string,
  timestamp: Time,
  frameId: string,
  offsetX: number,
  offsetY: number,
  resolution: number,
  lengthX: number,
  lengthY: number,
  heightData: Float32Array,
  colorData: Float32Array,
  settings: ConvertToGridMapSettings
): SceneEntity | null {
  const gridWidth = Math.round(lengthX / resolution);
  const gridHeight = Math.round(lengthY / resolution);

  //const totalCells = (gridWidth - 1) * (gridHeight - 1);
  //const totalTris = 2 * totalCells;

  //let stride = 1;
  //if (totalTris > MAX_TRIANGLES) {
  //  // Downsample
  //  const ratio = Math.sqrt(totalTris / MAX_TRIANGLES);
  //  stride = Math.ceil(ratio);
  //  
  //}

  const colorTransform = settings.color_transform!;
  const autoComputeIntensity = settings.auto_compute_bounds!;
  const minBound = settings.bound_min!;
  const maxBound = settings.bound_max!;

  // find min/max to color from blue->red
  let uint8_buffer : Uint8Array | null = null;
  let minVal = Infinity;
  let maxVal = -Infinity;
  if( colorTransform === ColorTransform.INTENSITY ){
    if( autoComputeIntensity === true ){
      for (const val of colorData) {
        if (Number.isFinite(val)) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      }
    }
    else {
      minVal = minBound;
      maxVal = maxBound;
    }
    if (minVal >= maxVal) {
      maxVal = minVal + 0.001;
    }
  }
  else if( colorTransform === ColorTransform.RGBA ){
    uint8_buffer = new Uint8Array(colorData.buffer);
  }

  // 0..gridHeight maps roughly to -half..+half in x
  const halfX = lengthX / 2;
  const halfY = lengthY / 2;

  const points: Vector3[] = [];
  const colors: Color[] = [];
  const indices: number[] = [];


  for (let row = 0; row < gridHeight - 1; row += 1) {
    for (let col = 0; col < gridWidth - 1; col += 1) {
      // Flattened index for each corner
      const idxTL = row*gridWidth + col;
      const idxTR = row*gridWidth + (col + 1);
      const idxBL = (row + 1)*gridWidth + col;
      const idxBR = (row + 1)*gridWidth + (col + 1);
      if (
        idxTL >= heightData.length
        || idxTR >= heightData.length
        || idxBL >= heightData.length
        || idxBR >= heightData.length
      ) {
        continue;
      }

      const hTL = heightData[idxTL];
      const hTR = heightData[idxTR];
      const hBL = heightData[idxBL];
      const hBR = heightData[idxBR];
      if (![
        hTL, hTR, hBL, hBR,
        colorData[idxTL],
        colorData[idxTR],
        colorData[idxBL],
        colorData[idxBR],
      ].every(Number.isFinite)) {
        continue;
      }

      const yTL = (gridHeight - row)*resolution - halfY + offsetY;
      const xTL = (gridWidth - col)*resolution - halfX + offsetX;

      const yTR = (gridHeight - row)*resolution - halfY+ offsetY;
      const xTR = (gridWidth - col - 1)*resolution - halfX + offsetX;

      const yBL = (gridHeight - row - 1)*resolution - halfY+ offsetY;
      const xBL = (gridWidth - col)*resolution - halfX + offsetX;

      const yBR = (gridHeight - row - 1)*resolution - halfY+ offsetY;
      const xBR = (gridWidth - col  - 1)*resolution - halfX + offsetX;

      // const idxBase = points.length;
      points.push(
        { x: xTL, y: yTL, z: hTL! },
        { x: xBL, y: yBL, z: hBL! }, // test
        { x: xTR, y: yTR, z: hTR! }, // test
        { x: xTR, y: yTR, z: hTR! }, 
        { x: xBL, y: yBL, z: hBL! },
        { x: xBR, y: yBR, z: hBR! },
      );

      if( colorTransform === ColorTransform.INTENSITY ){
        colors.push(
          mapHeightToColor(colorData[idxTL] ?? 0, minVal, maxVal),
          mapHeightToColor(colorData[idxBL] ?? 0, minVal, maxVal),
          mapHeightToColor(colorData[idxTR] ?? 0, minVal, maxVal),
          mapHeightToColor(colorData[idxTR] ?? 0, minVal, maxVal),
          mapHeightToColor(colorData[idxBL] ?? 0, minVal, maxVal),
          mapHeightToColor(colorData[idxBR] ?? 0, minVal, maxVal),
        );
      }
      else if(colorTransform === ColorTransform.RGBA ) {
        const buffer : Uint8Array = uint8_buffer!;
        colors.push(
          arrayToColor(buffer, idxTL),
          arrayToColor(buffer, idxBL),
          arrayToColor(buffer, idxTR),
          arrayToColor(buffer, idxTR),
          arrayToColor(buffer, idxBL),
          arrayToColor(buffer, idxBR), 
        )
      }

      // Two triangles: (TL, BL, TR) and (TR, BL, BR)
      //indices.push(
      //  idxBase, idxBase+2, idxBase+1,
      //  idxBase+1, idxBase+2, idxBase+3,
      //);
    }
  }

  if (points.length < 3) {
    return null;
  }

  const triangles: TriangleListPrimitive = {
    pose: { 
      position: { x: 0, y: 0, z: 0 }, 
      orientation: { x: 0, y: 0, z: 0, w: 1 } 
    },
    points,
    colors,
    indices,
    color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
  };

  return {
    id: entityId,
    timestamp,
    frame_id: frameId,
    lifetime: { sec: 0, nsec: 0 },
    frame_locked: true,
    metadata: [
      //{ key: "stride", value: stride.toString() },
      //{ key: "triangles", value: String(indices.length / 3) },
    ],
    arrows: [],
    cubes: [],
    cylinders: [],
    lines: [],
    models: [],
    spheres: [],
    texts: [],
    triangles: [triangles],
  };
}

function mapHeightToColor(h: number, mn: number, mx: number): Color {
  let t = (h - mn) / (mx - mn);
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return { r: t, g: 0, b: 1 - t, a: 1 };
}


function arrayToColor(array: Uint8Array, index: number ): Color {
  return {
    r: (array[index*4 + 0] ?? 0) / 255,
    g: (array[index*4 + 1] ?? 0) / 255,
    b: (array[index*4 + 2] ?? 0) / 255,
    a: 1
  }
}