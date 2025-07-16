import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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
        className="bg-blue-100 border border-blue-400 rounded-lg shadow-xl flex flex-col items-center p-8 max-w-sm"
        style={{ pointerEvents: 'auto' }} // Ensure alert box is interactive
      >
        <div className="text-lg font-semibold text-blue-800 mb-2 text-center">
          For best experience, open this app on your mobile device!
        </div>
        <div className="text-sm text-blue-700 mb-4 text-center">
          Scan this QR code with your phone to open:
        </div>
        <QRCodeCanvas value={url} size={256} />
      </div>
    </div>
  );
};

export default DesktopAlert;