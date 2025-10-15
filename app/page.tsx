"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import NextImage from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type GridType = 1 | 2 | 3 | 4 | 5 | 6
type FrameType = "genz" | "aesthetic" | "memphis" | "neon" | "sunburst" | "checker" | "wavy"
type CapturedPhoto = { dataUrl: string; timestamp: number }

export default function PhotoboothPage() {
  const [step, setStep] = useState<"grid" | "frame" | "capture" | "preview">("grid")
  const [selectedGrid, setSelectedGrid] = useState<GridType>(2)
  const [selectedFrame, setSelectedFrame] = useState<FrameType>("genz")
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [finalDataUrl, setFinalDataUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)

  const getGridLayoutTailwind = () =>
    (
      {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-2",
        5: "grid-cols-3",
        6: "grid-cols-3",
      } as Record<GridType, string>
    )[selectedGrid]

  const gridToColsRows = (g: GridType) =>
    g === 1
      ? { cols: 1, rows: 1 }
      : g === 2
      ? { cols: 2, rows: 1 }
      : g === 3
      ? { cols: 3, rows: 1 }
      : g === 4
      ? { cols: 2, rows: 2 }
      : { cols: 3, rows: 2 } // 5 & 6

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      })
      setStream(mediaStream)
      if (videoRef.current) videoRef.current.srcObject = mediaStream
    } catch {
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.")
    }
  }

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  const captureRawFrame = (): string | null => {
    const v = videoRef.current
    if (!v) return null
    const c = document.createElement("canvas")
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext("2d")
    if (!ctx) return null
    ctx.scale(-1, 1) // mirror selfie
    ctx.drawImage(v, -c.width, 0, c.width, c.height)
    return c.toDataURL("image/png")
  }

  const doCapture = () => {
    const dataUrl = captureRawFrame()
    if (!dataUrl) return
    const newPhotos = [...capturedPhotos, { dataUrl, timestamp: Date.now() }]
    setCapturedPhotos(newPhotos)
    setCurrentPhotoIndex(newPhotos.length)
    if (newPhotos.length >= selectedGrid) {
      stopCamera()
      setStep("preview")
    }
  }

  const startCountdown = () => {
    setCountdown(3)
    const t = setInterval(() => {
      setCountdown((p) => {
        if (p === 1) {
          clearInterval(t)
          doCapture()
          return null
        }
        return p ? p - 1 : null
      })
    }, 1000)
  }

  const handleNext = () => {
    if (step === "grid") setStep("frame")
    else if (step === "frame") {
      setStep("capture")
      startCamera()
    }
  }

  const buildFinalImage = useCallback(async (): Promise<string> => {
    const { cols, rows } = gridToColsRows(selectedGrid)
    const W = cols * 800 + 200
    const H = rows * 800 + 300

    const bitmaps = await Promise.all(
      capturedPhotos.map(async (p) => {
        const res = await fetch(p.dataUrl)
        const blob = await res.blob()

        // Ketik aman untuk createImageBitmap
        const win = window as unknown as {
          createImageBitmap?: (b: Blob) => Promise<ImageBitmap>
        }

        if (win.createImageBitmap) {
          return await win.createImageBitmap(blob)
        }

        // Fallback ke HTMLImageElement
        return await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new window.Image()
          img.crossOrigin = "anonymous"
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = p.dataUrl
        })
      }),
    )

    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")!
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    // Background bingkai
    const drawBackground = () => {
      switch (selectedFrame) {
        case "memphis": {
          ctx.fillStyle = "#FFF4E8"
          ctx.fillRect(0, 0, W, H)
          const colors = ["#FF6BA5", "#5AE6B1", "#5B8CFF", "#FFC857"]
          ctx.save()
          ctx.globalAlpha = 0.08
          for (let y = 0; y < H; y += 10) {
            for (let x = 0; x < W; x += 10) {
              ctx.fillStyle = "#111827"
              ctx.beginPath()
              ctx.arc(x, y, (Math.sin(x * 0.03 + y * 0.02) + 1.5) * 0.6, 0, Math.PI * 2)
              ctx.fill()
            }
          }
          ctx.restore()
          const seedCount = Math.ceil((W * H) / 140000) * 28
          for (let i = 0; i < seedCount; i++) {
            const x = Math.random() * W
            const y = Math.random() * H
            const s = 10 + Math.random() * 50
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(Math.random() * Math.PI)
            const col = colors[i % colors.length]
            const t = i % 5
            if (t === 0) {
              ctx.fillStyle = col
              ctx.fillRect(-s * 0.5, -s * 0.2, s, s * 0.4)
            } else if (t === 1) {
              ctx.beginPath()
              ctx.fillStyle = col
              ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2)
              ctx.fill()
            } else if (t === 2) {
              ctx.beginPath()
              ctx.moveTo(-s * 0.5, s * 0.5)
              ctx.lineTo(0, -s * 0.5)
              ctx.lineTo(s * 0.5, s * 0.5)
              ctx.closePath()
              ctx.fillStyle = col
              ctx.fill()
            } else if (t === 3) {
              ctx.lineWidth = 3
              ctx.strokeStyle = col
              ctx.beginPath()
              for (let k = -s; k <= s; k += 6) {
                const yy = Math.sin(k / 6) * (s / 5.5)
                if (k === -s) ctx.moveTo(k, yy)
                else ctx.lineTo(k, yy)
              }
              ctx.stroke()
            } else {
              ctx.strokeStyle = col
              ctx.lineWidth = 4
              ctx.beginPath()
              ctx.moveTo(-s * 0.3, 0)
              ctx.lineTo(s * 0.3, 0)
              ctx.stroke()
            }
            ctx.restore()
          }
          break
        }
        case "neon": {
          ctx.fillStyle = "#0B0F19"
          ctx.fillRect(0, 0, W, H)
          ctx.save()
          const step = 48
          ctx.lineWidth = 1.25
          ctx.strokeStyle = "#06E2FF"
          ctx.shadowColor = "#06E2FF"
          ctx.shadowBlur = 12
          ctx.globalAlpha = 0.55
          for (let x = 0; x <= W; x += step) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, H)
            ctx.stroke()
          }
          for (let y = 0; y <= H; y += step) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(W, y)
            ctx.stroke()
          }
          ctx.globalAlpha = 0.35
          ctx.strokeStyle = "#FF3CAC"
          ctx.shadowColor = "#FF3CAC"
          ctx.shadowBlur = 8
          for (let d = -H; d < W; d += step * 4) {
            ctx.beginPath()
            ctx.moveTo(d, 0)
            ctx.lineTo(d + H, H)
            ctx.stroke()
          }
          ctx.restore()
          break
        }
        case "sunburst": {
          ctx.fillStyle = "#FDFCF8"
          ctx.fillRect(0, 0, W, H)
          const cx = W / 2
          const cy = H * 0.9
          const rays = 72
          for (let i = 0; i < rays; i++) {
            const a1 = (i / rays) * Math.PI * 2
            const a2 = ((i + 1) / rays) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(cx + Math.cos(a1) * H * 1.2, cy + Math.sin(a1) * H * 1.2)
            ctx.lineTo(cx + Math.cos(a2) * H * 1.2, cy + Math.sin(a2) * H * 1.2)
            ctx.closePath()
            ctx.fillStyle = i % 2 === 0 ? "#F9D873" : "#FFE7A3"
            ctx.fill()
          }
          const rg = ctx.createRadialGradient(cx, cy, H * 0.1, cx, cy, H * 1.0)
          rg.addColorStop(0, "rgba(255,255,255,0.5)")
          rg.addColorStop(1, "rgba(255,255,255,0.0)")
          ctx.fillStyle = rg
          ctx.fillRect(0, 0, W, H)
          break
        }
        case "checker": {
          const s = 54
          for (let y = 0; y < H; y += s) {
            const offset = Math.sin(y * 0.04) * 12
            for (let x = -s; x < W + s; x += s) {
              const odd = ((x + offset) / s + y / s) % 2 === 1
              ctx.fillStyle = odd ? "#B6FF00" : "#FF3CAC"
              ctx.fillRect(x + offset, y, s, s)
            }
          }
          ctx.globalAlpha = 0.08
          ctx.strokeStyle = "#111"
          for (let y = 0; y < H; y += 6) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(W, y)
            ctx.stroke()
          }
          ctx.globalAlpha = 1
          break
        }
        case "wavy": {
          ctx.fillStyle = "#F7F4F0"
          ctx.fillRect(0, 0, W, H)
          const bands = [
            { color: "#006D77", amp: 18, thick: 48, phase: 0 },
            { color: "#E29578", amp: 12, thick: 40, phase: 80 },
            { color: "#83C5BE", amp: 16, thick: 44, phase: 160 },
          ]
          bands.forEach((b, idx) => {
            ctx.fillStyle = b.color
            const baseY = (H / 5) * (idx + 1.2)
            ctx.beginPath()
            ctx.moveTo(0, baseY)
            for (let x = 0; x <= W; x += 10) {
              const y = baseY + Math.sin((x + b.phase) / 90) * b.amp
              if (x === 0) ctx.lineTo(0, y)
              else ctx.lineTo(x, y)
            }
            ctx.lineTo(W, baseY + b.thick)
            ctx.lineTo(0, baseY + b.thick)
            ctx.closePath()
            ctx.fill()
          })
          break
        }
        default: {
          ctx.fillStyle = "#F5F5F7"
          ctx.fillRect(0, 0, W, H)
        }
      }
    }

    drawBackground()

    // Panel konten
    const panelX = 60
    const panelY = 60
    const panelW = W - 120
    const panelH = H - 180
    const panelR = 40

    const panelColor =
      selectedFrame === "neon"
        ? "rgba(12,16,28,0.8)"
        : selectedFrame === "checker"
        ? "rgba(255,255,255,0.92)"
        : "rgba(255,255,255,0.98)"
    ctx.fillStyle = panelColor
    rr(panelX, panelY, panelW, panelH, panelR)
    ctx.fill()

    // Aksen panel
    if (selectedFrame === "neon") {
      ctx.save()
      ctx.shadowColor = "#06E2FF"
      ctx.shadowBlur = 20
      ctx.strokeStyle = "rgba(6,226,255,0.7)"
      ctx.lineWidth = 3
      rr(panelX, panelY, panelW, panelH, panelR)
      ctx.stroke()
      ctx.restore()
    } else if (selectedFrame === "memphis") {
      ctx.strokeStyle = "#111827"
      ctx.setLineDash([10, 6])
      ctx.lineWidth = 2
      rr(panelX, panelY, panelW, panelH, panelR)
      ctx.stroke()
      ctx.setLineDash([])
    } else if (selectedFrame === "wavy") {
      ctx.strokeStyle = "#2B2D42"
      ctx.lineWidth = 2
      rr(panelX, panelY, panelW, panelH, panelR)
      ctx.stroke()
    }

    // Grid foto
    const gap = 24
    const C = cols
    const R = rows
    const cellW = (panelW - gap * (C - 1) - 40) / C
    const cellH = (panelH - gap * (R - 1) - 40) / R

    let idx = 0
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (idx >= capturedPhotos.length) break
        const x = panelX + 20 + c * (cellW + gap)
        const y = panelY + 20 + r * (cellH + gap)

        ctx.save()
        rr(x, y, cellW, cellH, 24)
        ctx.clip()
        const bmp = bitmaps[idx] as CanvasImageSource
        ctx.drawImage(bmp, x, y, cellW, cellH)
        ctx.restore()

        ctx.lineWidth = 6
        if (selectedFrame === "checker") {
          ctx.strokeStyle = "#0F172A"
        } else if (selectedFrame === "neon") {
          ctx.strokeStyle = "rgba(6,226,255,0.9)"
          ctx.shadowColor = "#06E2FF"
          ctx.shadowBlur = 10
        } else if (selectedFrame === "memphis") {
          ctx.strokeStyle = "#FF6BA5"
        } else if (selectedFrame === "wavy") {
          ctx.strokeStyle = "#264653"
        } else if (selectedFrame === "sunburst") {
          ctx.strokeStyle = "#E76F51"
        } else {
          ctx.strokeStyle = "#D1D5DB"
        }
        rr(x, y, cellW, cellH, 24)
        ctx.stroke()
        idx++
      }
    }

    // Caption
    ctx.textAlign = "center"
    if (selectedFrame === "genz") {
      ctx.fillStyle = "#111827"
      ctx.font = "700 56px system-ui,-apple-system,Segoe UI,Roboto,Arial"
      ctx.fillText("Good Vibes Only", W / 2, H - 60)
    } else if (selectedFrame === "aesthetic") {
      ctx.fillStyle = "#111827"
      ctx.font = '300 48px "Segoe UI",Roboto,Arial'
      ctx.fillText("memories captured", W / 2, H - 60)
    } else if (selectedFrame === "neon") {
      ctx.fillStyle = "#06E2FF"
      ctx.shadowColor = "#06E2FF"
      ctx.shadowBlur = 14
      ctx.font = "800 54px system-ui,-apple-system,Segoe UI,Roboto,Arial"
      ctx.fillText("Night City Pulse", W / 2, H - 60)
      ctx.shadowBlur = 0
    } else if (selectedFrame === "memphis") {
      ctx.fillStyle = "#111827"
      ctx.font = "800 52px system-ui,-apple-system,Segoe UI,Roboto,Arial"
      ctx.fillText("Memphis Pop Mood", W / 2, H - 60)
    } else if (selectedFrame === "sunburst") {
      ctx.fillStyle = "#8A5A00"
      ctx.font = "700 50px system-ui,-apple-system,Segoe UI,Roboto,Arial"
      ctx.fillText("Golden Hour Burst", W / 2, H - 60)
    } else if (selectedFrame === "checker") {
      ctx.fillStyle = "#111827"
      ctx.font = "900 50px system-ui,-apple-system,Segoe UI,Roboto,Arial"
      ctx.fillText("Acid Check", W / 2, H - 60)
    } else if (selectedFrame === "wavy") {
      ctx.fillStyle = "#1D3557"
      ctx.font = "700 50px system-ui,-apple-system,Segoe UI,Roboto,Arial"
      ctx.fillText("Wavy Safari", W / 2, H - 60)
    }

    return canvas.toDataURL("image/png")
  }, [capturedPhotos, selectedFrame, selectedGrid])

  useEffect(() => {
    if (step !== "preview") return
    ;(async () => setFinalDataUrl(await buildFinalImage()))()
  }, [step, buildFinalImage])

  const sendEmail = async () => {
    if (!email) return alert("Masukkan email terlebih dahulu")
    if (!finalDataUrl) return alert("Preview belum siap. Tunggu sebentar lalu coba lagi.")

    setSending(true)
    try {
      const res = await fetch("/api/send-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          finalImage: finalDataUrl,
          meta: { grid: selectedGrid, frame: selectedFrame },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      alert("Foto berhasil dikirim!")
      resetAll()
    } catch (e) {
      console.error(e)
      alert("Gagal mengirim email.")
    } finally {
      setSending(false)
    }
  }

  const resetAll = () => {
    setCapturedPhotos([])
    setCurrentPhotoIndex(0)
    setEmail("")
    setFinalDataUrl(null)
    setStep("grid")
    if (stream) stopCamera()
  }

  const Stepper = () => {
    const steps: Array<{ key: typeof step; label: string }> = [
      { key: "grid", label: "Pilih Grid" },
      { key: "frame", label: "Pilih Bingkai" },
      { key: "capture", label: "Ambil Foto" },
      { key: "preview", label: "Preview & Kirim" },
    ]
    const activeIndex = steps.findIndex((s) => s.key === step)
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {steps.map((s, i) => {
            const active = i === activeIndex
            return (
              <div key={s.key} className="flex items-center gap-2">
                <Badge
                  variant={active ? "default" : "secondary"}
                  className={active ? "bg-primary text-primary-foreground" : ""}
                >
                  {i + 1}
                </Badge>
                <span className={`text-sm md:text-base ${active ? "font-semibold" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <Separator className="mx-2 w-8 md:w-16" />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const GridOption = ({ num }: { num: GridType }) => {
    const active = selectedGrid === num
    return (
      <Card
        role="button"
        aria-pressed={active}
        onClick={() => setSelectedGrid(num)}
        className={`transition hover:shadow-md focus-visible:ring-2 ${active ? "ring-2 ring-primary" : ""}`}
      >
        <CardContent className="p-4">
          <div className={`grid ${getGridLayoutTailwind()} gap-1 mx-auto w-20 h-20`}>
            {Array.from({ length: num }).map((_, i) => (
              <div key={i} className="rounded-md bg-muted" />
            ))}
          </div>
          <div className="mt-3 text-center text-sm font-medium">{num} Foto</div>
        </CardContent>
      </Card>
    )
  }

  const FrameOption = ({ frame, title, subtitle }: { frame: FrameType; title: string; subtitle: string }) => {
    const active = selectedFrame === frame
    return (
      <Card
        role="button"
        aria-pressed={active}
        onClick={() => setSelectedFrame(frame)}
        className={`transition hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
      >
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{subtitle}</CardContent>
      </Card>
    )
  }

  const frames: Array<{ id: FrameType; title: string; subtitle: string }> = [
    { id: "genz", title: "Gen-Z Vibes", subtitle: "Cerah dan playful." },
    { id: "aesthetic", title: "Aesthetic", subtitle: "Pastel lembut, minimal." },
    { id: "memphis", title: "Memphis Pop", subtitle: "Geometri pop, corak non-mainstream." },
    { id: "neon", title: "Neon Abyss", subtitle: "Grid bercahaya, aksen magenta." },
    { id: "sunburst", title: "Golden Sunburst", subtitle: "Ledakan sinar retro hangat." },
    { id: "checker", title: "Acid Checker Warp", subtitle: "Kotak asam dengan distorsi." },
    { id: "wavy", title: "Wavy Safari", subtitle: "Gelombang organik berlapis." },
  ]

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-balance text-2xl md:text-3xl font-semibold">Photobooth</h1>
            <p className="text-sm text-muted-foreground">Ambil momen terbaikmu dalam beberapa langkah.</p>
          </div>
          <Badge variant="outline" className="self-start md:self-auto">
            Beta
          </Badge>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="mb-6">
          <Stepper />
        </div>

        {step === "grid" && (
          <Card className="animate-in fade-in duration-300">
            <CardHeader>
              <CardTitle className="text-xl">Pilih Grid Foto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {([1, 2, 3, 4, 5, 6] as GridType[]).map((n) => (
                  <GridOption key={n} num={n} />
                ))}
              </div>

              <div className="mt-6">
                <Button className="w-full" onClick={handleNext}>
                  Lanjut
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "frame" && (
          <Card className="animate-in fade-in duration-300">
            <CardHeader>
              <CardTitle className="text-xl">Pilih Bingkai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {frames.map((f) => (
                  <FrameOption key={f.id} frame={f.id} title={f.title} subtitle={f.subtitle} />
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setStep("grid")}>
                  Kembali
                </Button>
                <Button onClick={handleNext}>Mulai Foto</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "capture" && (
          <Card className="animate-in fade-in duration-300">
            <CardHeader>
              <CardTitle className="text-xl">
                Foto {currentPhotoIndex + 1} dari {selectedGrid}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg overflow-hidden border bg-card">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                  style={{ transform: "scaleX(-1)" }}
                  aria-label="Pratinjau Kamera"
                />
                {countdown !== null && (
                  <div className="absolute inset-0 grid place-items-center bg-black/50">
                    <div className="text-primary-foreground text-7xl md:text-8xl font-bold">{countdown}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    stopCamera()
                    setStep("frame")
                  }}
                >
                  Batal
                </Button>
                <Button onClick={startCountdown} disabled={countdown !== null}>
                  {countdown !== null ? "Bersiap..." : "Ambil Foto"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <Card className="animate-in fade-in duration-300">
            <CardHeader>
              <CardTitle className="text-xl">Preview Hasil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                {finalDataUrl ? (
                  <NextImage
                    src={finalDataUrl}
                    alt="Preview hasil compositing"
                    width={1600}
                    height={1200}
                    unoptimized
                    className="w-full rounded-lg border h-auto"
                  />
                ) : (
                  <div className="w-full h-64 rounded-lg bg-muted grid place-items-center text-muted-foreground">
                    Merakit preview…
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email untuk menerima foto</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={resetAll}>
                  Foto Ulang
                </Button>
                <Button onClick={sendEmail} disabled={sending || !email || !finalDataUrl}>
                  {sending ? "Mengirim…" : "Kirim Email"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}
