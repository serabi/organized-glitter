# Randomizer Accessibility Guide

This document outlines the comprehensive accessibility features implemented in the randomizer components to ensure WCAG 2.1 AA compliance and excellent user experience for all users, including those using assistive technologies.

## Overview

The randomizer components have been enhanced with comprehensive accessibility features including:

- **Keyboard Navigation**: Full keyboard support with logical tab order and shortcuts
- **Screen Reader Support**: ARIA labels, live regions, and alternative content
- **Touch Accessibility**: Optimized touch targets and gesture support
- **Visual Accessibility**: High contrast support, focus indicators, and color alternatives
- **Motor Accessibility**: Reduced motion support and alternative interaction methods

## Components

### RandomizerWheel

The main wheel component with SVG-based rendering and comprehensive accessibility.

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Spin the wheel (if projects selected) |
| `Escape` | Remove focus from wheel |
| `Tab` / `Shift+Tab` | Navigate between elements |
| `Arrow Keys` | Get current state information |
| `Home` | Get wheel overview |
| `End` | Navigate to end of interaction |
| `F1` / `?` | Show help instructions |
| `H` | Quick help summary |
| `R` | Read current state and project list |

#### Screen Reader Support

- **ARIA Labels**: Descriptive labels for all interactive elements
- **Live Regions**: Announcements for spin start, results, and state changes
- **Alternative Content**: Complete project list available to screen readers
- **Context Information**: Detailed descriptions of wheel state and options

#### Touch Support

- **Swipe Gestures**: Swipe up on wheel to spin
- **Touch Targets**: Minimum 44x44px touch targets
- **Haptic Feedback**: Vibration feedback for touch interactions
- **Visual Feedback**: On-screen feedback for touch gestures

### OptimizedWheel

Performance-optimized wheel with CSS/Canvas rendering and enhanced accessibility.

#### Additional Features

- **Render Mode Awareness**: Screen readers informed of CSS vs Canvas rendering
- **Performance Shortcuts**: `M` key to announce current render mode
- **Adaptive Behavior**: Automatically switches rendering for optimal performance
- **Memory Management**: Optimized for devices with limited resources

#### Keyboard Enhancements

All RandomizerWheel shortcuts plus:

| Key | Action |
|-----|--------|
| `M` | Announce current rendering mode |
| Enhanced `R` | Includes render mode in state announcement |
| Enhanced `H` | Includes performance information |

### ProjectSelector

Interactive project selection with comprehensive keyboard and screen reader support.

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Toggle project selection |
| `Arrow Up/Down` | Navigate between projects |
| `Home` | Focus first project |
| `End` | Focus last project |
| `Tab` | Navigate to batch operation buttons |

#### Screen Reader Support

- **Detailed Descriptions**: Each project includes company, artist, and selection state
- **Selection Feedback**: Clear indication of current selection state
- **Batch Operations**: Accessible "Select All" and "Select None" buttons
- **Progress Information**: Selection count and status updates

## WCAG 2.1 AA Compliance

### Level A Requirements

✅ **1.1.1 Non-text Content**: All images have appropriate alt text  
✅ **1.3.1 Info and Relationships**: Semantic HTML structure with proper headings  
✅ **1.3.2 Meaningful Sequence**: Logical reading and navigation order  
✅ **1.4.1 Use of Color**: Information not conveyed by color alone  
✅ **2.1.1 Keyboard**: All functionality available via keyboard  
✅ **2.1.2 No Keyboard Trap**: Users can navigate away from all elements  
✅ **2.4.1 Bypass Blocks**: Skip links available for complex interactions  
✅ **2.4.2 Page Titled**: Appropriate page and section titles  

### Level AA Requirements

✅ **1.4.3 Contrast (Minimum)**: 4.5:1 contrast ratio for normal text  
✅ **1.4.4 Resize Text**: Text can be resized up to 200% without loss of functionality  
✅ **1.4.5 Images of Text**: Text used instead of images of text where possible  
✅ **2.4.5 Multiple Ways**: Multiple navigation methods available  
✅ **2.4.6 Headings and Labels**: Descriptive headings and labels  
✅ **2.4.7 Focus Visible**: Keyboard focus clearly visible  
✅ **3.1.1 Language of Page**: Page language identified  
✅ **3.2.1 On Focus**: No unexpected context changes on focus  
✅ **3.2.2 On Input**: No unexpected context changes on input  

## Assistive Technology Support

### Screen Readers

Tested and optimized for:
- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS/iOS)
- **TalkBack** (Android)

#### Key Features

- **Live Regions**: Real-time announcements for spin results
- **Descriptive Labels**: Clear, contextual labels for all elements
- **Alternative Content**: Complete project information available
- **Navigation Shortcuts**: Quick access to key functionality

### Keyboard Navigation

- **Full Keyboard Support**: All mouse functionality available via keyboard
- **Logical Tab Order**: Intuitive navigation sequence
- **Keyboard Shortcuts**: Quick access to common actions
- **Focus Management**: Clear focus indicators and logical flow

### Voice Control

- **Voice Access** (Android): All elements properly labeled
- **Voice Control** (iOS): Comprehensive voice command support
- **Dragon NaturallySpeaking**: Full compatibility with voice commands

