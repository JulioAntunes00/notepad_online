import React from 'react';

export default function XPAlertWindow({ windowData, onClose }) {
  const { title, context, x, y, width, height, zIndex } = windowData;
  const isError = context?.type === 'error';

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
        <div className="title-bar-text px-1">{title || 'Message'}</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={() => onClose(windowData.id)} />
        </div>
      </div>

      <div className="window-body flex-1 p-5 flex gap-5 items-start bg-[#ece9d8] overflow-hidden m-0 xp-border">
        {/* Ícone Estilo Bolha 3D */}
        <div className="flex-shrink-0">
          {isError ? (
            <div className="w-[34px] h-[34px] bg-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-[1px_1px_2px_rgba(0,0,0,0.5)] relative overflow-hidden"
              style={{ background: 'radial-gradient(circle at 30% 30%, #ff5a33, #b02d0d)' }}>
              <span className="text-white text-xl font-bold drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]">×</span>
            </div>
          ) : (
            <div className="w-[34px] h-[34px] bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-[1px_1px_2px_rgba(0,0,0,0.5)]"
              style={{ background: 'radial-gradient(circle at 30% 30%, #3a91f4, #003cc2)' }}>
              <span className="text-white text-xl font-bold italic serif">i</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 w-full">
          <div className="text-[12px] text-black font-sans leading-snug pt-1 pr-2 text-left">
            {context?.message || 'Ação concluída com sucesso.'}
          </div>
          <div className="flex justify-start w-full mt-auto pl-[60px]">
            <button
              className="px-8 py-1 m-1"
              onClick={() => onClose(windowData.id)}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
