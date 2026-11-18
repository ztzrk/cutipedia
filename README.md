# CutiPedia

Aplikasi web 100% *client-side* (tanpa backend dan tanpa penyimpanan data di server) untuk membantu pekerja di Indonesia (Swasta maupun ASN) memaksimalkan hari libur panjang (*long weekend*) dengan mengambil jatah cuti tahunan seminimal mungkin berdasarkan data resmi **SKB 3 Menteri**.

**Live App:** https://cutipedia.vercel.app/

## Fitur Utama

- **Profil Kerja & Jatah Cuti (*Sticky Right Sidebar*):** Pengaturan tahun kalender (`2026`, `2027`, dan simulasi tahun berikutnya), sisa jatah cuti tahunan (`1`–`24` hari), pola hari kerja (`5 Hari: Sen–Jum` atau `6 Hari: Sen–Sab`), serta status kepegawaian (`Swasta - Potong Cuti Bersama`, `Swasta - Tidak Memotong`, `ASN`).
- **Mesin Optimasi *Gap Finder*:** Memetakan seluruh hari dalam setahun (`365`/`366` hari), mendeteksi celah hari kerja (*harpitnas*) berdurasi `1`–`3` hari yang diapit blok libur, dan mengurutkannya berdasarkan rasio efisiensi tertinggi tanpa pernah melebihi sisa jatah cuti.
- **Kustomisasi Rencana & *Long Weekend* Alami:** Pengguna dapat menyetel ulang atau memilih/membatalkan paket rekomendasi secara manual dengan pembaruan metrik langsung (*live*), serta melihat daftar *long weekend* alami tanpa mengambil cuti.
- **Halaman Khusus Kalender Libur (`#/kalender`):** Visualisasi interaktif berbasis `VCalendar` (responsif `1`–`3` kolom) dengan kode warna **Merah** (Libur Nasional), **Kuning** (Cuti Bersama), dan **Hijau** (Saran Cuti), lengkap dengan daftar tanggal resmi SKB dan mode terang/gelap (*localStorage* via VueUse).
- **Ekspor & Berbagi Tanpa Backend:**
  - Unduh jadwal cuti terpilih dalam format `.ics` (standar RFC 5545).
  - Tautan **Google Calendar** langsung pada setiap paket rekomendasi.
  - Tombol **Salin Link** (*shareable URL* dengan parameter `?year=...&quota=...&pattern=...&status=...&cuti=...`).

## Tech Stack

- **Framework:** Vue 3 + Vite
- **UI & Komponen:** Naive UI + Lucide Vue (`lucide-vue-next`)
- **Kalender & Tanggal:** VCalendar v3 + Day.js (`locale: id`)
- **Utilitas & Animasi:** `@vueuse/core` + `@formkit/auto-animate`
- **Pengujian:** Vitest

## Struktur Proyek

```text
├── .github/workflows/ci.yml
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── BrandLogo.vue
│   │   ├── CalendarBoard.vue
│   │   ├── FilterBar.vue
│   │   ├── RecommendationList.vue
│   │   └── SummaryStats.vue
│   ├── composables/
│   │   ├── __tests__/
│   │   │   ├── useCalendarExport.spec.js
│   │   │   └── useCutiOptimizer.spec.js
│   │   ├── useCalendarExport.js
│   │   └── useCutiOptimizer.js
│   ├── data/
│   │   └── holidays.json
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

## Pengujian & Build Produksi

```bash
npm test      # Menjalankan unit test dengan Vitest
npm run build # Menghasilkan bundle statis di folder dist/
npm run preview
```

## Pemeliharaan Data Tahunan (`src/data/holidays.json`)

1. Cek pengumuman resmi SKB 3 Menteri di situs Kemenko PMK setiap akhir September / awal Oktober.
2. Tambahkan objek tahun baru ke `src/data/holidays.json` dengan memisahkan `libur_nasional` dan `cuti_bersama`.
3. Jalankan `npm test` dan `npm run build` sebelum `git commit` dan `git push`.

## CI/CD & Deploy ke Vercel

- **Produksi:** https://cutipedia.vercel.app/
- **GitHub Actions CI:** Setiap `push` dan `pull_request` ke branch `main` otomatis menjalankan `npm ci`, `npm test`, dan `npm run build` melalui [ci.yml](.github/workflows/ci.yml).
- **Deploy via Vercel:**
  1. Repositori `ztzrk/cutipedia` terhubung ke Vercel dan otomatis membaca konfigurasi Vite dari [vercel.json](vercel.json) (`npm run build` → `dist`).
  2. Setiap `git push` ke `main` otomatis ter-deploy ke https://cutipedia.vercel.app/ (dan PR mendapatkan *preview deployment*).
