// app/api/send-photo/route.ts
import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, finalImage, meta } = (await request.json()) as {
      email?: string;
      finalImage?: string;
      meta?: { grid?: number; frame?: "genz" | "aesthetic" | "memphis" | "neon" | "sunburst" | "checker" | "wavy" };
    };

    if (!email || !finalImage) {
      return NextResponse.json(
        { success: false, message: "Email dan gambar final wajib" },
        { status: 400 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();

    // ambil base64 murni
    let base64: string | undefined = finalImage;
    if (typeof base64 === "string" && base64.includes("base64,")) {
      base64 = base64.split("base64,")[1];
    }
    if (!base64) {
      return NextResponse.json(
        { success: false, message: "Final image kosong" },
        { status: 400 },
      );
    }

    const frameText =
      meta?.frame === "genz"
        ? "Gen-Z Vibes ✨ (Colorful & Playful)"
        : meta?.frame === "aesthetic"
          ? "Aesthetic 🌸 (Pastel Kawaii)"
          : meta?.frame
            ? meta.frame
            : "-";

    const cid = "photobooth_final_image";

    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body{margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial}
    .wrap{max-width:640px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.12)}
    .head{padding:24px 24px 0;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
    h1{margin:0 0 8px;font-size:24px}
    .meta{padding:12px 24px;background:#eef2ff;color:#374151}
    .imgbox{padding:16px 16px 0}
    .imgbox img{width:100%;height:auto;border-radius:14px;display:block}
    .footer{padding:24px;color:#6b7280;text-align:center;border-top:1px solid #eee}
    .pill{display:inline-block;padding:6px 10px;border-radius:9999px;background:#f3e8ff;color:#7c3aed;font-weight:700;margin-right:6px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1>✨ Foto Photobooth Kamu Siap!</h1>
      <div>Terima kasih sudah menggunakan <b>Photobooth Kekinian</b></div>
    </div>
    <div class="meta">
      <span class="pill">Grid: ${meta?.grid ?? "-"}</span>
      <span class="pill">Frame: ${frameText}</span>
      <span class="pill">${new Date().toLocaleDateString("id-ID",{ day:"2-digit", month:"long", year:"numeric" })}</span>
    </div>
    <div class="imgbox">
      <img src="cid:${cid}" alt="Photobooth Result"/>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Photobooth Kekinian — Made with ❤️ by <b>Tegesoftware</b>
    </div>
  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Photobooth Kekinian" <tegesoftware@gmail.com>',
      to: email,
      subject: `📸 Hasil Photobooth Kamu (Grid ${meta?.grid ?? "-"})`,
      html,
      text: `Hasil photobooth terlampir (grid ${meta?.grid ?? "-"}) — frame ${frameText}.`,
      attachments: [
        { filename: "photobooth-final.png", content: base64, encoding: "base64", cid },
      ],
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Gagal kirim";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "OK", at: new Date().toISOString() });
}
