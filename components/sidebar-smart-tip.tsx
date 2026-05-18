"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TIP_ROTATION_INTERVAL_MS = 7000;

type SidebarSmartTipMenuItem = {
  href: string;
  label: string;
};

export function SidebarSmartTip({
  pathname,
  menus,
}: {
  pathname: string;
  menus: SidebarSmartTipMenuItem[];
}) {
  const [rotation, setRotation] = useState({ key: "", index: 0 });
  const allowedHrefs = useMemo(() => new Set(menus.map((menu) => menu.href)), [menus]);
  const tips = useMemo(() => getSmartTips(pathname, allowedHrefs), [pathname, allowedHrefs]);
  const tipsKey = tips.join("|");
  const activeTipIndex = rotation.key === tipsKey ? rotation.index % tips.length : 0;
  const activeTip = tips[activeTipIndex] || tips[0];

  useEffect(() => {
    if (tips.length <= 1) return;

    const interval = window.setInterval(() => {
      setRotation((current) => ({
        key: tipsKey,
        index: current.key === tipsKey ? (current.index + 1) % tips.length : 1 % tips.length,
      }));
    }, TIP_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [tips.length, tipsKey]);

  return (
    <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/20 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            Panduan
          </Badge>
          <Lightbulb className="size-3.5 text-sidebar-foreground/60" />
        </div>
        {tips.length > 1 ? (
          <div aria-label={`Tip ${activeTipIndex + 1} dari ${tips.length}`} className="flex items-center gap-1">
            {tips.map((tip, index) => (
              <span
                key={tip}
                className={`size-1.5 rounded-full transition-colors duration-300 ${
                  index === activeTipIndex ? "bg-sidebar-foreground/70" : "bg-sidebar-foreground/20"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <p key={activeTip} className="min-h-10 text-[11px] leading-relaxed text-sidebar-foreground/70 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        {activeTip}
      </p>
    </div>
  );
}

function getSmartTips(pathname: string, allowedHrefs: Set<string>) {
  if (pathname.startsWith("/dashboard") && allowedHrefs.has("/dashboard")) {
    if (allowedHrefs.has("/requests")) {
      return [
        "Tab Overview merangkum Region, POP, dan Device sebelum masuk KPI workflow.",
        "Gunakan tab Device untuk membaca komposisi asset, status device, dan validasi ODP.",
        "Pindah ke KPI & Workflow saat perlu review request, issue ODP, atau audit activity.",
      ];
    }

    return [
      "Tab Overview membantu membaca scope region, POP, dan ODP sebelum validasi lapangan.",
      "Gunakan tab Device untuk melihat status ODP dan distribusi validasi.",
      "Pindah ke KPI & Workflow untuk membuka tugas validasi dan rejected submission.",
    ];
  }

  if (pathname.startsWith("/requests") && allowedHrefs.has("/requests")) {
    return [
      "Review request sesuai tahap approval aktif sebelum perubahan masuk data utama.",
      "Cek perbedaan field, lampiran, dan catatan reviewer sebelum approve atau reject.",
      "Gunakan Audit Trail jika perlu memastikan sumber perubahan dan waktu aksi.",
    ];
  }

  if (pathname.startsWith("/data-management/list/odp") && allowedHrefs.has("/data-management/list/odp")) {
    return [
      "Gunakan filter POP untuk membatasi ODP sesuai titik interkoneksi yang sedang diaudit.",
      "Pastikan tipe ODP dan jenis instalasi sudah sesuai format data terbaru.",
      "Gunakan histori validasi untuk membaca evidence dan keputusan reviewer terakhir.",
    ];
  }

  if (pathname.startsWith("/data-management/list/") && allowedHrefs.has("/data-management")) {
    return [
      "Gunakan filter POP untuk melihat device berdasarkan titik interkoneksi operasional.",
      "Kombinasikan pencarian, region scope, dan POP agar audit device lebih presisi.",
      "Jika data kosong, reset filter atau cek apakah device memang belum terhubung ke POP tersebut.",
    ];
  }

  if (pathname.startsWith("/field/odp")) {
    return [
      "Lengkapi section validasi dari kiri ke kanan, lalu cek Review & Submit.",
      "Foto awal dan checklist kondisi menjadi evidence utama untuk request validasi.",
      "Jika request ditolak, baca catatan reviewer sebelum melakukan resubmit.",
    ];
  }

  if (pathname.startsWith("/audit-trail") && allowedHrefs.has("/audit-trail")) {
    return [
      "Gunakan Audit Trail untuk melacak perubahan data, reviewer, dan waktu aksi.",
      "Filter berdasarkan asset atau aktivitas saat perlu investigasi perubahan spesifik.",
      "Bandingkan timestamp audit dengan histori validasi untuk konteks approval.",
    ];
  }

  if (pathname.startsWith("/trash") && allowedHrefs.has("/trash")) {
    return [
      "Pulihkan data hanya jika record masih valid dan relasinya sudah diverifikasi.",
      "Cek relasi asset sebelum restore agar data utama tetap konsisten.",
      "Gunakan pencarian untuk memastikan record yang dipulihkan adalah data yang tepat.",
    ];
  }

  if (pathname.startsWith("/maps") && allowedHrefs.has("/maps")) {
    return [
      "Gunakan Maps untuk membaca sebaran asset dan konteks lokasi di lapangan.",
      "Validasi koordinat membantu memastikan asset tampil pada area operasional yang benar.",
      "Cek layer peta sesuai kebutuhan inspeksi atau monitoring jaringan.",
    ];
  }

  if (allowedHrefs.has("/requests")) {
    return [
      "Pantau Requests untuk memastikan perubahan asset selesai direview tepat waktu.",
      "Prioritaskan request yang menunggu role aktif agar queue tidak menumpuk.",
      "Buka detail request untuk membaca perubahan teknis sebelum mengambil keputusan.",
    ];
  }

  if (allowedHrefs.has("/data-management/list/odp")) {
    return [
      "Gunakan List ODP untuk cek detail, histori validasi, dan status port.",
      "Buka detail ODP untuk melihat format identity dan evidence terbaru.",
      "Pastikan status port konsisten dengan hasil validasi lapangan.",
    ];
  }

  return [
    "Buka Asset Overview untuk ringkasan aset dan aksi sesuai role akun.",
    "Gunakan menu yang tersedia sesuai role untuk menjaga workflow tetap terkontrol.",
    "Cek data utama sebelum membuat perubahan pada asset operasional.",
  ];
}
