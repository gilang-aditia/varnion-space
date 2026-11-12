import { useEffect, useRef, type RefObject } from "react";

/**
 * Karakter "blob" interaktif di halaman login.
 *
 * - idle  → mata mengikuti kursor, badan melar/condong ke arah kursor
 * - grin  → (mengetik email/username) nyengir sambil melihat ke ketikan
 * - shy   → (fokus/mengetik kata sandi) buang muka, menjauhi form
 * - peek  → (kata sandi ditampilkan) satu blob mengintip 👀
 *
 * Animasi dijalankan lewat requestAnimationFrame dan menulis atribut SVG
 * langsung (tanpa re-render React tiap frame).
 */
export type BlobMood = "idle" | "grin" | "shy";
type FaceMood = BlobMood | "peek";

interface BlobSpec {
  x: number; // pusat dasar badan (koordinat viewBox)
  w: number; // setengah lebar badan
  h: number; // tinggi badan
  color: string;
  /** 0–1: seberapa cepat mengejar target (beda-beda agar tidak serempak). */
  speed: number;
  phase: number;
}

const VIEW_W = 600;
const VIEW_H = 640;
const GROUND = VIEW_H + 12; // dasar badan sedikit di bawah tepi → blob "muncul" dari bawah
const PEEKER = 3; // indeks blob yang mengintip saat kata sandi ditampilkan
const INK = "#1d1b2c";

