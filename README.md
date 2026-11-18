# CutiPedia

Aplikasi web 100% *client-side* untuk membantu pekerja di Indonesia (Swasta maupun ASN) memaksimalkan hari libur panjang (*long weekend*) dengan mengambil jatah cuti tahunan seminimal mungkin berdasarkan data resmi **SKB 3 Menteri**.

## Fitur Utama

- **Profil Kerja Fleksibel:** Pengaturan tahun, sisa jatah cuti tahunan (`1`–`24` hari), pola hari kerja (`5 hari: Sen–Jum` atau `6 hari: Sen–Sab`), serta status kepegawaian (`Swasta - Potong Cuti Bersama`, `Swasta - Tidak Memotong`, `ASN`).
- **Optimasi *Gap Finder*:** Mendeteksi celah hari kerja (*harpitnas*) berdurasi 1–3 hari yang diapit libur nasional/akhir pekan dan mengurutkannya berdasarkan rasio efisiensi tertinggi.
- **Kalender Interaktif:** Visualisasi tahunan berbasis `VCalendar` dengan kode warna Merah (Libur Nasional), Kuning (Cuti Bersama), dan Hijau (Saran Cuti), lengkap dengan mode terang & gelap.
- **Ekspor & Berbagi Tanpa Backend:** Unduh rencana ke file `.ics`, tambah paket langsung ke Google Calendar, serta salin *shareable URL* (`?year=...&cuti=...`).

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

## Pengujian & Build Produksi

```bash
npm test      # Menjalankan unit test dengan Vitest
npm run build # Menghasilkan bundle statis di folder dist/
```

## Pemeliharaan Data Tahunan (`src/data/holidays.json`)

1. Cek pengumuman resmi SKB 3 Menteri di situs Kemenko PMK setiap akhir September / awal Oktober.
2. Tambahkan objek tahun baru ke `src/data/holidays.json` dengan memisahkan `libur_nasional` dan `cuti_bersama`.
3. Jalankan `npm test` dan `npm run build` sebelum `git commit` dan `git push`.

## Deploy Statis Gratis

Proyek ini menghasilkan file statis murni di `dist/` sehingga siap di-deploy ke **Cloudflare Pages**, **Vercel**, atau **GitHub Pages**:

- **Build command:** `npm run build`
- **Output directory:** `dist`
