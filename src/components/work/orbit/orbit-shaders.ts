/**
 * GLSL for the ORBIT stage (orbit-stage.ts). ShaderMaterial on WebGL2: three defines texture2D as
 * texture, and `#include <colorspace_fragment>` converts the linear result to the output space.
 *
 * Colour pipeline: posters are sRGB textures (decoded by the GPU on sampling). three r15x+ uploads a
 * VideoTexture with a linear transfer and only its built-in materials decode it, so PANEL_FRAG
 * decodes the video sample itself (obSrgbToLinear). The renderer uses NoToneMapping, and these
 * materials never include tonemapping, so an on-air screen shows the source pixels unchanged.
 *
 * Shared uniforms: uTint is the on-air project's colour (linear, eased by the stage); uHaze is the
 * depth range (from the camera) over which things fade into the void; uQuality 1 = full effects.
 */

export const PLAIN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Normalised tint: hue of the on-air project at full brightness (max channel 1). */
const TINT_FN = /* glsl */ `
vec3 obTintN(vec3 t) { return t / max(max(t.r, t.g), max(t.b, 1e-3)); }
`;

/**
 * Screens are built in the vertex shader from the uv grid: a curved slice of a cylinder of radius
 * uRad, uDim.x wide and uDim.y tall, so the stage can grow and shrink them every frame.
 */
