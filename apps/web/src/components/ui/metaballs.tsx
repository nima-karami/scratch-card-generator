import { FC, useRef, useEffect, useState } from "react";

export interface ModernPulseShaderProps {
  /** Number of grid cells per axis */
  gridSize?: number;
  /** Animation speed multiplier */
  speed?: number;
  /** Background color RGB (0–1) */
  bgColor?: [number, number, number];
  /** Foreground fill color RGB (0–1); used for both sides when gradient not set */
  fgColor?: [number, number, number];
  /** Glow accent color RGB (0–1); used for both sides when gradient not set */
  glowColor?: [number, number, number];
  /** Left-edge fill color for horizontal gradient (use with fgColorRight) */
  fgColorLeft?: [number, number, number];
  /** Right-edge fill color for horizontal gradient (use with fgColorLeft) */
  fgColorRight?: [number, number, number];
  /** Left-edge glow color for horizontal gradient (use with glowColorRight) */
  glowColorLeft?: [number, number, number];
  /** Right-edge glow color for horizontal gradient (use with glowColorLeft) */
  glowColorRight?: [number, number, number];
  /** Grain intensity added per pixel */
  grainIntensity?: number;
  /** Extra wrapper CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

const vertexShaderSource = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_gridSize;
uniform float u_speed;
uniform vec3  u_bgColor;
uniform vec3  u_fgColorLeft;
uniform vec3  u_fgColorRight;
uniform vec3  u_glowColorLeft;
uniform vec3  u_glowColorRight;
uniform float u_grain;

out vec4 fragColor;

// 2D pseudo-random generator
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + vec2(45.32));
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float t = u_time * u_speed;

  // Fluid distortion
  uv.x += sin(uv.y * 4.0 + t) * 0.1;
  uv.y += cos(uv.x * 4.0 + t) * 0.1;

  // Grid cell coordinates
  vec2 guv = fract(uv * u_gridSize) - 0.5;
  vec2 gid = floor(uv * u_gridSize);

  // Pulsing circle radius
  float pulse = sin(t * 2.0 + gid.x * 0.5 + gid.y * 0.3) * 0.5 + 0.5;
  float radius = 0.25 * pulse;
  float dist   = length(guv) - radius;

  // Left-to-right gradient by screen x
  float xNorm = gl_FragCoord.x / u_resolution.x;
  vec3  fg    = mix(u_fgColorLeft, u_fgColorRight, xNorm);
  vec3  glow  = mix(u_glowColorLeft, u_glowColorRight, xNorm);

  // Fill color interpolation
  float fillFactor = 1.0 - smoothstep(0.0, 0.01, dist);
  vec3  color      = mix(u_bgColor, fg, fillFactor * 0.8);

  // Glow highlight
  float glowMask = smoothstep(0.0, -0.05, dist) * smoothstep(-0.1, 0.0, dist);
  color += glow * glowMask;

  // Grain overlay
  color += hash(uv + t) * u_grain;

  fragColor = vec4(color, 1.0);
}
`;

const ModernPulseShader: FC<ModernPulseShaderProps> = ({
  gridSize       = 8,
  speed          = 1,
  bgColor        = [0.05, 0.0, 0.15],
  fgColor        = [1.0, 0.2, 0.7],
  glowColor      = [0.1, 1.0, 0.9],
  fgColorLeft,
  fgColorRight,
  glowColorLeft,
  glowColorRight,
  grainIntensity = 0.05,
  className      = "",
  ariaLabel      = "Modern pulse shader background",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const useFgGradient = fgColorLeft != null && fgColorRight != null;
  const useGlowGradient = glowColorLeft != null && glowColorRight != null;
  const fgColorLeftEffective: [number, number, number] = useFgGradient ? fgColorLeft : fgColor;
  const fgColorRightEffective: [number, number, number] = useFgGradient ? fgColorRight : fgColor;
  const glowColorLeftEffective: [number, number, number] = useGlowGradient ? glowColorLeft : glowColor;
  const glowColorRightEffective: [number, number, number] = useGlowGradient ? glowColorRight : glowColor;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Request WebGL2 context (needed for #version 300 es)
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      setError("WebGL2 not supported in this browser.");
      return;
    }

    // Compile shader utility
    const compile = (type: GLenum, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const msg = gl.getShaderInfoLog(s);
        console.error("Shader compile error:", msg);
        gl.deleteShader(s);
        setError("Shader compile error (check console).");
        return null;
      }
      return s;
    };

    // Build program
    const vs = compile(gl.VERTEX_SHADER,   vertexShaderSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const msg = gl.getProgramInfoLog(prog);
      console.error("Program link error:", msg);
      setError("Program link error (check console).");
      return;
    }

    // Look up attribute/uniform locations
    const posLoc   = gl.getAttribLocation(prog, "a_position");
    const resLoc   = gl.getUniformLocation(prog, "u_resolution")!;
    const timeLoc  = gl.getUniformLocation(prog, "u_time")!;
    const gridLoc  = gl.getUniformLocation(prog, "u_gridSize")!;
    const speedLoc = gl.getUniformLocation(prog, "u_speed")!;
    const bgLoc     = gl.getUniformLocation(prog, "u_bgColor")!;
    const fgLeftLoc  = gl.getUniformLocation(prog, "u_fgColorLeft")!;
    const fgRightLoc = gl.getUniformLocation(prog, "u_fgColorRight")!;
    const glowLeftLoc  = gl.getUniformLocation(prog, "u_glowColorLeft")!;
    const glowRightLoc = gl.getUniformLocation(prog, "u_glowColorRight")!;
    const grainLoc  = gl.getUniformLocation(prog, "u_grain")!;

    // Full-screen quad buffer
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf  = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    // Resize handler
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", resize);
    resize();

    // Render loop
    let raf: number;
    const render = (t: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);

      // Bind quad vertices
      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Set uniforms
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t * 0.001);
      gl.uniform1f(gridLoc, gridSize);
      gl.uniform1f(speedLoc, speed);
      gl.uniform3fv(bgLoc, bgColor);
      gl.uniform3fv(fgLeftLoc, fgColorLeftEffective);
      gl.uniform3fv(fgRightLoc, fgColorRightEffective);
      gl.uniform3fv(glowLeftLoc, glowColorLeftEffective);
      gl.uniform3fv(glowRightLoc, glowColorRightEffective);
      gl.uniform1f(grainLoc, grainIntensity);

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [
    gridSize,
    speed,
    bgColor,
    fgColorLeftEffective,
    fgColorRightEffective,
    glowColorLeftEffective,
    glowColorRightEffective,
    grainIntensity,
  ]);

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white font-mono text-sm p-4">
          {error}
        </div>
      )}
    </div>
  );
};

export default ModernPulseShader;
