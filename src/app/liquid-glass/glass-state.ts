export interface GlassState {
  x: number;
  y: number;
  gw: number;
  gh: number;
  gr: number;
  thick: number;
  bezel: number;
  ior: number;
  blur: number;
  spec: number;
  tint: number;
  shadow: number;
}

export const DEFAULT_STATE: GlassState = {
  x: 0,
  y: 0,
  gw: 400,
  gh: 200,
  gr: 60,
  thick: 50,
  bezel: 60,
  ior: 3.0,
  blur: 1.5,
  spec: 0.55,
  tint: 0.08,
  shadow: 0.5,
};
