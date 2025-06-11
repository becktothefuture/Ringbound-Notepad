# Ring-Bound Notepad

A GPU-accelerated, 3D notepad effect that simulates the tactile experience of flipping through a spiral-bound notebook.

## Project Structure

```
ring-bound-notepad/
├── src/
│   ├── assets/        # Static assets (images, fonts, etc.)
│   ├── css/
│   │   └── styles.css # Main stylesheet
│   ├── js/
│   │   ├── __tests__/ # Test files
│   │   ├── config.js  # Configuration and constants
│   │   ├── debug.js   # Debug utilities and overlay
│   │   ├── init.js    # Initialization and setup
│   │   ├── render.js  # Main rendering and animation logic
│   │   └── utils.js   # Helper functions and utilities
│   └── index.html     # Main HTML file
├── .eslintrc.json    # ESLint configuration
├── .gitignore        # Git ignore rules
├── .prettierrc       # Prettier configuration
├── package.json      # Project dependencies and scripts
└── README.md         # This file
```

## Features

- Smooth 3D page flipping animation
- GPU-accelerated transforms
- Responsive design
- Touch support with haptic feedback
- Accessibility features
- Debug mode for development
- Fallback for unsupported browsers
- Comprehensive test suite
- Code quality tools (ESLint, Prettier)

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Lint code:
   ```bash
   npm run lint
   ```
6. Format code:
   ```bash
   npm run format
   ```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Performance

- Targets 60 FPS on mid-range mobile devices
- Uses GPU acceleration for smooth animations
- Implements efficient DOM updates
- Optimized for minimal layout reflow

## Development

To enable debug mode:
1. Open `src/js/config.js`
2. Set `debug: true`
3. Refresh the page to see the debug overlay

## Testing

The project uses Jest for testing. Run tests with:
```bash
npm test
```

## Code Quality

- ESLint for code linting
- Prettier for code formatting
- Jest for unit testing
- Continuous integration ready

## License

MIT License

### Scripts

- `npm start`: Starts a local server that serves the built application from the `dist` directory.
- `npm run build`: Bundles the application into the `dist` directory.
- `npm test`: Runs the test suite.
- `npm run lint`: Lints the JavaScript files. 