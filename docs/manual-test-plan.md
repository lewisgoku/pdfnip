# PDFNip — Manual Test Plan

## General (test on every page)
- [ ] Page loads without console errors
- [ ] Navbar shows correct active link
- [ ] Mobile layout works at 375px width (browser devtools)
- [ ] Drop zone accepts a PDF via drag-and-drop
- [ ] Drop zone accepts a PDF via click-to-browse
- [ ] Non-PDF file shows correct error, stays on idle
- [ ] File over 100MB shows "File is too large" error

---

## Compress PDF `/compress`
- [ ] Drop a text PDF → ready state shows filename + size
- [ ] Select Low → compress → output is smaller than input → saving % > 0
- [ ] Select Medium → compress → output is smaller than input
- [ ] Select High → compress → output is smaller than input
- [ ] Output card shows: Original size, Compressed size, Saving %, Quality label, filename
- [ ] Download filename format: `{filename}_low_compressPDF_pdfnip.com.pdf`
- [ ] Downloaded file opens correctly in a PDF viewer
- [ ] "Compress another PDF" resets to idle
- [ ] Drop an image-heavy/scanned PDF → verify meaningful compression

---

## Merge PDF `/merge`
- [ ] Drop 2 PDFs → both appear in file list
- [ ] Drag to reorder files → order changes
- [ ] Remove a file → it disappears from list
- [ ] Click Merge → merged PDF downloads
- [ ] Downloaded file contains pages from both PDFs in correct order
- [ ] Drop 1 file → Merge button disabled (need at least 2)
- [ ] Drop 11 files → 11th file rejected with error
- [ ] "Merge another" resets to idle

---

## Split PDF `/split`
- [ ] Drop a multi-page PDF → ready state
- [ ] **Page range mode** — enter `1-2` → ZIP downloads with 1 PDF containing pages 1–2
- [ ] **Every N pages mode** — enter `1` → ZIP has one PDF per page
- [ ] **All pages mode** → ZIP has one PDF per page
- [ ] Invalid range (e.g. `99` on a 3-page PDF) → error shown
- [ ] Downloaded ZIP opens and each PDF inside is valid
- [ ] "Split another" resets to idle

---

## Extract Pages `/extract`
- [ ] Drop a multi-page PDF → page count displayed
- [ ] Enter valid range (e.g. `1,3`) → extracted PDF downloads with only those pages
- [ ] Enter out-of-range page → error shown
- [ ] Enter invalid input (e.g. `abc`) → error shown
- [ ] Downloaded PDF opens correctly
- [ ] "Extract another" resets to idle

---

## Rotate PDF `/rotate`
- [ ] Drop a PDF → ready state
- [ ] Click 90° CW → apply → all pages rotated correctly in download
- [ ] Click 180° → apply → all pages rotated correctly
- [ ] Click 90° CCW → apply → all pages rotated correctly
- [ ] Downloaded file opens and rotation is visible
- [ ] "Rotate another" resets to idle

---

## Convert `/convert`

### PDF → Images
- [ ] Select "PDF → Images" direction
- [ ] Drop a PDF → ready state
- [ ] Select JPG + Low → convert → ZIP downloads with `.jpg` files
- [ ] Select PNG → convert → ZIP downloads with `.png` files
- [ ] Images inside ZIP open correctly
- [ ] "Convert another" resets to idle

### Images → PDF
- [ ] Select "Images → PDF" direction
- [ ] Drop 2–3 JPG/PNG files → file list appears
- [ ] Drag to reorder → order changes
- [ ] Select A4 page size → convert → PDF downloads
- [ ] PDF opens and images are in correct order
- [ ] Drop a non-image file → error shown
- [ ] "Convert another" resets to idle

---

## Unlock PDF `/unlock-pdf`
- [ ] Drop an **unprotected** PDF → auto-unlocks, download appears immediately
- [ ] Drop a **password-protected** PDF → password field appears
- [ ] Enter correct password → unlocks, download appears
- [ ] Enter wrong password → "Incorrect password" error
- [ ] Downloaded file opens without a password prompt
- [ ] "Unlock another PDF" resets to idle

---

## Protect PDF `/protect-pdf`
- [ ] Drop a PDF → ready state with password fields + 3 permission checkboxes
- [ ] All 3 checkboxes checked by default
- [ ] Leave password empty → Protect button disabled
- [ ] Enter mismatched passwords → button disabled + error shown
- [ ] Enter matching passwords → button enabled
- [ ] Click Protect → done state with download link
- [ ] Download filename: `{filename}-protected.pdf`
- [ ] Open downloaded PDF in viewer → password prompt appears
- [ ] Enter correct password → PDF opens
- [ ] Uncheck "Allow printing" → protect → open in Adobe/Preview → verify printing is restricted
- [ ] "Protect another PDF" resets to idle

---

## Home Page `/`
- [ ] All 8 tool cards visible in 4-column grid on desktop
- [ ] All 8 tool cards in 2-column grid on mobile
- [ ] Each card links to the correct tool page
- [ ] Counter shows `1,000+ PDFs processed`
- [ ] "How it works" section visible below cards

---

## Cross-cutting
- [ ] No tool uploads anything (check Network tab in devtools — no POST requests)
- [ ] All pages have correct `<title>` tags
- [ ] Sitemap accessible at `https://pdfnip.com/sitemap.xml`
- [ ] `/pdf-to-images` redirects to `/convert`
- [ ] `/images-to-pdf` redirects to `/convert`
