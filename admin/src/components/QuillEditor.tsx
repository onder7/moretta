import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { api } from '../lib/api';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['link', 'image'],
  ['blockquote', 'code-block'],
  ['clean'],
];

const EMPTY = '<p><br></p>';

// Quill'in koruyamayacağı zengin HTML (tam sayfa şablonları): <style>, <div>,
// <table>, class="..." vb. Böyle içerik editöre yüklenince Quill kırpar; bu
// yüzden karmaşık içerik editörü doğrudan HTML kaynak modunda açar.
const isComplexHtml = (html: string) =>
  /<(style|div|table|section|article|figure|iframe|script)\b|\sclass\s*=/i.test(html || '');

export function QuillEditor({ value, onChange, placeholder, minHeight = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const isInternalChange = useRef(false);
  const lastExternalValue = useRef(value);
  // Programatik innerHTML yüklemesi sırasında tetiklenen text-change'i bastırır;
  // böylece bir sayfayı sadece AÇMAK içeriği (Quill'in kırptığı haliyle) kaydetmez.
  const loadingRef = useRef(false);

  // Zengin/karmaşık içerik (Quill'in kırptığı <style>/<div>) — Görsel sekmesi
  // gizlenir, HTML + Önizleme sunulur.
  const complexMode = useRef(isComplexHtml(value)).current;
  // Görünüm: editor (Quill görsel) | source (HTML) | preview (render)
  const [view, setView] = useState<'editor' | 'source' | 'preview'>(complexMode ? 'source' : 'editor');

  // Quill'e içeriği güvenli yükle: onChange tetiklenmez
  const loadIntoQuill = (html: string) => {
    const q = quillRef.current;
    if (!q) return;
    loadingRef.current = true;
    q.root.innerHTML = html || '';
    lastExternalValue.current = html || '';
    setTimeout(() => { loadingRef.current = false; }, 0);
  };

  const changeView = (next: 'editor' | 'source' | 'preview') => {
    if (next === 'editor') loadIntoQuill(value || ''); // güncel HTML'i editöre al (onChange yok)
    setView(next);
  };

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const q = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: placeholder ?? 'İçerik yazın...',
      modules: {
        toolbar: {
          container: TOOLBAR,
          handlers: {
            image: () => {
              const input = document.createElement('input');
              input.setAttribute('type', 'file');
              input.setAttribute('accept', 'image/*');
              input.click();
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                try {
                  const res = await api.upload<{ success: boolean; data: { url: string } }>(
                    '/admin/upload',
                    file,
                  );
                  const url = res?.data?.url;
                  if (!url) return;
                  const range = q.getSelection(true);
                  q.insertEmbed(range.index, 'image', url);
                  q.setSelection(range.index + 1, 0);
                } catch {
                  alert('Resim yüklenemedi.');
                }
              };
            },
          },
        },
      },
    });

    quillRef.current = q;

    // İlk yükleme — programatik, onChange tetiklenmemeli (loadingRef bastırır)
    if (value) {
      loadingRef.current = true;
      q.root.innerHTML = value;
      setTimeout(() => { loadingRef.current = false; }, 0);
    }

    q.on('text-change', () => {
      if (loadingRef.current) return; // programatik yükleme — kullanıcı değişikliği değil
      isInternalChange.current = true;
      const html = q.root.innerHTML;
      const cleaned = html === EMPTY ? '' : html;
      lastExternalValue.current = cleaned;
      onChangeRef.current(cleaned);
    });

    // ── Resim Resize ──────────────────────────────────────────────
    const editor = q.root;
    const qlContainer = editor.parentElement as HTMLElement;
    let overlay: HTMLDivElement | null = null;
    let activeImg: HTMLImageElement | null = null;

    const updateOverlayPos = () => {
      if (!overlay || !activeImg) return;
      const ir = activeImg.getBoundingClientRect();
      const cr = qlContainer.getBoundingClientRect();
      overlay.style.top = `${ir.top - cr.top + qlContainer.scrollTop}px`;
      overlay.style.left = `${ir.left - cr.left + qlContainer.scrollLeft}px`;
      overlay.style.width = `${ir.width}px`;
      overlay.style.height = `${ir.height}px`;
    };

    const removeOverlay = () => {
      overlay?.remove();
      overlay = null;
      activeImg = null;
    };

    const showOverlay = (img: HTMLImageElement) => {
      removeOverlay();
      activeImg = img;

      const el = document.createElement('div');
      el.style.cssText =
        'position:absolute;border:2px dashed #3C50E0;pointer-events:none;z-index:50;box-sizing:border-box;';

      // 4 köşe tutacağı
      const corners = [
        { pos: 'top:-5px;left:-5px', cursor: 'nw-resize', isRight: false },
        { pos: 'top:-5px;right:-5px', cursor: 'ne-resize', isRight: true },
        { pos: 'bottom:-5px;right:-5px', cursor: 'se-resize', isRight: true },
        { pos: 'bottom:-5px;left:-5px', cursor: 'sw-resize', isRight: false },
      ];

      corners.forEach(({ pos, cursor, isRight }) => {
        const handle = document.createElement('div');
        handle.style.cssText = `position:absolute;width:10px;height:10px;background:#fff;border:2px solid #3C50E0;border-radius:50%;pointer-events:all;cursor:${cursor};${pos};`;

        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const startX = e.clientX;
          const startW = img.getBoundingClientRect().width;
          let currentW = startW;

          const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            currentW = Math.max(50, isRight ? startW + dx : startW - dx);
            img.style.width = `${currentW}px`;
            img.style.height = 'auto';
            updateOverlayPos();
          };

          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            img.style.width = `${Math.round(currentW)}px`;
            img.style.height = 'auto';
            updateOverlayPos();
            // onChange'e innerHTML ile bildir — width korunur
            const html = q.root.innerHTML;
            isInternalChange.current = true;
            const cleaned = html === EMPTY ? '' : html;
            lastExternalValue.current = cleaned;
            onChangeRef.current(cleaned);
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        el.appendChild(handle);
      });

      qlContainer.appendChild(el);
      overlay = el;
      updateOverlayPos();
    };

    const onEditorClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        showOverlay(target as HTMLImageElement);
      } else if (!overlay?.contains(target)) {
        removeOverlay();
      }
    };

    const onDocClick = (e: MouseEvent) => {
      if (!qlContainer.contains(e.target as Node)) {
        removeOverlay();
      }
    };

    editor.addEventListener('click', onEditorClick);
    document.addEventListener('click', onDocClick);

    return () => {
      editor.removeEventListener('click', onEditorClick);
      document.removeEventListener('click', onDocClick as EventListener);
      removeOverlay();
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dışarıdan gelen value değişikliklerini editöre yansıt (programatik → onChange yok)
  useEffect(() => {
    const q = quillRef.current;
    if (!q || isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    // Sadece görsel editör görünürken editöre yansıt; source/preview kendi yönetir
    if (view === 'editor' && value !== lastExternalValue.current) {
      loadIntoQuill(value ?? '');
    }
  }, [value]);

  return (
    <div className={`quill-wrapper rounded border border-stroke dark:border-strokedark overflow-hidden${view !== 'editor' ? ' hide-editor' : ''}`}>
      <style>{`
        .quill-wrapper .qe-bar {
          display: flex; justify-content: flex-end; align-items: center; gap: 4px;
          padding: 4px 6px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
        }
        .dark .quill-wrapper .qe-bar { background: #16202e; border-bottom-color: #2d3d52; }
        .quill-wrapper .qe-tab {
          font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px;
          border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .quill-wrapper .qe-tab:hover { background: #eef2ff; }
        .quill-wrapper .qe-tab.active { background: #3C50E0; color: #fff; border-color: #3C50E0; }
        .dark .quill-wrapper .qe-tab { background: #1e2a3a; color: #94a3b8; border-color: #2d3d52; }
        .dark .quill-wrapper .qe-tab:hover { background: #24344a; }
        .dark .quill-wrapper .qe-tab.active { background: #3C50E0; color: #fff; border-color: #3C50E0; }
        .quill-wrapper.hide-editor .ql-toolbar,
        .quill-wrapper.hide-editor .ql-container { display: none; }
        .quill-wrapper .qe-preview {
          width: 100%; border: none; background: #fff; display: block;
        }
        .quill-wrapper .qe-source {
          width: 100%; border: none; outline: none; padding: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12.5px; line-height: 1.6; color: #0f172a; background: #fff;
          resize: vertical; white-space: pre-wrap; word-break: break-word;
        }
        .dark .quill-wrapper .qe-source { background: #1a2535; color: #e2e8f0; }
        .quill-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-wrap: wrap;
        }
        .dark .quill-wrapper .ql-toolbar {
          background: #1e2a3a;
          border-bottom-color: #2d3d52;
        }
        .dark .quill-wrapper .ql-toolbar .ql-stroke { stroke: #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-fill  { fill:   #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-picker-label { color: #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-picker-options { background: #1e2a3a; border-color: #2d3d52; }
        .dark .quill-wrapper .ql-toolbar .ql-picker-item { color: #94a3b8; }
        .dark .quill-wrapper .ql-toolbar button:hover .ql-stroke,
        .dark .quill-wrapper .ql-toolbar button.ql-active .ql-stroke { stroke: #fff; }
        .dark .quill-wrapper .ql-toolbar button:hover .ql-fill,
        .dark .quill-wrapper .ql-toolbar button.ql-active .ql-fill  { fill:   #fff; }
        .quill-wrapper .ql-container {
          border: none;
          font-size: 0.875rem;
          font-family: inherit;
        }
        .dark .quill-wrapper .ql-container { background: #1a2535; color: #e2e8f0; }
        .dark .quill-wrapper .ql-editor.ql-blank::before { color: #64748b; }
        .quill-wrapper .ql-editor { min-height: ${minHeight}px; }
        .quill-wrapper .ql-editor p { margin-bottom: 0.5rem; }
        .quill-wrapper .ql-editor img {
          max-width: 100%;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
          cursor: pointer;
          display: block;
        }
        .quill-wrapper .ql-editor img.selected { outline: 2px dashed #3C50E0; }
        .quill-wrapper .ql-editor blockquote { border-left: 3px solid #3C50E0; padding-left: 1rem; margin: 0 0 .75rem; color: #64748b; font-style: italic; }
        .quill-wrapper .ql-editor pre.ql-syntax { background: #1e293b; color: #e2e8f0; padding: .75rem 1rem; border-radius: .375rem; font-size: .8rem; overflow-x: auto; }
      `}</style>
      <div className="qe-bar">
        {!complexMode && (
          <button type="button" onClick={() => changeView('editor')} className={`qe-tab${view === 'editor' ? ' active' : ''}`}>
            Görsel
          </button>
        )}
        <button type="button" onClick={() => changeView('source')} className={`qe-tab${view === 'source' ? ' active' : ''}`}>
          {'</>'} HTML
        </button>
        <button type="button" onClick={() => changeView('preview')} className={`qe-tab${view === 'preview' ? ' active' : ''}`}>
          👁 Önizleme
        </button>
      </div>
      {/* Görsel editör (Quill) — DOM'da kalır; editör dışı görünümde CSS gizler */}
      <div ref={containerRef} />
      {view === 'source' && (
        <textarea
          className="qe-source"
          value={value}
          spellCheck={false}
          style={{ minHeight }}
          onChange={(e) => onChangeRef.current(e.target.value)}
          placeholder="<div>HTML kaynak kodu…</div>"
        />
      )}
      {view === 'preview' && (
        <iframe
          className="qe-preview"
          style={{ minHeight }}
          srcDoc={value || '<p style="color:#94a3b8;font-family:sans-serif;padding:12px">İçerik yok</p>'}
          title="Önizleme"
          sandbox=""
        />
      )}
    </div>
  );
}
