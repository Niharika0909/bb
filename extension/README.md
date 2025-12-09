# MRM Research Capture Extension

Chrome extension for capturing research workflows.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env - set REACT_APP_API_URL

# Build extension
npm run build
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

## Development

```bash
# Watch mode (auto-rebuild on file changes)
npm run dev

# Production build
npm run build
```

After changes, reload the extension:
- Go to `chrome://extensions`
- Click reload icon on MRM Research Capture

## Environment Variables

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=development
```

For production:

```env
REACT_APP_API_URL=https://your-api.railway.app
REACT_APP_ENVIRONMENT=production
```

## Build for Distribution

```bash
# Production build
npm run build

# Create zip
cd dist
zip -r ../mrm-capture-extension.zip .
```

Distribute `mrm-capture-extension.zip` to users.

## Features

- ✅ Auto-capture screenshot on popup open
- ✅ JWT authentication with chrome.storage
- ✅ Form validation
- ✅ Toast notifications
- ✅ Tag selectors (Sector, Theme, Finding Type)
- ✅ Screenshot upload to S3
- ✅ Capture save to PostgreSQL

## Components

### LoginForm
- Email + API Key authentication
- JWT token storage in chrome.storage.local

### CaptureForm
- Prompt (required)
- Screenshot (auto-captured, optional)
- Notes (optional)
- Sector (required dropdown)
- Theme (required dropdown)
- Finding Type (required dropdown)
- Save/Cancel buttons

### TagSelector
- Reusable dropdown component
- Used for Sector, Theme, Finding Type

### StatusToast
- Success/error/loading notifications
- Auto-dismiss after 3 seconds

## Utilities

### api.js
- Axios instance with JWT interceptor
- API methods: login, uploadScreenshot, saveCapture
- Error handling and token refresh

### auth.js
- Token management (get/set/clear)
- Token verification
- Chrome storage integration

### screenshot.js
- Chrome tabs API integration
- Screenshot capture
- Blob creation

### storage.js
- Chrome storage.local wrapper
- Promise-based API

## File Structure

```
extension/
├── src/
│   ├── components/
│   │   ├── CaptureForm.jsx
│   │   ├── LoginForm.jsx
│   │   ├── TagSelector.jsx
│   │   └── StatusToast.jsx
│   ├── utils/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── screenshot.js
│   │   └── storage.js
│   ├── App.jsx
│   ├── App.css
│   └── index.js
├── public/
│   ├── manifest.json
│   ├── popup.html
│   └── icons/
├── background/
│   └── background.js
├── webpack.config.js
├── .babelrc
├── package.json
└── README.md
```

## Manifest v3

This extension uses Manifest v3 (latest Chrome standard).

Key permissions:
- `activeTab` - Screenshot capture
- `scripting` - Tab interaction
- `storage` - Token storage
- `tabs` - Tab info (URL, title)

## Icons

See `public/icons/README.md` for icon generation instructions.

The extension will work without custom icons (Chrome shows default placeholder).

## Troubleshooting

### Extension won't load
- Rebuild: `npm run build`
- Check `dist/manifest.json` exists
- Check Chrome console: Right-click extension → Inspect popup

### Screenshot fails
- Verify `activeTab` permission in manifest
- Check you're on a valid web page (not chrome:// URLs)
- Try "Recapture" button

### API calls fail
- Check API is running
- Verify `REACT_APP_API_URL` in `.env`
- Check network tab in Chrome DevTools
- Verify CORS is enabled on API

### Login fails
- Check credentials match backend seed data
- Verify API `/api/auth/login` endpoint works
- Check Chrome storage: DevTools → Application → Storage

## Production Checklist

- [ ] Update `REACT_APP_API_URL` to production API
- [ ] Set `REACT_APP_ENVIRONMENT=production`
- [ ] Build: `npm run build`
- [ ] Test all features
- [ ] Create distribution zip
- [ ] Provide credentials to users
- [ ] Distribute installation instructions

## Security

- JWT tokens stored in chrome.storage.local (sandboxed per extension)
- Tokens expire in 30 days
- No sensitive data logged to console in production

## Browser Support

- Chrome 88+ (Manifest v3 requirement)
- Edge 88+ (Chromium-based)

## Known Limitations

- Only works on web pages (not chrome:// URLs)
- Screenshot quality limited by visible viewport
- Large screenshots compressed to 500KB
- No offline mode (requires API connection)

## Support

For issues:
1. Check Chrome console: Right-click extension → Inspect popup
2. Verify API is running and accessible
3. Check network tab for failed requests
4. Review `.env` configuration
