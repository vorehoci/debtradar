"use client"

import { useEffect, useRef } from "react"

/**
 * The scan field, drawn on the GPU.
 *
 * Written against the raw WebGL API rather than a scene library on purpose.
 * The page this replaces shipped 2.6 MB of JavaScript to draw its hero, almost
 * all of it a 3D runtime, and the traffic paying for it arrives on phones. One
 * fullscreen quad and one fragment shader is a few kilobytes and needs no
 * scene graph, no loader, no third-party origin, and no WASM.
 *
 * The field is not decoration. It is domain-warped noise shaped into filaments
 * and then punched through a mesh of points, so what a visitor watches is a
 * density map: cold and sparse where a codebase is quiet, hot and tangled
 * where risk concentrates. The ramp is the same one the severity bands use.
 */

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

/*
 * WebGL 1 / GLSL ES 100, not 300 es.
 *
 * It costs nothing here — there is no instancing and no integer maths — and it
 * keeps the field on machines whose drivers expose only WebGL 1, which is
 * exactly the older hardware most likely to be running an ad click.
 */
const FRAGMENT = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_warm;

const vec3 VOID_C  = vec3(0.043, 0.051, 0.102);
const vec3 LILAC_C = vec3(0.416, 0.424, 0.965);
const vec3 VIOLET  = vec3(0.706, 0.294, 0.910);
const vec3 EMBER_C = vec3(1.000, 0.416, 0.239);
const vec3 MIST_C  = vec3(0.749, 0.824, 1.000);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  // Aspect-corrected so the filaments do not stretch on a wide monitor.
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;

  float t = u_time * 0.035;

  // The cursor displaces the field under it, falling off quickly so it reads
  // as pushing through something rather than dragging the whole image.
  vec2 m = (u_mouse - 0.5 * u_res.xy) / u_res.y;
  float grip = exp(-dot(p - m, p - m) * 6.0);
  p += (p - m) * grip * 0.22 * u_warm;

  // Two rounds of domain warping. One is a cloud; two is a filament.
  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 + vec2(5.2, 1.3) - t * 0.7));
  vec2 r = vec2(fbm(p * 1.6 + 3.4 * q + vec2(1.7, 9.2) + t * 0.5),
                fbm(p * 1.6 + 3.4 * q + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(p * 1.6 + 3.2 * r);

  // Ridged, so the bright parts are threads instead of soft blobs.
  //
  // The exponent is the whole character of the image. Above about 3 the
  // filaments thin to a scatter and the field reads as grain; below about 2
  // they fatten into the cloud this world refuses. 2.4 keeps them as threads
  // wide enough to carry colour.
  float ridge = 1.0 - abs(f * 2.0 - 1.0);
  ridge = pow(clamp(ridge, 0.0, 1.0), 2.4);

  // Heat rises toward the lower right, which is where the composition wants
  // the eye to end up and where the copy is not.
  float heat = smoothstep(0.15, 1.15, uv.x * 0.85 + (1.0 - uv.y) * 0.5);

  vec3 col = VOID_C;
  col = mix(col, LILAC_C, ridge * 0.76);
  col = mix(col, VIOLET, ridge * heat * 0.70);
  col = mix(col, EMBER_C, ridge * pow(heat, 2.4) * 0.78);
  // The brightest cores read as light rather than as saturated paint.
  col = mix(col, MIST_C, pow(ridge, 3.0) * 0.38 * (1.0 - heat));

  // The mesh. Each cell keeps a point whose size follows local density, so the
  // field resolves into countable marks instead of a gradient.
  //
  // The cell is in device pixels, so it has to be coarse enough to survive a
  // 1.5x buffer; at 2.6 the points landed under a screen pixel and averaged
  // back into the gradient they exist to break.
  float cell = 3.6;
  vec2 g = fract(p * u_res.y / cell) - 0.5;
  float dot_r = 0.16 + ridge * 0.30;
  float pts = 1.0 - smoothstep(dot_r - 0.10, dot_r, length(g));
  col *= mix(0.50, 1.0, pts);

  // Fine film, breaking up the banding a smooth ramp would otherwise show.
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.022;

  /*
   * The composition mask, and the reason the field is a background rather than
   * the page.
   *
   * Two separate jobs. side keeps the copy column close to void and lets the
   * field gather to the right, where the heat already is. band eases the top
   * and bottom strips so the navigation and the readout sit on quiet ground
   * instead of on filaments.
   *
   * Tuned against the built page, twice: without the first the headline and
   * the secondary control were unreadable over the brightest part of the
   * field, which is a failure of the surface's job, not a matter of taste.
   */
  float side = smoothstep(0.10, 0.62, uv.x);
  float band = smoothstep(0.02, 0.16, uv.y) * (1.0 - smoothstep(0.84, 1.0, uv.y));
  col = mix(VOID_C, col, 0.14 + 0.86 * side * mix(0.62, 1.0, band));

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("debtradar: field shader failed", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function FieldGL({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    /*
     * `antialias: false` because nothing here has an edge to smooth — the
     * image is noise — and `powerPreference: "low-power"` because this is a
     * background on a marketing page, not a game. On a laptop that means the
     * integrated GPU and a fan that stays off.
     */
    const gl = (canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    }) || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null

    if (!gl) {
      onFail()
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    const program = vs && fs ? gl.createProgram() : null
    if (!vs || !fs || !program) {
      onFail()
      return
    }

    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("debtradar: field program failed", gl.getProgramInfoLog(program))
      onFail()
      return
    }
    gl.useProgram(program)

    // One triangle large enough to cover the clip volume. A quad would need
    // two triangles and an index buffer to draw the same pixels.
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, "a_pos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, "u_res")
    const uTime = gl.getUniformLocation(program, "u_time")
    const uMouse = gl.getUniformLocation(program, "u_mouse")
    const uWarm = gl.getUniformLocation(program, "u_warm")

    const mouse = { x: 0, y: 0, target: { x: 0, y: 0 } }
    let warm = 0

    const resize = () => {
      // Capped at 1.5: the field is noise, so a retina-sharp render costs four
      // times the fragments to look very slightly different.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.floor(canvas.clientWidth * dpr)
      const h = Math.floor(canvas.clientHeight * dpr)
      if (canvas.width === w && canvas.height === h) return
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      mouse.x = mouse.target.x = w * 0.72
      mouse.y = mouse.target.y = h * 0.4
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      mouse.target.x = (e.clientX - rect.left) * dpr
      // GL's origin is bottom-left; the pointer's is top-left.
      mouse.target.y = (rect.height - (e.clientY - rect.top)) * dpr
    }

    resize()
    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onMove, { passive: true })

    let raf = 0
    let running = true
    const start = performance.now()

    const frame = (now: number) => {
      if (!running) return
      // Eased toward the pointer rather than snapped to it, so the field has
      // weight and a fast flick does not tear it.
      mouse.x += (mouse.target.x - mouse.x) * 0.055
      mouse.y += (mouse.target.y - mouse.y) * 0.055
      warm += (1 - warm) * 0.02

      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, (now - start) / 1000)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.uniform1f(uWarm, warm)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    /*
     * A background tab, or a scrolled-past hero, should not hold a GPU.
     *
     * Browsers already throttle rAF in hidden tabs, but the observer also
     * covers the case that costs a reader most: the hero sitting off-screen
     * while they read the rest of the page on a laptop battery.
     */
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          raf = requestAnimationFrame(frame)
        } else if (!entry.isIntersecting && running) {
          running = false
          cancelAnimationFrame(raf)
        }
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onMove)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      // Frees the drawing buffer immediately instead of waiting for the GC to
      // notice the context; a page with several mounts otherwise hits the
      // browser's hard limit on live contexts.
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [onFail])

  return <canvas ref={ref} aria-hidden="true" className="block h-full w-full" />
}
