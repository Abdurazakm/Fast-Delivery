import os
from PIL import Image, ImageOps

def process_brand_icons():
    base_path = os.path.abspath('frontend/public')
    source_logo_path = os.path.join(base_path, 'logo.png')

    if not os.path.exists(source_logo_path):
        print(f"Error: {source_logo_path} not found!")
        return

    orig = Image.open(source_logo_path).convert("RGBA")
    print(f"Loaded master logo.png: {orig.size}")

    # 1. pwa-512x512.png
    pwa_512 = orig.resize((512, 512), Image.Resampling.LANCZOS)
    pwa_512.save(os.path.join(base_path, 'pwa-512x512.png'), 'PNG', optimize=True)
    print("[OK] pwa-512x512.png")

    # 2. pwa-192x192.png
    pwa_192 = orig.resize((192, 192), Image.Resampling.LANCZOS)
    pwa_192.save(os.path.join(base_path, 'pwa-192x192.png'), 'PNG', optimize=True)
    print("[OK] pwa-192x192.png")

    # 3. pwa-maskable-512x512.png (padded to 80% safe zone with matched background edge)
    # The edges of orig are warm orange #f55f00 to #ff7b00.
    # We sample corner or edge pixel from orig
    edge_color = orig.getpixel((orig.width // 2, orig.height - 5))
    maskable = Image.new("RGBA", (512, 512), edge_color)
    # Resize master to 82% (safe zone = 420x420)
    safe_size = int(512 * 0.82)
    safe_logo = orig.resize((safe_size, safe_size), Image.Resampling.LANCZOS)
    offset = (512 - safe_size) // 2
    maskable.paste(safe_logo, (offset, offset), safe_logo if safe_logo.mode == 'RGBA' else None)
    maskable.save(os.path.join(base_path, 'pwa-maskable-512x512.png'), 'PNG', optimize=True)
    print("[OK] pwa-maskable-512x512.png")

    # 4. apple-touch-icon.png (180x180)
    apple = orig.resize((180, 180), Image.Resampling.LANCZOS)
    apple.save(os.path.join(base_path, 'apple-touch-icon.png'), 'PNG', optimize=True)
    print("[OK] apple-touch-icon.png")

    # 5. favicon.png (64x64 crisp)
    fav_64 = orig.resize((64, 64), Image.Resampling.LANCZOS)
    fav_64.save(os.path.join(base_path, 'favicon.png'), 'PNG', optimize=True)
    print("[OK] favicon.png")

    # 6. favicon.ico (multi-res 16, 32, 48)
    fav_16 = orig.resize((16, 16), Image.Resampling.LANCZOS)
    fav_32 = orig.resize((32, 32), Image.Resampling.LANCZOS)
    fav_48 = orig.resize((48, 48), Image.Resampling.LANCZOS)
    fav_32.save(
        os.path.join(base_path, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[fav_16, fav_48]
    )
    print("[OK] favicon.ico")

    # 7. notification-icon.png (192x192)
    notif = orig.resize((192, 192), Image.Resampling.LANCZOS)
    notif.save(os.path.join(base_path, 'notification-icon.png'), 'PNG', optimize=True)
    print("[OK] notification-icon.png")

    # Also copy to frontend/src/assets/logo.png for convenient imports
    src_assets = os.path.abspath('frontend/src/assets')
    os.makedirs(src_assets, exist_ok=True)
    orig.save(os.path.join(src_assets, 'logo.png'), 'PNG')
    print("[OK] frontend/src/assets/logo.png")

    print("\nSuccessfully updated all icons from user logo.png!")

if __name__ == '__main__':
    process_brand_icons()
