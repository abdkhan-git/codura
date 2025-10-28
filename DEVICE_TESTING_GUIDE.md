# Device Testing Guide - How to Test Camera, Microphone & Speakers

## ✅ Updates Applied

### Camera Auto-Start
- **Fixed**: Camera now starts AUTOMATICALLY when you enter the waiting room
- **No need to click buttons** - your video appears immediately after allowing permissions

### Speaker Test
- **Added**: "Test Speaker" button plays a test tone
- **How it works**: Click to hear a pleasant beep sound

### Better Microphone Feedback
- **Enhanced**: Visual indicators show microphone activity
- **Real-time levels**: Green bar moves as you speak
- **Status messages**: Tells you if mic is working

---

## 🎯 How to Test Each Device

### 1️⃣ **Camera Test**

**Steps:**
1. Go to `/mock-interview`
2. Click "Host Session"
3. Click "Allow" when browser asks for permissions
4. **Camera starts AUTOMATICALLY** ✨

**What You Should See:**
- ✅ Your face appears in the video preview
- ✅ Video is mirrored (like looking in a mirror)
- ✅ Green checkmark next to "Camera" in Device Check
- ✅ "Camera and microphone connected!" toast notification

**Test the Toggle:**
- Click "Camera Off" → Video turns black
- Click "Camera On" → Video returns
- Each click shows a toast notification

**Change Cameras (if you have multiple):**
- Use the "Camera" dropdown in Device Settings
- Preview updates automatically when you select different camera

---

### 2️⃣ **Microphone Test**

**Steps:**
1. Make sure "Mic On" button is selected (default)
2. Look at the "Microphone Level" section
3. **Speak out loud** (say "testing 1, 2, 3")

**What You Should See:**
- ✅ Green bar moves as you speak
- ✅ Higher bars when speaking louder
- ✅ Status text changes:
  - "Speak to test" → when silent
  - "🎤 Working!" → when detecting sound
  - "Perfect! Your microphone is working great 🎉" → when loud enough

**How to Know It's Working:**
The green level bar should:
- Move in real-time as you speak
- Get bigger when you speak louder
- Return to zero when you're silent
- Turn green (from gray) when picking up sound

**Troubleshooting:**
- **No movement?** Speak louder or check system mic volume
- **Bar stays gray?** Check mic permissions
- **Low levels?** Select different mic from dropdown

**Test the Toggle:**
- Click "Mic Off" → Level bar stops moving
- Click "Mic On" → Level bar resumes
- Toast notifications confirm each toggle

---

### 3️⃣ **Speaker Test**

**Steps:**
1. Click the "**Test Speaker**" button
2. Listen for a sound

**What You Should Hear:**
- ✅ A pleasant **beep tone** (440 Hz, musical note A)
- ✅ Sound lasts about **0.5 seconds**
- ✅ Sound fades out smoothly
- ✅ Toast notification: "Playing test sound - can you hear it?"

**If You Don't Hear Anything:**
1. **Check system volume** - Make sure computer isn't muted
2. **Check headphones** - Are they plugged in and selected?
3. **Check browser** - Some browsers block audio until user interaction
4. **Try again** - Click "Test Speaker" multiple times
5. **Test with music** - Open YouTube to verify speakers work

**Volume Too Loud/Quiet?**
- Adjust your **system volume** (not the app)
- Speakers work at whatever volume your system is set to

---

## 🔍 Visual Indicators Guide

### Device Check Panel

Located in the right sidebar:

**Camera Status:**
- ✅ **Green Checkmark** = Camera working perfectly
- ⚠️ **Yellow Alert** = Camera initializing
- ❌ **Red X** = Camera failed (check permissions)

**Microphone Status:**
- ✅ **Green Checkmark** = Microphone working
- ⚠️ **Yellow Alert** = Microphone initializing
- ❌ **Red X** = Microphone failed (check permissions)

### Microphone Level Bar

**Colors:**
- **Gray** = Not detecting sound (speak louder or check mic)
- **Green** = Detecting sound (mic is working!)

**Width:**
- **Narrow (0-20%)** = Very quiet or silent
- **Medium (20-50%)** = Normal speaking volume
- **Wide (50-100%)** = Loud or shouting

**Status Messages:**
- "Speak to test" = Waiting for you to speak
- "🎤 Working!" = Detecting your voice
- "Good! Keep speaking" = Mic working normally
- "Perfect! Your microphone is working great 🎉" = Loud and clear!

---

## 📋 Complete Testing Checklist

Use this to verify everything works:

### Camera
- [ ] Camera preview shows your face automatically
- [ ] Video is clear (not pixelated or frozen)
- [ ] "Camera" has green checkmark
- [ ] "Camera Off" turns video black
- [ ] "Camera On" restores video
- [ ] Can switch between cameras (if multiple)
- [ ] Toast notifications appear for toggles

### Microphone
- [ ] Microphone level bar appears
- [ ] Bar moves when speaking
- [ ] Bar is green when detecting sound
- [ ] "Microphone" has green checkmark
- [ ] Status message says "🎤 Working!"
- [ ] "Mic Off" stops the level bar
- [ ] "Mic On" resumes the level bar
- [ ] Can switch between microphones (if multiple)

### Speakers
- [ ] "Test Speaker" button is visible
- [ ] Clicking button plays a beep sound
- [ ] Can hear the sound clearly
- [ ] Toast notification confirms test
- [ ] System volume controls affect loudness

### Overall
- [ ] Browser asked for permissions
- [ ] Permissions were allowed
- [ ] All devices initialized successfully
- [ ] "Start Interview" button is enabled
- [ ] No error messages in browser console

---

## 🎬 Quick Test (30 seconds)

**The fastest way to verify everything:**

1. **Visual**: Do you see your face? ✅
2. **Audio Out**: Click "Test Speaker" - hear beep? ✅
3. **Audio In**: Say "hello" - does green bar move? ✅

If all three work, you're ready to interview! 🎉

---

## 🆘 Common Issues

### Camera shows but is black
- **Another app is using camera** (Zoom, Teams, Skype)
- **Fix**: Close other apps, refresh page

### Microphone bar not moving
- **System mic is muted or too quiet**
- **Fix**: Check system settings, speak louder

### Can't hear speaker test
- **System volume is muted/low**
- **Fix**: Turn up system volume, check headphones

### Permissions denied
- **Accidentally clicked "Block"**
- **Fix**: Click lock icon in address bar → Allow camera/mic → Refresh

### Devices not listed in dropdown
- **Permissions not granted yet**
- **Fix**: Grant permissions, devices will appear

---

## 💡 Pro Tips

**Best Practices:**
- **Close other video apps** before testing (Zoom, Teams, etc.)
- **Use headphones** for better audio quality and no echo
- **Good lighting** makes your video look better
- **Test in quiet room** for best microphone performance
- **Check system volume** before clicking "Test Speaker"

**Browser Compatibility:**
- ✅ Chrome/Edge - Best support
- ✅ Firefox - Fully supported
- ✅ Safari - Fully supported
- ❌ Internet Explorer - Not supported

**Optimal Settings:**
- Camera: 1280x720 HD resolution
- Microphone: Echo cancellation ON
- Microphone: Noise suppression ON
- Microphone: Auto gain control ON

---

## 🎯 Ready to Interview?

Once you see:
- ✅ Your face in camera preview
- ✅ Green microphone bar moving when you speak
- ✅ Beep sound when testing speaker
- ✅ Green checkmarks in Device Check

Click **"Start Interview"** and you're ready to go! 🚀

---

**Questions? Check the browser console (F12) for detailed error messages.**
