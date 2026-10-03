#!/usr/bin/env python3
"""Entfernt die weisse Schrift und den QR-Code aus dem Flyer-Foto (Retusche per Inpainting).
Ergebnis: assets/flyer_clean.png. Nur das echte Foto wird bearbeitet, es wird nichts erzeugt."""
import cv2, numpy as np, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
img = cv2.imread(os.path.join(ROOT, 'assets/flyer.png'))
H, W = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
# dünne helle Strukturen (Schrift) per Top-Hat, dazu fast reines Weiss
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45))
th = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, k)
mask = ((th > 38) | (img.min(axis=2) > 232)).astype(np.uint8) * 255
# QR-Code samt weisser Fläche (Flyer-Koordinaten)
sx, sy = W / 1240.0, H / 1748.0
x0, y0, x1, y1 = [int(v) for v in (965 * sx, 1320 * sy, 1190 * sx, 1580 * sy)]
mask[y0:y1, x0:x1] = 255
mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
cv2.imwrite(os.path.join(ROOT, 'build/flyer_mask.png'), mask)
out = cv2.inpaint(img, mask, 9, cv2.INPAINT_TELEA)
# Inpainting-Flächen leicht weichzeichnen, damit sie dem unscharfen Foto entsprechen
blur = cv2.GaussianBlur(out, (0, 0), 7)
m = cv2.GaussianBlur(mask, (0, 0), 5).astype(np.float32)[..., None] / 255.0
out = (out * (1 - m) + blur * m).astype(np.uint8)
cv2.imwrite(os.path.join(ROOT, 'assets/flyer_clean.png'), out)
print('Maske deckt', round(100 * (mask > 0).mean(), 1), '% des Bildes')