## Mobile Accessibility

### Touch Targets

- **Minimum Size**: All interactive elements meet 44x44px minimum
- **Spacing**: Adequate spacing between touch targets
- **Touch Feedback**: Visual and haptic feedback for interactions

### Gesture Support

- **Swipe to Spin**: Upward swipe gesture on wheel
- **Alternative Methods**: Button-based interaction always available
- **Gesture Feedback**: Clear feedback for gesture recognition

### Screen Readers on Mobile

- **VoiceOver**: Full iOS accessibility support
- **TalkBack**: Complete Android accessibility integration
- **Touch Exploration**: All elements discoverable via touch

## Visual Accessibility

### High Contrast Support

- **System Preferences**: Respects OS high contrast settings
- **Forced Colors**: Windows High Contrast Mode support
- **Custom Contrast**: Enhanced contrast ratios throughout

### Focus Indicators

- **Visible Focus**: Clear 3px focus outlines
- **High Contrast**: Enhanced focus indicators in high contrast mode
- **Focus Animation**: Subtle pulse animation for better visibility

### Color and Contrast

- **Text Contrast**: Minimum 4.5:1 ratio for all text
- **Interactive Elements**: Enhanced contrast for buttons and controls
- **Color Independence**: No information conveyed by color alone

## Motor Accessibility

### Reduced Motion

- **Respects Preferences**: Honors `prefers-reduced-motion` setting
- **Alternative Animations**: Simplified animations when requested
- **Static Alternatives**: Non-animated alternatives available

### Alternative Interactions

- **Multiple Methods**: Keyboard, mouse, touch, and voice support
- **Flexible Timing**: No time-based interactions required
- **Error Prevention**: Clear feedback and confirmation for actions

## Testing and Validation

### Automated Testing

- **axe-core**: Comprehensive accessibility rule checking
- **Jest Tests**: Automated accessibility test suite
- **CI Integration**: Accessibility tests run on every commit

### Manual Testing

- **Screen Reader Testing**: Regular testing with multiple screen readers
- **Keyboard Testing**: Complete keyboard navigation verification
- **Mobile Testing**: Touch and gesture interaction validation

### User Testing

- **Accessibility Consultants**: Professional accessibility review
- **User Feedback**: Regular feedback from users with disabilities
- **Continuous Improvement**: Ongoing accessibility enhancements

## Implementation Details

### ARIA Implementation

```tsx
// Example ARIA usage in RandomizerWheel
<div
  role="application"
  aria-label={`Project randomizer wheel with ${projects.length} projects`}
  aria-describedby="wheel-description wheel-instructions project-alternatives"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  {/* Wheel content */}
</div>

// Live regions for announcements
<div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
<div ref={statusRef} aria-live="assertive" aria-atomic="true" className="sr-only" />
```

### Keyboard Event Handling

```tsx
const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      // Spin wheel or provide feedback
      break;
    case 'Escape':
      // Remove focus
      break;
    case 'h':
    case 'H':
      // Show help
      break;
    // ... additional key handlers
  }
}, [dependencies]);
```

### Touch Gesture Implementation

```tsx
const { wheelTouchHandlers, touchFeedback } = useWheelTouchGestures(
  onSpin,
  disabled
);

// Touch feedback display
{touchFeedback && (
  <div className="wheel-touch-feedback" role="status" aria-live="polite">
    {touchFeedback}
  </div>
)}
```

## Best Practices

### Development Guidelines

1. **Test Early**: Include accessibility testing from the start
2. **Use Semantic HTML**: Proper HTML elements and structure
3. **ARIA Sparingly**: Only when semantic HTML isn't sufficient
4. **Focus Management**: Logical focus order and clear indicators
5. **Alternative Content**: Always provide alternatives for complex content

### Content Guidelines

1. **Clear Labels**: Descriptive, contextual labels for all elements
2. **Consistent Language**: Use consistent terminology throughout
3. **Error Messages**: Clear, actionable error messages
4. **Instructions**: Provide clear usage instructions
5. **Feedback**: Immediate feedback for all user actions

### Testing Guidelines

1. **Automated Tests**: Run accessibility tests on every build
2. **Manual Testing**: Regular manual testing with assistive technologies
3. **User Testing**: Include users with disabilities in testing process
4. **Cross-Platform**: Test on multiple devices and platforms
5. **Continuous Monitoring**: Ongoing accessibility monitoring and improvement

## Resources

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)

### Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

### Screen Readers

- [NVDA](https://www.nvaccess.org/) (Free, Windows)
- [VoiceOver](https://www.apple.com/accessibility/vision/) (Built-in, macOS/iOS)
- [TalkBack](https://support.google.com/accessibility/android/answer/6283677) (Built-in, Android)

## Support

For accessibility questions or issues:

1. **Check Documentation**: Review this guide and component documentation
2. **Run Tests**: Use automated accessibility testing tools
3. **Manual Testing**: Test with keyboard and screen readers
4. **Report Issues**: Create detailed accessibility bug reports
5. **Continuous Improvement**: Contribute to ongoing accessibility enhancements

---

*This accessibility implementation ensures that the randomizer feature is usable by all users, regardless of their abilities or the assistive technologies they use.*