import os
from PIL import Image, ImageDraw

def render_logo(size=512, is_maskable=False, is_monochrome=False):
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))

    def s(val):
        return int(val * (size / 512.0) * scale)

    margin = 0 if is_maskable else s(28)
    corner_radius = 0 if is_maskable else s(108)

    # 1. Background Gradient (Vibrant Warm Tangerine to Amber Orange)
    if not is_monochrome:
        bg = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        bg_draw = ImageDraw.Draw(bg)
        
        # Linear gradient: amber-500 (#F59E0B) to warm orange (#EA580C) to deep amber (#C2410C)
        for y in range(canvas_size):
            t = y / float(canvas_size)
            r = int(245 + t * (194 - 245))
            g = int(158 + t * (65 - 158))
            b = int(11 + t * (12 - 11))
            bg_draw.line([(0, y), (canvas_size, y)], fill=(r, g, b, 255))
        
        mask = Image.new("L", (canvas_size, canvas_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        if is_maskable:
            mask_draw.rectangle([0, 0, canvas_size, canvas_size], fill=255)
        else:
            mask_draw.rounded_rectangle(
                [margin, margin, canvas_size - margin, canvas_size - margin],
                radius=corner_radius,
                fill=255
            )
        img.paste(bg, (0, 0), mask)

        # Subtle elegant inner border
        if not is_maskable and corner_radius > 0:
            highlight = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
            h_draw = ImageDraw.Draw(highlight)
            h_draw.rounded_rectangle(
                [margin + s(3), margin + s(3), canvas_size - margin - s(3), canvas_size - margin - s(3)],
                radius=corner_radius - s(3),
                outline=(255, 255, 255, 60),
                width=s(3)
            )
            img = Image.alpha_composite(img, highlight)

    # 2. Cloche & Speed Shapes
    shape_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shape_layer)
    white = (255, 255, 255, 255)

    # Knob
    knob_cx = s(285)
    knob_cy = s(160)
    knob_r = s(22)
    s_draw.ellipse([knob_cx - knob_r, knob_cy - knob_r, knob_cx + knob_r, knob_cy + knob_r], fill=white)
    # Knob neck
    s_draw.rounded_rectangle([knob_cx - s(9), knob_cy + s(14), knob_cx + s(9), knob_cy + s(30)], radius=s(4), fill=white)

    # Cloche Dome
    dome_cx = s(285)
    dome_w = s(116)
    dome_top = s(185)
    dome_bottom = s(295)
    s_draw.pieslice([dome_cx - dome_w, dome_top, dome_cx + dome_w, dome_bottom + (dome_bottom - dome_top)], 180, 360, fill=white)

    # Tray
    tray_left = s(142)
    tray_right = s(420)
    tray_top = s(312)
    tray_bottom = s(338)
    s_draw.rounded_rectangle([tray_left, tray_top, tray_right, tray_bottom], radius=s(13), fill=white)

    # Tray base pedestal
    ped_pts = [
        (s(205), s(338)),
        (s(222), s(352)),
        (s(350), s(352)),
        (s(365), s(338))
    ]
    s_draw.polygon(ped_pts, fill=white)

    # Speed trails
    # Top speed line
    s_draw.rounded_rectangle([s(92), s(215), s(185), s(233)], radius=s(9), fill=white)
    # Middle speed line
    s_draw.rounded_rectangle([s(58), s(255), s(175), s(275)], radius=s(10), fill=white)
    # Bottom speed line
    s_draw.rounded_rectangle([s(88), s(295), s(155), s(313)], radius=s(9), fill=white)

    img = Image.alpha_composite(img, shape_layer)
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    public_dir = os.path.abspath('frontend/public')
    assets_dir = os.path.abspath('frontend/src/assets')
    os.makedirs(public_dir, exist_ok=True)
    os.makedirs(assets_dir, exist_ok=True)

    print("Generating brand assets...")

    # 1. High-Res PWA 512x512
    img_512 = render_logo(512, is_maskable=False)
    img_512.save(os.path.join(public_dir, 'pwa-512x512.png'), 'PNG', optimize=True)
    print("[OK] pwa-512x512.png")

    # 2. PWA 192x192
    img_192 = render_logo(192, is_maskable=False)
    img_192.save(os.path.join(public_dir, 'pwa-192x192.png'), 'PNG', optimize=True)
    print("[OK] pwa-192x192.png")

    # 3. Maskable PWA 512 (edge-to-edge for Android adaptive icons)
    img_maskable = render_logo(512, is_maskable=True)
    img_maskable.save(os.path.join(public_dir, 'pwa-maskable-512x512.png'), 'PNG', optimize=True)
    print("[OK] pwa-maskable-512x512.png")

    # 4. Apple Touch Icon 180x180
    img_apple = render_logo(180, is_maskable=False)
    img_apple.save(os.path.join(public_dir, 'apple-touch-icon.png'), 'PNG', optimize=True)
    print("[OK] apple-touch-icon.png")

    # 5. Favicon PNG (replace old 1MB file with optimized crisp 64x64 & 192)
    img_favicon = render_logo(64, is_maskable=False)
    img_favicon.save(os.path.join(public_dir, 'favicon.png'), 'PNG', optimize=True)
    print("[OK] favicon.png (optimized)")

    # 6. Multi-resolution Favicon ICO (16, 32, 48)
    ico_16 = render_logo(16, is_maskable=False)
    ico_32 = render_logo(32, is_maskable=False)
    ico_48 = render_logo(48, is_maskable=False)
    ico_32.save(
        os.path.join(public_dir, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[ico_16, ico_48]
    )
    print("[OK] favicon.ico (multi-res 16, 32, 48)")

    # 7. Notification Icon 192x192
    img_notif = render_logo(192, is_maskable=False)
    img_notif.save(os.path.join(public_dir, 'notification-icon.png'), 'PNG', optimize=True)
    print("[OK] notification-icon.png")

    # 8. Notification Badge 96x96 (Monochrome white for Android status bar)
    img_badge = render_logo(96, is_maskable=False, is_monochrome=True)
    img_badge.save(os.path.join(public_dir, 'notification-badge.png'), 'PNG', optimize=True)
    print("[OK] notification-badge.png (monochrome)")

    # 9. SVG vector versions
    svg_mark = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="fetanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="50%" stop-color="#EA580C" />
      <stop offset="100%" stop-color="#C2410C" />
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.05" />
    </linearGradient>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#9A3412" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Squircle App Icon Background -->
  <rect x="28" y="28" width="456" height="456" rx="108" fill="url(#fetanGrad)" filter="url(#softShadow)" />
  <rect x="30" y="30" width="452" height="452" rx="106" fill="none" stroke="url(#sheen)" stroke-width="4" />

  <!-- Delivery Cloche + Speed Streaks Mark -->
  <g fill="#FFFFFF">
    <!-- Cloche Top Knob -->
    <ellipse cx="285" cy="160" rx="22" ry="18" />
    <path d="M 276 174 C 276 174 277 184 275 190 H 295 C 293 184 294 174 294 174 Z" />

    <!-- Cloche Main Dome -->
    <path d="M 169 295 C 169 203, 221 185, 285 185 C 349 185, 401 203, 401 295 Z" />

    <!-- Base Serving Platter -->
    <rect x="142" y="312" width="278" height="26" rx="13" />
    <!-- Platter bottom rim -->
    <path d="M 205 338 L 222 352 H 350 L 365 338 Z" opacity="0.95" />

    <!-- Speed Streaks (Fast / Fetan) -->
    <rect x="92" y="215" width="93" height="18" rx="9" />
    <rect x="58" y="255" width="117" height="20" rx="10" />
    <rect x="88" y="295" width="67" height="18" rx="9" />
  </g>
</svg>'''

    # SVG Glyph (transparent background for inline UI / icons)
    svg_glyph = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="glyphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
  </defs>
  <g fill="currentColor">
    <!-- Cloche Top Knob -->
    <ellipse cx="285" cy="160" rx="22" ry="18" />
    <path d="M 276 174 C 276 174 277 184 275 190 H 295 C 293 184 294 174 294 174 Z" />

    <!-- Cloche Main Dome -->
    <path d="M 169 295 C 169 203, 221 185, 285 185 C 349 185, 401 203, 401 295 Z" />

    <!-- Base Serving Platter -->
    <rect x="142" y="312" width="278" height="26" rx="13" />
    <path d="M 205 338 L 222 352 H 350 L 365 338 Z" opacity="0.95" />

    <!-- Speed Streaks -->
    <rect x="92" y="215" width="93" height="18" rx="9" />
    <rect x="58" y="255" width="117" height="20" rx="10" />
    <rect x="88" y="295" width="67" height="18" rx="9" />
  </g>
</svg>'''

    # Write SVGs
    for path in [
        os.path.join(public_dir, 'logo.svg'),
        os.path.join(public_dir, 'favicon.svg'),
        os.path.join(assets_dir, 'logo.svg')
    ]:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(svg_mark)
        print(f"[OK] {os.path.relpath(path)}")

    with open(os.path.join(public_dir, 'logo-glyph.svg'), 'w', encoding='utf-8') as f:
        f.write(svg_glyph)
    with open(os.path.join(assets_dir, 'logo-glyph.svg'), 'w', encoding='utf-8') as f:
        f.write(svg_glyph)
    print("[OK] logo-glyph.svg")

    print("\nAll brand assets successfully generated!")

if __name__ == '__main__':
    main()
