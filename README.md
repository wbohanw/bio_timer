# Bio Timer

A customizable sequential timer application built with React and TypeScript.

## Features

- Add multiple named timer items with custom durations
- Sequential timer execution (items run one after another)
- Visual feedback for the currently active timer
- Sound notification when all timers complete
- Pause and reset functionality

## How to Use

1. **Add Timer Items**:
   - Enter a name for your timer item
   - Set the duration (hours, minutes, seconds)
   - Click "Add item" to add it to the list
   - Repeat to add multiple items

2. **Start the Timer**:
   - Click "Start" to begin the sequential timer
   - The first item will start counting down
   - When it reaches zero, the next item will automatically start
   - A sound will play when all timers have completed

3. **Controls**:
   - **Pause**: Temporarily stop the current timer
   - **Reset**: Reset all timers to their initial values

## Custom Notification Sound

To use a custom notification sound:
1. Add your sound file named `notification.mp3` to the `/public` directory
2. The app will automatically use this file when timers complete
3. If no sound file is found, a fallback beep will be used

## Development

This project is built with React, TypeScript, and Vite.

```shell
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## License

MIT
