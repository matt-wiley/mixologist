# Firefox Extension Troubleshooting Guide

## "Unable to connect to background script" Error

This error typically occurs during development when the background script fails to load properly. Here's how to diagnose and fix it:

### Step 1: Check Firefox Developer Tools

1. **Open Firefox Developer Tools** (`F12`)
2. Go to the **Console** tab  
3. Look for any error messages when you click the extension icon
4. Check for errors related to "Tab Audio Mixer" or "background script"

### Step 2: Check Extension Loading

1. Go to `about:debugging` in Firefox
2. Click **"This Firefox"**
3. Find "Tab Audio Mixer" in the list
4. Click **"Inspect"** to open the background script debugger
5. Check the console for any errors

### Step 3: Verify File Structure

Make sure these files exist:
```
mixologist/
├── manifest.json
├── src/
│   ├── background/
│   │   └── background-bundle.js
│   ├── content/
│   │   └── content-bundle.js  
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── assets/
│       └── icons/
│           ├── icon-16.png
│           ├── icon-32.png
│           ├── icon-48.png
│           └── icon-128.png
```

### Step 4: Reload Extension

1. Go to `about:debugging`
2. Find your extension
3. Click **"Reload"**
4. Try opening the popup again

### Step 5: Check Browser Console

When you click the extension icon:
1. Open Browser Console (`Ctrl+Shift+J`)
2. Look for messages starting with "Tab Audio Mixer:"
3. Expected messages:
   - "Tab Audio Mixer: Background script starting..."
   - "Tab Audio Mixer: Initializing extension..."
   - "Tab Audio Mixer: Extension initialized successfully"

### Step 6: Test with Simple Tab

1. Open a new tab
2. Go to YouTube and play a video
3. Click the extension icon
4. You should see the tab listed with volume controls

### Common Issues and Solutions

#### Issue: No messages in console
**Solution**: The background script isn't loading
- Check if `src/background/background-bundle.js` exists
- Reload the extension in `about:debugging`

#### Issue: "browser is not defined" error  
**Solution**: Wrong browser API usage
- Make sure you're using Firefox (not Chrome)
- Check that the extension is loaded as a WebExtension

#### Issue: Icons not loading
**Solution**: Missing icon files
- Check that icon files exist in `src/assets/icons/`
- Icons should be PNG format

#### Issue: Popup shows but empty
**Solution**: popup.js not executing
- Check console for JavaScript errors
- Ensure `popup.js` is in the same directory as `popup.html`

### Development Tips

1. **Use Firefox Developer Edition** - Better debugging tools
2. **Enable verbose logging** - Set `devtools.console.stdout.content` to `true` in `about:config`
3. **Test with simple sites** - Start with YouTube before trying complex sites
4. **Check permissions** - Make sure the manifest.json has required permissions

### Manual Test Commands

You can test the background script manually in the console:

```javascript
// Test message sending (in popup console)
browser.runtime.sendMessage({
  type: 'GET_ACTIVE_TABS',
  payload: {}
}).then(response => {
  console.log('Response:', response);
});
```

### Known Issues

#### Issue: Mysterious "Unknown" source appears occasionally  
**Status**: ✅ Fixed in latest version
- Tabs without proper titles are now filtered out automatically
- The extension will no longer display "Unknown Tab" entries in the popup
- This eliminates UI clutter from temporary or cross-origin audio elements

#### Issue: Muted tabs disappear from popup after a few seconds
**Status**: ✅ Fixed in latest version  
- Audio detection now properly tracks muted tabs as "potentially active"
- Muted tabs will remain visible in the popup for easy unmuting
- This improves UX by keeping audio-capable tabs accessible even when muted

### Still Having Issues?

1. Check the browser console (F12) for detailed error messages
2. Look in `about:debugging` → Extension → Inspect for background script errors
3. Try loading the extension in a fresh Firefox profile
4. Compare your file structure with the one listed above