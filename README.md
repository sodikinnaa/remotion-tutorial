# Remotion Tutorial

Landing page tutorial statis yang **dapat dipakai ulang**. Semua konten (judul, langkah, screenshot, tips, FAQ) ditulis di file JSON, lalu dirender oleh satu template HTML tanpa proses build. Cocok dihosting di GitHub Pages.

Tutorial pertama: **Dari Ide sampai Reels Siap Tayang** (ReelForge: Colab → ChatGPT → Cartesia → Claude → render MP4).

## Struktur

```
docs/                              # root situs (dipublikasikan GitHub Pages)
  index.html                       # daftar semua tutorial
  tutorial.html                    # template halaman tutorial (baca ?t=<slug>)
  assets/site.css                  # tema (dark/light), layout, print
  assets/tutorial.js               # renderer: hero, alur, kebutuhan, TOC, langkah, lightbox, progres
  assets/index.js                  # renderer halaman indeks
  tutorials/index.json             # registri tutorial + info situs
  tutorials/<slug>/tutorial.json   # konten satu tutorial
  tutorials/<slug>/images/         # screenshot (WebP, lebar 1400px)
  .nojekyll                        # matikan Jekyll, sajikan file apa adanya
.github/workflows/pages.yml        # deploy manual lewat Actions (opsional)
```

## Menjalankan secara lokal

Halaman memuat JSON lewat `fetch`, jadi buka lewat server statis, bukan `file://`:

```bash
npx serve docs
```

lalu buka `http://localhost:3000`.

## Menambah tutorial baru

1. Salin folder `docs/tutorials/remotion-reelforge/` menjadi `docs/tutorials/<slug-baru>/`.
2. Ganti isi `tutorial.json` dan screenshot di folder `images/`.
3. Daftarkan slug baru di `docs/tutorials/index.json`:

```json
{
  "slug": "slug-baru",
  "title": "Judul tutorial",
  "summary": "Ringkasan satu kalimat.",
  "level": "Pemula",
  "duration": "± 20 menit",
  "cover": "images/cover.webp",
  "tags": ["Remotion"]
}
```

Halaman tutorial bisa dibuka di `tutorial.html?t=slug-baru`.

## Skema `tutorial.json`

| Field | Keterangan |
| --- | --- |
| `title`, `subtitle`, `eyebrow` | Teks hero. |
| `level`, `duration`, `updated`, `tags` | Chip meta di hero. |
| `hero_image` | Gambar hero, relatif terhadap folder tutorial. |
| `pipeline[]` | Kartu alur produksi: `label`, `name`, `desc`. |
| `requirements[]` | Yang dibutuhkan: `name`, `note`, `url` (opsional). |
| `sections[]` | Bagian dengan `id`, `title`, `intro`, dan `steps[]`. |
| `steps[]` | Satu langkah: `title`, `text` (boleh HTML), `images[]` (`src`, `caption`, `alt`), `code`, `tip`, `note`, `warning`. |
| `result` | Hasil akhir: `title`, `text`, `image`. |
| `faq[]` | Pertanyaan umum: `q`, `a`. |

Langkah dinomori otomatis lintas bagian. Setiap langkah punya tombol **Tandai selesai** yang disimpan di `localStorage`, dan setiap gambar bisa diperbesar (lightbox dengan navigasi keyboard).

## Mengompresi screenshot

Simpan screenshot sebagai WebP lebar 1400px agar halaman ringan:

```bash
python3 -c "from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert('RGB'); w,h=im.size; im=im.resize((1400, round(h*1400/w))) if w>1400 else im; im.save(sys.argv[2],'WEBP',quality=80,method=6)" input.png output.webp
```

## Deploy ke GitHub Pages

Situs dipublikasikan dari folder `docs/` di branch `main`: **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/docs`. Setiap push ke `main` otomatis diterbitkan oleh GitHub.

Alamat situs: https://sodikinnaa.github.io/remotion-tutorial/

Workflow `.github/workflows/pages.yml` disediakan sebagai alternatif jika *Source* diganti ke **GitHub Actions** (lihat komentar di dalam file).
