import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { isMobile } from '../utils/device';
import { getAppIconUrl } from '../utils/imageUtils';

const DesktopAlert: React.FC = () => {
  if (isMobile()) return null;

  const url = window.location.href;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 9999,
        background: 'rgba(128,128,128,0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="bg-purple-100 border border-purple-400 rounded-lg shadow-xl flex flex-col items-center p-8 max-w-sm"
        style={{ pointerEvents: 'auto' }} // Ensure alert box is interactive
      >
        <div className="mb-4">
          <img src={getAppIconUrl()} alt="GitHub Media Recorder" className="w-16 h-16" />
        </div>
        <div className="text-lg font-semibold text-purple-800 mb-2 text-center">
          For best experience, open this app on your mobile device!
        </div>
        <div className="text-sm text-purple-700 mb-4 text-center">
          Scan this QR code with your phone to open:
        </div>
        <QRCodeCanvas value={url} size={256} />
      </div>
    </div>
  );
};

export default DesktopAlert;