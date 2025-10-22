# How to Run the Codura App - Complete Guide

## Your App Architecture

Your Codura app has **two parts**:
1. **Next.js Frontend** (main app) - Runs on port 3000/3001
2. **Express Backend Server** (server folder) - Runs on port 3001 or configured port

## Step-by-Step Instructions

### Option 1: Run Both Servers Separately (Recommended for Development)

This gives you better control and visibility of both servers.

#### Terminal 1: Start the Express Backend Server

```bash
# Navigate to the server directory
cd /Users/michaelcatalanotti/IdeaProjects/codura/server

# Install dependencies (first time only)
npm install

# Start the backend server in development mode
npm run dev
```

You should see output like:
```
Server running on port 3001
```

**Keep this terminal open!**

---

#### Terminal 2: Start the Next.js Frontend

Open a **new terminal window** and run:

```bash
# Navigate to the main project directory
cd /Users/michaelcatalanotti/IdeaProjects/codura

# Install dependencies (first time only, if not already done)
npm install

# Start the Next.js development server
npm run dev
```

You should see output like:
```
▲ Next.js 15.5.3
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.3s
```

**Note:** If port 3000 is taken, Next.js will automatically use the next available port (3001, 3002, etc.)

**Keep this terminal open too!**

---

### Option 2: Quick Start (Single Command)

If you prefer to run everything at once:

```bash
cd /Users/michaelcatalanotti/IdeaProjects/codura

# Run backend and frontend concurrently
npm run dev & cd server && npm run dev
```

However, this is harder to debug. I recommend **Option 1** for development.

---

## Verification Steps

After starting both servers, verify everything is running:

### 1. Check the Backend Server
Open: http://localhost:3001/api/health

You should see a response from your Express server (or an API route).

### 2. Check the Next.js App
Open: http://localhost:3000 (or whatever port Next.js shows)

You should see your Codura homepage/login page.

### 3. Navigate to Dashboard
- Login with your credentials
- Go to: http://localhost:3000/dashboard

### 4. Access Mock Interview
Click: **Dashboard** → **Compete** → **Mock Interview**

Or go directly to: http://localhost:3000/mock-interview

---

## Port Configuration

### Current Setup:
- **Express Backend**: Port 3001 (likely, check server/server.ts)
- **Next.js Frontend**: Port 3000 (default, may auto-increment)

### If You Get Port Conflicts:

**Express Server (server/server.ts):**
```typescript
const PORT = process.env.PORT || 3001;
```

**Next.js:**
- Automatically finds next available port
- Or specify in package.json: `"dev": "next dev -p 3002"`

---

## Testing Mock Interview Feature

Once both servers are running:

### Quick Test with One Browser:

1. Go to: http://localhost:3000/mock-interview
2. Click "Host Session"
3. Allow camera/microphone permissions
4. Test your devices
5. Copy the session ID
6. Click "Start Interview"

You should see:
- Your video in the waiting room
- Session ID displayed
- Device testing controls

### Full Test with Two Users:

**Browser Window 1 (Normal Mode):**
1. Login as User A
2. Go to /mock-interview
3. Click "Host Session"
4. Copy session ID
5. Click "Start Interview"

**Browser Window 2 (Incognito Mode - Cmd+Shift+N):**
1. Login as User B (different account)
2. Go to /mock-interview
3. Click "Join Session"
4. Paste the session ID
5. Click "Join Interview"

Both users should connect (note: may need signaling server for full connection - see production setup).

---

## Common Issues & Solutions

### Issue 1: "Port already in use"

**Solution:**
```bash
# Find what's using the port (e.g., 3001)
lsof -ti:3001

# Kill that process
kill -9 $(lsof -ti:3001)

# Then restart the server
```

### Issue 2: "Module not found" errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Do the same in server folder
cd server
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Camera/Microphone not working

**Solution:**
- Grant browser permissions (click lock icon in address bar)
- Close other apps using camera (Zoom, Skype, etc.)
- Try reloading the page
- Check browser console for errors (F12 → Console)

### Issue 4: "Unauthorized" or database errors

**Solution:**
- Check your .env.local file has correct Supabase credentials
- Verify you're logged in
- Check browser console and terminal for specific errors

### Issue 5: Next.js is using port 3001 (conflicts with backend)

**Solution:**
```bash
# Start backend first, then frontend will use next available port (3002)
# OR manually specify port:
npm run dev -- -p 3002
```

---

## Environment Check

Make sure you have these files:

### `.env.local` (in root directory)
Should contain:
```env
NEXT_PUBLIC_SUPABASE_URL=https://prxtkrteujbptauwhnxs.supabase.co/
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
```

### `server/.env` (in server directory)
Should contain any backend-specific environment variables.

---

## Complete Startup Checklist

- [ ] Navigate to project root
- [ ] Open Terminal 1: `cd server && npm run dev`
- [ ] Wait for "Server running on port 3001"
- [ ] Open Terminal 2: `npm run dev` (in root)
- [ ] Wait for "Ready in X.Xs"
- [ ] Open browser to http://localhost:3000
- [ ] Login to your account
- [ ] Navigate to /mock-interview
- [ ] Test the feature!

---

## Development Tips

### Watch Mode
Both servers run in **watch mode** by default:
- Backend: Changes to server files auto-restart the server
- Frontend: Changes to React components auto-reload the page

### Viewing Logs
- **Backend logs**: Check Terminal 1
- **Frontend logs**: Check Terminal 2 and browser console (F12)
- **API errors**: Check both terminals and browser Network tab

### Stopping the Servers
Press `Ctrl+C` in each terminal to stop the servers.

---

## Next Steps After Starting

1. **Test locally** with the mock interview feature
2. **Check browser console** for any errors
3. **Review terminal output** for server errors
4. **Open DevTools** (F12) to monitor network requests

---

## Quick Reference Commands

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..

# Start backend only
cd server && npm run dev

# Start frontend only (from root)
npm run dev

# Kill all node processes (if stuck)
killall node

# Check what's running on a port
lsof -i :3000
lsof -i :3001

# View recent logs
# (Backend: Terminal 1, Frontend: Terminal 2)
```

---

## Success Indicators

When everything is running correctly, you should see:

✅ Terminal 1: "Server running on port 3001" (or similar)
✅ Terminal 2: "Ready in X.Xs" and a local URL
✅ Browser: Codura app loads without errors
✅ Browser Console: No red errors
✅ /mock-interview page: Loads and shows "Host Session" / "Join Session"

---

**You're all set! Start with Option 1 (two terminals) and test the mock interview feature.** 🚀

Need help? Check the terminals and browser console for specific error messages.
