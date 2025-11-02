# How to View Console Logs for Debugging

## For Expo Apps

### Option 1: Metro Bundler Terminal (Recommended)
Console logs appear in the terminal where you run `expo start` or `npm start`.

1. Make sure Metro bundler is running:
   ```bash
   cd mobile
   npm start
   ```
   or
   ```bash
   cd mobile
   expo start
   ```

2. Look at that terminal window - all `console.log()`, `console.error()`, etc. will appear there.

### Option 2: React Native Debugger
1. Install React Native Debugger: https://github.com/jhen0409/react-native-debugger
2. Open the debugger
3. Enable "Remote JS Debugging" in the Expo menu (shake device or press Cmd+D/Ctrl+D)

### Option 3: Android Logcat with Filtering
If you want to see logs in logcat, filter for React Native logs:

```bash
adb logcat | grep -E "ReactNativeJS|console"
```

Or use the logcat filter in Android Studio:
- Open Logcat
- Add filter: `tag:ReactNativeJS` or `tag:console`

### Option 4: Expo Dev Tools
1. Press `j` in the Metro bundler terminal to open debugger
2. Or press `m` to open the developer menu on device
3. Select "Debug Remote JS"

## Current Console Logs Added

The following logs are now active:

### In CreateListingScreen:
- `=== SUBMIT START ===` - When submit starts
- Form validation logs
- Payment info preparation logs
- Listing creation logs
- Attachment upload logs
- `=== SUBMIT SUCCESS ===` or `=== SUBMIT ERROR ===`

### In API Interceptors:
- `[API Request]` - All API requests
- `[API Response]` - All API responses with status codes

### In Services:
- `[listingService]` - Listing creation logs
- `[attachmentService]` - File upload logs

## To See Logs Now:

1. **Open a new terminal window**
2. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```
3. **Start Expo (if not already running):**
   ```bash
   npm start
   ```
4. **Keep that terminal visible** - all console logs will appear there
5. **Try creating a listing** - you'll see all the debug logs in real-time

## Pro Tip:
If you're using VS Code, you can split the terminal to see both backend and Metro logs side-by-side.

