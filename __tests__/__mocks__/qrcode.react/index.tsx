// QRCode.react mock
import React from 'react';

// Mock QRCodeSVG component
export const QRCodeSVG = React.forwardRef<
  SVGSVGElement,
  {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    imageSettings?: {
      src: string;
      height: number;
      width: number;
      excavate: boolean;
    };
    bgColor?: string;
    fgColor?: string;
    className?: string;
    style?: React.CSSProperties;
  }
>(({ value, size = 128, level = 'M', includeMargin = false, bgColor = '#FFFFFF', fgColor = '#000000', className, style, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      data-testid="qr-code-svg"
      data-value={value}
      data-size={size}
      data-level={level}
      data-include-margin={includeMargin}
      data-bg-color={bgColor}
      data-fg-color={fgColor}
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      {...props}
    >
      {/* Mock QR code pattern - just a simple grid for testing */}
      <rect width={size} height={size} fill={bgColor} />
      <g fill={fgColor}>
        {/* Mock QR code modules - simplified pattern */}
        {Array.from({ length: 25 }, (_, row) =>
          Array.from({ length: 25 }, (_, col) => {
            const shouldFill = (row + col) % 3 === 0; // Simple pattern
            if (shouldFill) {
              return (
                <rect
                  key={`${row}-${col}`}
                  x={(col * size) / 25}
                  y={(row * size) / 25}
                  width={size / 25}
                  height={size / 25}
                />
              );
            }
            return null;
          })
        )}
      </g>
      {/* Add text for easier testing identification */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fill={fgColor}
        opacity="0.1"
      >
        QR: {value.substring(0, 10)}...
      </text>
    </svg>
  );
});

QRCodeSVG.displayName = 'QRCodeSVG';

// Mock QRCodeCanvas component
export const QRCodeCanvas = React.forwardRef<
  HTMLCanvasElement,
  {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    imageSettings?: {
      src: string;
      height: number;
      width: number;
      excavate: boolean;
    };
    bgColor?: string;
    fgColor?: string;
    className?: string;
    style?: React.CSSProperties;
  }
>(({ value, size = 128, level = 'M', includeMargin = false, bgColor = '#FFFFFF', fgColor = '#000000', className, style, ...props }, ref) => {
  React.useEffect(() => {
    // Mock canvas drawing
    if (ref && typeof ref === 'object' && ref.current) {
      const canvas = ref.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        
        // Draw simple pattern
        ctx.fillStyle = fgColor;
        for (let row = 0; row < 25; row++) {
          for (let col = 0; col < 25; col++) {
            if ((row + col) % 3 === 0) {
              ctx.fillRect(
                (col * size) / 25,
                (row * size) / 25,
                size / 25,
                size / 25
              );
            }
          }
        }
      }
    }
  }, [value, size, bgColor, fgColor]);

  return (
    <canvas
      ref={ref}
      data-testid="qr-code-canvas"
      data-value={value}
      data-size={size}
      data-level={level}
      data-include-margin={includeMargin}
      data-bg-color={bgColor}
      data-fg-color={fgColor}
      className={className}
      style={style}
      width={size}
      height={size}
      {...props}
    />
  );
});

QRCodeCanvas.displayName = 'QRCodeCanvas';

// Default export (legacy)
const QRCode = QRCodeSVG;
export default QRCode;

// Test utilities
export const qrCodeTestUtils = {
  // Helper to verify QR code props
  verifyQRCodeProps: (element: HTMLElement, expectedProps: any) => {
    const { value, size, level, bgColor, fgColor } = expectedProps;
    
    if (value !== undefined) {
      expect(element).toHaveAttribute('data-value', value);
    }
    if (size !== undefined) {
      expect(element).toHaveAttribute('data-size', size.toString());
    }
    if (level !== undefined) {
      expect(element).toHaveAttribute('data-level', level);
    }
    if (bgColor !== undefined) {
      expect(element).toHaveAttribute('data-bg-color', bgColor);
    }
    if (fgColor !== undefined) {
      expect(element).toHaveAttribute('data-fg-color', fgColor);
    }
  },

  // Helper to check if QR code is rendered
  isQRCodeRendered: (container: HTMLElement, type: 'svg' | 'canvas' = 'svg') => {
    const testId = type === 'svg' ? 'qr-code-svg' : 'qr-code-canvas';
    return !!container.querySelector(`[data-testid="${testId}"]`);
  },

  // Mock QR code validation (simulate what real QR codes would contain)
  validateQRCodeValue: (value: string) => {
    // Simple validation for common URL patterns used in the app
    const urlPattern = /^https?:\/\/.+/;
    const isValidUrl = urlPattern.test(value);
    
    return {
      isValid: isValidUrl || value.length > 0,
      type: isValidUrl ? 'url' : 'text',
      length: value.length,
    };
  },
};