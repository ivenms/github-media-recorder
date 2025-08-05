
import React from 'react';
import { render, screen } from '@testing-library/react';
import DesktopAlert from '../../src/components/DesktopAlert';
import { isMobile } from '../../src/utils/device';

jest.mock('../../src/utils/device');
jest.mock('qrcode.react', () => ({
  QRCodeCanvas: jest.fn(() => <div data-testid="qr-code" />),
}));

jest.mock('../../src/utils/imageUtils', () => ({
  getAppIconUrl: jest.fn(),
}));

describe('DesktopAlert', () => {
  const mockIsMobile = isMobile as jest.Mock;
  const mockGetAppIconUrl = require('../../src/utils/imageUtils').getAppIconUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as Window & { location?: Location }).location;
    (window as Window & { location?: Partial<Location> }).location = { href: 'http://localhost/' };
  });

  test('should not render on mobile devices', () => {
    mockIsMobile.mockReturnValue(true);
    const { container } = render(<DesktopAlert />);
    expect(container.firstChild).toBeNull();
  });

  test('should render on desktop devices', () => {
    mockIsMobile.mockReturnValue(false);
    mockGetAppIconUrl.mockReturnValue('app-icon-url');
    render(<DesktopAlert />);

    expect(screen.getByText('For best experience, open this app on your mobile device!')).toBeInTheDocument();
    expect(screen.getByText('Scan this QR code with your phone to open:')).toBeInTheDocument();
    expect(screen.getByAltText('GitHub Media Recorder')).toHaveAttribute('src', 'app-icon-url');
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });
});
