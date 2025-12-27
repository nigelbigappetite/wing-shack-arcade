# Testing on Your Phone

## Quick Setup

### Step 1: Make sure your dev server is running
```bash
npm run dev
```

The server should now be accessible on your local network at:
- **Your local IP**: `http://172.17.2.218:3000`
- **Localhost** (on your computer): `http://localhost:3000`

### Step 2: Connect your phone to the same Wi-Fi network
- Make sure your phone is connected to the **same Wi-Fi network** as your computer
- This is required for local network access

### Step 3: Open on your phone
1. Open your phone's web browser (Safari on iPhone, Chrome on Android)
2. Type in the address bar: `http://172.17.2.218:3000`
3. You should see the Wing Shack Arcade homepage!

## Troubleshooting

### If you can't connect:

1. **Check your firewall**: Make sure your Mac's firewall allows incoming connections on port 3000
   - System Settings → Network → Firewall → Options
   - Allow incoming connections for Node.js

2. **Find your current IP address** (in case it changed):
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Look for the IP that starts with `192.168.x.x` or `172.x.x.x`

3. **Try using your computer's hostname**:
   - On Mac: `http://[your-computer-name].local:3000`
   - Find your computer name: System Settings → General → About → Name

4. **Alternative: Use ngrok for external access** (works from anywhere):
   ```bash
   # Install ngrok (if not installed)
   brew install ngrok
   
   # Start ngrok tunnel
   ngrok http 3000
   ```
   Then use the ngrok URL on your phone (works even on different networks!)

## Testing Tips

- **Clear browser cache** if you see old versions
- **Use Chrome DevTools** on your computer to simulate mobile devices first
- **Test on both portrait and landscape** orientations
- **Check different phone sizes** using browser dev tools before testing on real device

## Quick Access

Once set up, bookmark these URLs on your phone:
- Homepage: `http://172.17.2.218:3000`
- Spin the Wing: `http://172.17.2.218:3000/spin-the-wing`


