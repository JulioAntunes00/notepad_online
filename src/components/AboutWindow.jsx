import React from 'react';
import { useTranslation } from 'react-i18next';

export default function AboutWindow({ windowData, onClose }) {
  const { t } = useTranslation();
  const { title, x, y, width, height, zIndex } = windowData;

  return (
    <div
      className="window absolute flex flex-col select-none pointer-events-auto"
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
        zIndex: zIndex
      }}
    >
      <div className="title-bar" onMouseDown={(e) => e.stopPropagation()}>
        <div className="title-bar-text px-1 flex items-center gap-1">
          <img src="/Help and Support.png" alt="Help" className="w-[14px] h-[14px]" />
          {title}
        </div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={() => onClose(windowData.id)} />
        </div>
      </div>

      <div className="window-body flex-1 p-0 overflow-y-auto !m-[3px] bg-white border border-[#7f9db9]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-5 font-sans text-[12px] text-black leading-relaxed">
          <h1 className="text-[24px] font-bold mb-4 font-serif text-[#003399]">RetroNote XP</h1>
          
          <p className="mb-4">
            {t('aboutWindow.description')}
          </p>

          <h2 className="text-[16px] font-bold mt-6 mb-2 border-b border-gray-300 pb-1 text-[#003399]">{t('aboutWindow.techTitle')}</h2>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li><strong>Frontend:</strong> {t('aboutWindow.techList.frontend')}</li>
            <li><strong>{t('notepadWindow.suffix')} (CSS):</strong> {t('aboutWindow.techList.styling')}</li>
            <li><strong>{t('recycleBinWindow.objects', { count: 2 })} & {t('desktop.notepad')}:</strong> {t('aboutWindow.techList.state')}</li>
            <li><strong>{t('recycleBinWindow.action')}:</strong> {t('aboutWindow.techList.persistence')}</li>
            <li><strong>Offline:</strong> {t('aboutWindow.techList.resilience')}</li>
          </ul>

          <h2 className="text-[16px] font-bold mt-6 mb-2 border-b border-gray-300 pb-1 text-[#003399]">{t('aboutWindow.highlightsTitle')}</h2>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li><strong>{t('recycleBinWindow.title')}:</strong> {t('aboutWindow.highlightsList.manager')}</li>
            <li><strong>React:</strong> {t('aboutWindow.highlightsList.optimization')}</li>
            <li><strong>Sync:</strong> {t('aboutWindow.highlightsList.sync')}</li>
          </ul>

          <div className="mt-8 p-3 bg-[#ffffe1] border border-[#716f64] text-[11px]">
            <strong>{t('aboutWindow.noteRecruiters')}</strong><br />
            {t('aboutWindow.noteDescription')}
          </div>
        </div>
      </div>
    </div>
  );
}