export const PANEL_VERT = /* glsl */ `
uniform float uVel;
uniform float uFade;
uniform vec2 uDim;
uniform float uRad;
uniform float uBase;
uniform float uFloor;
uniform float uReflect;
varying vec2 vUv;
varying float vDepth;
varying float vWorldY;
void main() {
  vUv = uv;
  float a = (uv.x - 0.5) * uDim.x / uRad;
  vec3 p = vec3(uRad * sin(a), uBase + uv.y * uDim.y, -uRad * cos(a));
  // Spin shear: the screen leans with the ring's velocity and bows towards the camera.
  float yN = uv.y - 0.5;
  p.x += uVel * yN * 0.2;
  float bow = 1.0 - pow(uv.x * 2.0 - 1.0, 2.0);
  p.z += abs(uVel) * bow * 0.1;
  // Intro: screens rise out of the floor.
  p.y -= (1.0 - uFade) * 0.4;
  if (uReflect > 0.5) p.y = 2.0 * uFloor - p.y;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorldY = w.y;
  vec4 mv = viewMatrix * w;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const PANEL_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uMapAspect;
uniform sampler2D uVid;
uniform float uVidMix;
uniform float uVidAspect;
uniform vec2 uDim;
uniform float uSeed;
uniform float uFocus;
uniform float uHover;
uniform float uFar;
uniform float uAir;
uniform float uFade;
uniform float uReflect;
uniform float uFloor;
uniform float uVel;
uniform float uSweep;
uniform float uQuality;
uniform vec2 uHaze;
uniform vec3 uBg;
uniform vec3 uAmber;
uniform vec3 uTint;
varying vec2 vUv;
varying float vDepth;
varying float vWorldY;
${TINT_FN}

float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 obSrgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

/** Cover-fit uv for a texture of aspect texAspect on a screen of the current size. */
vec2 cover(vec2 uv, float texAspect) {
  float pa = uDim.x / uDim.y;
  vec2 rep = texAspect > pa ? vec2(pa / texAspect, 1.0) : vec2(1.0, texAspect / pa);
  return uv * rep + (1.0 - rep) * 0.5;
}

vec3 bar(float k) {
  if (k < 1.0) return vec3(0.30);
  if (k < 2.0) return vec3(0.30, 0.27, 0.10);
  if (k < 3.0) return vec3(0.10, 0.26, 0.29);
  if (k < 4.0) return vec3(0.11, 0.27, 0.12);
  if (k < 5.0) return vec3(0.27, 0.11, 0.26);
  if (k < 6.0) return vec3(0.29, 0.11, 0.10);
  if (k < 7.0) return vec3(0.11, 0.12, 0.30);
  return vec3(0.01);
}

/** Loading slate (before the poster arrives). */
vec3 slate(vec2 uv) {
  vec3 c = mix(vec3(0.012), vec3(0.03), uv.y);
  float band = step(0.1, uv.y) * step(uv.y, 0.17);
  c = mix(c, bar(floor(uv.x * 8.0)) * 0.55, band);
  float hatch = step(0.965, fract((uv.x * uDim.x + uv.y * uDim.y + uSeed) * 14.0));
  return c + hatch * 0.012;
}

/** One sample, split into R / G / B a little apart while the ring spins (ca = 0 when still). */
vec3 tap(sampler2D t, vec2 uv, float bias, float ca) {
  vec3 c = texture2D(t, uv, bias).rgb;
  if (ca != 0.0) {
    c.r = texture2D(t, uv + vec2(ca, 0.0), bias).r;
    c.b = texture2D(t, uv - vec2(ca, 0.0), bias).b;
  }
  return c;
}

/** Reflection: a soft vertical smear (5 taps) at full quality, one blurred tap otherwise. */
vec3 reflTap(sampler2D t, vec2 uv, float bias) {
  vec3 c = texture2D(t, uv, bias).rgb;
  if (uQuality > 0.5) {
    c *= 0.36;
    c += texture2D(t, uv + vec2(0.0, 0.035), bias).rgb * 0.22;
    c += texture2D(t, uv - vec2(0.0, 0.035), bias).rgb * 0.18;
    c += texture2D(t, uv + vec2(0.03, 0.07), bias).rgb * 0.12;
    c += texture2D(t, uv - vec2(0.03, 0.07), bias).rgb * 0.12;
  }
  return c;
}

void main() {
  bool refl = uReflect > 0.5;
  if (refl && vWorldY > uFloor) discard;
  vec2 p = (vUv - 0.5) * uDim;
  float d = sdBox(p, uDim * 0.5, 0.024);
  float aa = fwidth(d) * 1.25;
  float inside = 1.0 - smoothstep(-aa, aa, d);
  if (inside <= 0.001) discard;

  // Focus: on air is exact; off air is dimmer, cooler, desaturated and a touch soft. Hover pulls focus.
  float focus = clamp(max(uFocus + uHover * 0.3, uAir), 0.0, 1.0);
  float soft = (1.0 - focus) * 1.6;
  float ca = refl ? 0.0 : uVel * 0.014;

  vec3 col;
  if (uHasMap > 0.5) {
    vec2 tuv = cover(vUv, uMapAspect);
    col = refl ? reflTap(uMap, tuv, 2.5) : tap(uMap, tuv, soft, ca);
  } else {
    col = slate(vUv);
  }
  float vm = smoothstep(0.0, 1.0, uVidMix) * smoothstep(0.35, 0.9, uAir);
  if (vm > 0.001) {
    vec2 vuv = cover(vUv, uVidAspect);
    vec3 v = obSrgbToLinear(refl ? reflTap(uVid, vuv, 0.0) : tap(uVid, vuv, 0.0, ca));
    // Crossfade in gamma space so a dark poster into a bright clip reads as an even 250 ms dissolve.
    col = vm >= 0.999 ? v : pow(mix(pow(col, vec3(0.4545)), pow(v, vec3(0.4545)), vm), vec3(2.2));
  }

  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lum) * vec3(0.9, 0.96, 1.06), col, 0.18 + 0.82 * focus);
  col *= (0.12 + 0.88 * focus) * (1.0 - 0.8 * uFar * (1.0 - uHover * 0.6));
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * mix(0.6, 0.14, uAir);

  // On air: the faintest scanlines and an amber hairline rim. Off air: a smoke hairline.
  col *= 1.0 - uAir * 0.025 * step(0.5, fract(gl_FragCoord.y * 0.5));
  float rim = 1.0 - smoothstep(0.0, aa * 2.0 + 0.003, abs(d + 0.005));
  if (!refl) {
    col = mix(col, uAmber, rim * uAir);
    col += vec3(0.06) * rim * (1.0 - uAir) * (0.3 + focus);
  }

  // Landing glint: one soft light sweep across the screen when it settles on air.
  if (!refl && uSweep > 0.0 && uSweep < 1.0) {
    float sx = vUv.x + (vUv.y - 0.5) * 0.45;
    float band = exp(-pow((sx - mix(-0.35, 1.35, uSweep)) / 0.07, 2.0));
    col += vec3(1.0, 0.95, 0.86) * band * 0.16;
  }

  float alpha = inside * uFade;
  if (refl) {
    alpha *= 0.3 * pow(1.0 - vUv.y, 2.8);
    // The glossy floor picks up the room's colour.
    col *= mix(vec3(0.9), obTintN(uTint) * 0.95, 0.3 * uAir);
  }

  // Depth haze into the void (measured from the camera, so a far camera on phones stays clean).
  col = mix(col, uBg, smoothstep(uHaze.x, uHaze.y, vDepth) * 0.9);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;

export const FLOOR_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const FLOOR_FRAG = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uAmber;
uniform vec3 uTint;
uniform vec3 uCam;
uniform vec2 uHaze;
uniform float uR;
uniform float uArc;
uniform float uSpot;
varying vec3 vWorld;
${TINT_FN}

void main() {
  vec2 p = vWorld.xz;
  float r = length(p);
  float ang = atan(p.x, -p.y);
  float s = ang * uR + uArc;
  vec3 col = uBg * 0.8;

  // A pool of light on the floor in front of the on-air screen, in the project's colour.
  vec2 spot = (p - vec2(0.0, -uR + 0.5)) * vec2(0.9, 1.7);
  float pool = exp(-dot(spot, spot) * 1.6);
  col += obTintN(uTint) * pool * 0.0075 * uSpot + vec3(pool * 0.0015);

  // The timeline ruler: a track ring with minor and major ticks that turn with the ring.
  float rr = uR - 0.42;
  float fr = fwidth(r);
  float track = 1.0 - smoothstep(0.0, fr * 1.5, abs(r - rr));
  float fs = fwidth(s);
  float dMin = abs(fract(s / 0.1 + 0.5) - 0.5) * 0.1;
  float dMaj = abs(fract(s / 0.5 + 0.5) - 0.5) * 0.5;
  float minor = (1.0 - smoothstep(0.0, fs * 1.2, dMin)) * step(rr, r) * step(r, rr + 0.05);
  float major = (1.0 - smoothstep(0.0, fs * 1.4, dMaj)) * step(rr, r) * step(r, rr + 0.12);
  float nearFront = exp(-ang * ang * 4.0 * uR * uR / 14.0);
  col += vec3(0.13) * (track * 0.9 + minor * 0.7 + major) * nearFront;

  // Playhead: an amber line across the ruler at the camera's heading.
  float ph = 1.0 - smoothstep(0.0, fwidth(ang * uR) * 1.5, abs(ang * uR));
  ph *= step(rr - 0.06, r) * step(r, rr + 0.2);
  col = mix(col, uAmber, ph * 0.9);

  col = mix(col, uBg, smoothstep(uHaze.x - 0.1, uHaze.y + 1.0, length(vWorld - uCam)));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/** Backdrop haze; with GLOW defined it is the additive halo behind the on-air screen. */
export const HAZE_FRAG = /* glsl */ `
/*GLOW*/
uniform vec3 uAmber;
uniform vec3 uBg;
uniform vec3 uTint;
#ifdef GLOW
uniform float uStrength;
#endif
varying vec2 vUv;
${TINT_FN}
void main() {
  vec2 q = vUv - 0.5;
  vec3 tn = obTintN(uTint);
#ifdef GLOW
  vec2 g2 = q * vec2(2.0, 2.2);
  float g = exp(-dot(g2, g2) * 13.0);
  vec3 col = mix(vec3(1.0, 0.9, 0.78), tn, 0.7) * g * 0.02 * uStrength;
  gl_FragColor = vec4(col, 1.0);
#else
  vec2 h = q * vec2(1.0, 2.6);
  float g = exp(-dot(h, h) * 9.0);
  vec3 col = uBg + tn * g * 0.0026 + vec3(0.0008, 0.0008, 0.001) * g;
  gl_FragColor = vec4(col, 1.0);
#endif
  #include <colorspace_fragment>
}
`;

export const BEAM_FRAG = /* glsl */ `
uniform float uStrength;
uniform float uTime;
uniform vec3 uTint;
varying vec2 vUv;
${TINT_FN}
void main() {
  float t = vUv.y;
  float halfW = mix(0.48, 0.09, t);
  float x = abs(vUv.x - 0.5);
  float edge = 1.0 - smoothstep(halfW * 0.45, halfW, x);
  float vert = smoothstep(0.0, 0.3, t) * smoothstep(1.0, 0.6, t);
  float a = edge * vert * 0.006 * uStrength * (0.96 + 0.04 * sin(uTime * 0.8));
  gl_FragColor = vec4(mix(vec3(1.0, 0.95, 0.86), obTintN(uTint), 0.35) * a, 1.0);
  #include <colorspace_fragment>
}
`;

export const DUST_VERT = /* glsl */ `
attribute float seed;
uniform float uTime;
uniform float uFloor;
uniform float uPx;
uniform float uStrength;
varying float vA;
void main() {
  float h = 2.6;
  vec3 p = position;
  p.y = uFloor + mod(position.y * h + uTime * (0.025 + seed * 0.045), h);
  p.x += sin(uTime * 0.3 + seed * 20.0) * 0.08;
  p.z += cos(uTime * 0.23 + seed * 13.0) * 0.05;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float yN = (p.y - uFloor) / h;
  float halfW = mix(1.05, 0.22, yN);
  float inBeam = 1.0 - smoothstep(halfW * 0.45, halfW, abs(p.x));
  vA = inBeam * smoothstep(0.0, 0.15, yN) * smoothstep(1.0, 0.6, yN) * (0.3 + 0.7 * fract(seed * 7.3)) * uStrength;
  gl_PointSize = (0.8 + seed * 1.6) * uPx * (2.2 / max(0.5, -mv.z));
}
`;

export const DUST_FRAG = /* glsl */ `
uniform vec3 uTint;
varying float vA;
${TINT_FN}
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA * 0.22;
  gl_FragColor = vec4(mix(vec3(1.0, 0.92, 0.8), obTintN(uTint), 0.25) * a, 1.0);
  #include <colorspace_fragment>
}
`;

/** Slot numbers engraved on the floor in front of each screen (atlas of "01".."NN"). */
export const LABEL_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uCell;
uniform float uCount;
uniform float uAir;
uniform float uFade;
uniform float uReady;
uniform vec2 uHaze;
uniform vec3 uBg;
uniform vec3 uAmber;
varying vec2 vUv;
varying float vDepth;
void main() {
  vec2 uv = vec2((uCell + vUv.x) / uCount, vUv.y);
  float a = texture2D(uAtlas, uv).r;
  vec3 col = mix(vec3(0.42, 0.4, 0.37), uAmber, uAir);
  col = mix(col, uBg, smoothstep(uHaze.x - 0.2, uHaze.y - 1.5, vDepth));
  gl_FragColor = vec4(col, a * (0.4 + 0.6 * uAir) * uFade * uReady);
  #include <colorspace_fragment>
}
`;

export const LABEL_VERT = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
