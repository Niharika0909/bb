# MRM Extension Icons

## Quick Setup (Placeholder Icons)

For development and testing, you can use simple placeholder PNG files.

### Option 1: Use ImageMagick (Recommended)

```bash
cd extension/public/icons
convert icon.svg -resize 16x16 icon-16.png
convert icon.svg -resize 48x48 icon-48.png
convert icon.svg -resize 128x128 icon-128.png
```

### Option 2: Online Converter

1. Open https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Download and rename to:
   - icon-16.png (16x16)
   - icon-48.png (48x48)
   - icon-128.png (128x128)

### Option 3: Create Simple Colored Squares (Quick Test)

Use any image editor to create three PNG files:
- **icon-16.png**: 16x16 pixels, teal background (#00897b)
- **icon-48.png**: 48x48 pixels, teal background (#00897b)
- **icon-128.png**: 128x128 pixels, teal background (#00897b)

## Production Icons

For production deployment, use a professional icon designer or:
- https://realfavicongenerator.net/
- Figma + export to PNG
- Professional design tool (Sketch, Adobe XD, etc.)

## Current Status

⚠️ **The extension will load without icons, but Chrome will show a default icon placeholder.**

The extension is fully functional without custom icons. Icons are for branding only.
