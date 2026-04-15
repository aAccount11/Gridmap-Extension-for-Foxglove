import { Time } from "@foxglove/schemas/schemas/typescript/Time";

export enum ColorTransform {
  RGBA,
  INTENSITY
};

export type ConvertToGridMapSettings = {
  height_layer?: string;
  color_layer?: string;
  color_transform?: ColorTransform;
  auto_compute_bounds?: boolean;
  bound_min?: number;
  bound_max?: number;
};

export type GridMapMsg = {
  header: {
    stamp: Time;
    frame_id: string;
  };
  info: {
    resolution: number;  // e.g. 0.05
    length_x: number;    // total map size in X dimension
    length_y: number;    // total map size in Y dimension
    pose?: {
      position?: { x: number; y: number; z: number };
      orientation?: { x: number; y: number; z: number; w: number };
    };
  };
  layers: readonly string[];
  data: {
    data: Float32Array;
  }[];
};

export type SettingsMapItem = {
  layers: string[];
  settings: ConvertToGridMapSettings;
};

export type SettingsMap = Map<
  string,
  SettingsMapItem
>;