// urutan = urutan gambar (belakang → depan)
const BLOBS: BlobSpec[] = [
  { x: 195, w: 100, h: 470, color: "#7c5cff", speed: 0.09, phase: 0 },
  { x: 385, w: 95, h: 380, color: "#2f6bff", speed: 0.11, phase: 1.3 },
  { x: 112, w: 88, h: 250, color: "#ffb020", speed: 0.13, phase: 2.1 },
  { x: 472, w: 78, h: 220, color: "#ff6fa8", speed: 0.15, phase: 3.2 },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const faceOffset = (b: BlobSpec) => clamp(b.h * 0.2, 58, 92);
const eyeRadius = (b: BlobSpec) => b.w * 0.17;
const eyeGap = (b: BlobSpec) => b.w * 0.46;

/** Badan berbentuk "gumdrop": dasar tetap, puncak bergeser (`lean`) & memanjang. */
function bodyPath(cx: number, w: number, h: number, lean: number) {
  const top = GROUND - h;
  const tx = cx + lean;
  return (
    `M ${cx - w} ${GROUND} ` +
    `C ${cx - w} ${GROUND - h * 0.5} ${tx - w * 0.92} ${top} ${tx} ${top} ` +
    `C ${tx + w * 0.92} ${top} ${cx + w} ${GROUND - h * 0.5} ${cx + w} ${GROUND} Z`
  );
}

/** Bentuk mulut per suasana hati, relatif terhadap pusat mata (r = radius mata). */
function Mouths({ r, mood }: { r: number; mood: FaceMood }) {
  const show = (m: FaceMood) => ({ opacity: mood === m ? 1 : 0, transition: "opacity 180ms ease" });
  return (
    <g>
      {/* senyum tipis */}
      <path
        d={`M ${-r * 0.9} ${r * 1.7} Q 0 ${r * 2.5} ${r * 0.9} ${r * 1.7}`}
        fill="none"
        stroke={INK}
        strokeWidth={r * 0.3}
        strokeLinecap="round"
        style={show("idle")}
      />
      {/* nyengir lebar */}
      <g style={show("grin")}>
        <path d={`M ${-r * 1.55} ${r * 1.35} Q 0 ${r * 3.7} ${r * 1.55} ${r * 1.35} Z`} fill={INK} />
        <path
          d={`M ${-r * 1.42} ${r * 1.42} Q 0 ${r * 1.75} ${r * 1.42} ${r * 1.42} L ${r * 1.28} ${r * 1.72} Q 0 ${r * 2.05} ${-r * 1.28} ${r * 1.72} Z`}
          fill="#fff"
        />
        <ellipse cx={0} cy={r * 2.55} rx={r * 0.6} ry={r * 0.32} fill="#ff6b8b" />
      </g>
      {/* manyun saat buang muka */}
      <path
        d={`M ${-r * 0.55} ${r * 1.95} q ${r * 0.27} ${-r * 0.28} ${r * 0.55} 0 t ${r * 0.55} 0`}
        fill="none"
        stroke={INK}
        strokeWidth={r * 0.26}
        strokeLinecap="round"
        style={show("shy")}
      />
      {/* "o" kaget saat mengintip */}
      <ellipse cx={0} cy={r * 2.05} rx={r * 0.42} ry={r * 0.5} fill={INK} style={show("peek")} />
    </g>
  );
}

export function LoginBlobs({
  mood,
  peek,
  typingKey,
  identifierRef,
  passwordRef,
}: {
  mood: BlobMood;
  /** Kata sandi sedang ditampilkan → satu blob mengintip. */
  peek: boolean;
  /** Bertambah setiap kali user mengetik → blob memantul. */
  typingKey: number;
  identifierRef: RefObject<HTMLInputElement | null>;
  passwordRef: RefObject<HTMLInputElement | null>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const bodyRefs = useRef<(SVGPathElement | null)[]>([]);
  const faceRefs = useRef<(SVGGElement | null)[]>([]);
  const eyesRefs = useRef<(SVGGElement | null)[]>([]);
  const pupilRefs = useRef<(SVGGElement | null)[]>([]);

  // nilai terbaru untuk loop animasi (tanpa memulai ulang loop)
  const live = useRef({ mood, peek, bounceAt: -1 });
  useEffect(() => {
    live.current.mood = mood;
    live.current.peek = peek;
  }, [mood, peek]);
  useEffect(() => {
    if (typingKey > 0) live.current.bounceAt = performance.now();
  }, [typingKey]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pointer: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => (pointer = { x: e.clientX, y: e.clientY });
    const onLeave = () => (pointer = null);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);

    const state = BLOBS.map(() => ({
      lean: 0,
      stretch: 0,
      faceX: 0,
      px: 0,
      py: 0,
      blinkUntil: 0,
      nextBlink: performance.now() + 800 + Math.random() * 3000,
    }));

    /** Perkiraan posisi kursor ketik di dalam input (agar mata mengikuti ketikan). */
    const caretPoint = (input: HTMLInputElement) => {
      const rect = input.getBoundingClientRect();
      const x = rect.left + 40 + Math.min(input.value.length * 7.4, rect.width - 56);
      return { x, y: rect.top + rect.height / 2 };
    };

    let raf = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const svg = svgRef.current;
      const inverse = svg?.getScreenCTM()?.inverse();
      if (!inverse) return;
      const toSvg = (p: { x: number; y: number }) => new DOMPoint(p.x, p.y).matrixTransform(inverse);

      const { mood, peek, bounceAt } = live.current;
      const identifier = identifierRef.current;
      const password = passwordRef.current;

      // apa yang sedang dilihat
      let target: DOMPoint | null = null;
      if (mood === "grin" && identifier) target = toSvg(caretPoint(identifier));
      else if (mood === "idle" && pointer && !reduceMotion) target = toSvg(pointer);
      const peekTarget = peek && password ? toSvg(caretPoint(password)) : null;

      const bounceAge = t - bounceAt;
      const bounce = !reduceMotion && bounceAt >= 0 && bounceAge < 320 ? Math.sin((bounceAge / 320) * Math.PI) : 0;

      BLOBS.forEach((b, i) => {
        const s = state[i]!;
        const r = eyeRadius(b);
        const faceBaseY = GROUND - b.h + faceOffset(b);
        const isPeeking = mood === "shy" && i === PEEKER && peekTarget;
        const lookAt = isPeeking ? peekTarget : target;

        let tLean = 0;
        let tStretch = 0;
        let tFace = 0;
        let tPx = 0;
        let tPy = 0;
        if (mood === "shy" && !isPeeking) {
          // buang muka: badan, wajah & mata menjauhi form (form ada di kanan)
          tLean = -b.w * 0.34;
          tStretch = -b.h * 0.03;
          tFace = -b.w * 0.32;
          tPx = -1;
          tPy = -0.25;
        } else if (lookAt) {
          const dx = lookAt.x - (b.x + s.lean);
          const dy = lookAt.y - faceBaseY;
          const dist = Math.hypot(dx, dy) || 1;
          tLean = clamp(dx * 0.1, -b.w * 0.5, b.w * 0.5);
          tStretch = clamp(-dy * 0.12, -b.h * 0.07, b.h * 0.14); // kursor di atas → memanjang
          tFace = clamp(dx * 0.05, -b.w * 0.22, b.w * 0.22);
          const reach = Math.min(1, dist / 140);
          tPx = (dx / dist) * reach;
          tPy = (dy / dist) * reach;
        }

        const k = reduceMotion ? 1 : b.speed;
        s.lean += (tLean - s.lean) * k;
        s.stretch += (tStretch - s.stretch) * k;
        s.faceX += (tFace - s.faceX) * k;
        s.px += (tPx - s.px) * Math.min(1, k * 2);
        s.py += (tPy - s.py) * Math.min(1, k * 2);

        const breathe = reduceMotion ? 0 : Math.sin(t / 900 + b.phase) * 3;
        const h = b.h + s.stretch + breathe + bounce * (14 + i * 3);
        const w = b.w * Math.sqrt(b.h / h); // jaga "volume": makin tinggi makin ramping
        const top = GROUND - h;

        bodyRefs.current[i]?.setAttribute("d", bodyPath(b.x, w, h, s.lean));
        faceRefs.current[i]?.setAttribute(
          "transform",
          `translate(${b.x + s.lean * 0.88 + s.faceX} ${top + faceOffset(b)})`,
        );
        const maxOffset = r * 0.42;
        pupilRefs.current[i]?.setAttribute("transform", `translate(${s.px * maxOffset} ${s.py * maxOffset})`);

        // kedip acak; nyengir = mata menyipit, mengintip = mata membesar
        if (!reduceMotion && t > s.nextBlink) {
          s.blinkUntil = t + 130;
          s.nextBlink = t + 2200 + Math.random() * 3800;
        }
        const scaleY = t < s.blinkUntil ? 0.08 : isPeeking ? 1.15 : mood === "grin" ? 0.78 : 1;
        const scaleX = isPeeking ? 1.15 : 1;
        eyesRefs.current[i]?.setAttribute("transform", `scale(${scaleX} ${scaleY})`);
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [identifierRef, passwordRef]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {BLOBS.map((b, i) => {
        const r = eyeRadius(b);
        const gap = eyeGap(b);
        const faceMood: FaceMood = mood === "shy" && peek && i === PEEKER ? "peek" : mood;
        return (
          <g key={b.color}>
            <path
              ref={(el) => {
                bodyRefs.current[i] = el;
              }}
              d={bodyPath(b.x, b.w, b.h, 0)}
              fill={b.color}
            />
            <g
              ref={(el) => {
                faceRefs.current[i] = el;
              }}
              transform={`translate(${b.x} ${GROUND - b.h + faceOffset(b)})`}
            >
              {/* pipi merona saat nyengir / malu */}
              <g style={{ opacity: faceMood === "grin" || faceMood === "shy" ? 0.5 : 0, transition: "opacity 200ms" }}>
                <ellipse cx={-gap * 0.95} cy={r * 1.35} rx={r * 0.6} ry={r * 0.32} fill="#ff4d8d" />
                <ellipse cx={gap * 0.95} cy={r * 1.35} rx={r * 0.6} ry={r * 0.32} fill="#ff4d8d" />
              </g>
              <g
                ref={(el) => {
                  eyesRefs.current[i] = el;
                }}
              >
                <circle cx={-gap / 2} cy={0} r={r} fill="#fff" />
                <circle cx={gap / 2} cy={0} r={r} fill="#fff" />
                <g
                  ref={(el) => {
                    pupilRefs.current[i] = el;
                  }}
                >
                  {[-gap / 2, gap / 2].map((ex) => (
                    <g key={ex}>
                      <circle cx={ex} cy={0} r={r * 0.52} fill={INK} />
                      <circle cx={ex + r * 0.18} cy={-r * 0.2} r={r * 0.16} fill="#fff" />
                    </g>
                  ))}
                </g>
              </g>
              <Mouths r={r} mood={faceMood} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
