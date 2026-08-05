'use client';

import { useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { uploadImageAction } from '@/app/actions/upload';
import { HOMEPAGE_SECTION_IDS, HomepageSectionId } from '@/lib/data';
import ImageCropUploader from '@/components/admin/ImageCropUploader';

const SECTION_LABELS: Record<HomepageSectionId, string> = {
  meninas: 'Card · Meninas',
  meninos: 'Card · Meninos',
  queridos: 'Mais queridos',
  manifesto: 'Nosso manifesto',
  colecoes: 'Coleções conceituais',
  fases: 'Para cada fase',
  depoimentos: 'Depoimentos',
  instagram: 'No instagram',
};


export default function AdminHomepagePage() {
  const { homepageConfig, updateHomepageSection } = useAdmin();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleToggle = (id: HomepageSectionId) => {
    const section = homepageConfig[id];
    updateHomepageSection(id, { visible: !section.visible });
  };

  const handleUpload = async (id: HomepageSectionId, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const section = homepageConfig[id];
    const uploaded = await Promise.all(
      Array.from(files).map(async file => {
        const fd = new FormData();
        fd.append('file', file);
        return uploadImageAction(fd);
      })
    );
    const newUrls = id === 'instagram'
      ? [...section.imageUrls, ...uploaded].slice(0, 6)
      : [uploaded[uploaded.length - 1]];
    updateHomepageSection(id, { imageUrls: newUrls });
  };

  const handleRemovePhoto = (id: HomepageSectionId, index: number) => {
    const section = homepageConfig[id];
    const newUrls = section.imageUrls.filter((_, i) => i !== index);
    updateHomepageSection(id, { imageUrls: newUrls });
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Homepage</h1>
      </div>

      <div className="adm-homepage-list">
        {HOMEPAGE_SECTION_IDS.map(id => {
          const section = homepageConfig[id];
          const isInstagram = id === 'instagram';

          return (
            <div key={id} className={`adm-homepage-row ${!section.visible ? 'adm-homepage-row--hidden' : ''}`}>
              <div className="adm-homepage-row-main">
                <span className="adm-homepage-label">{SECTION_LABELS[id]}</span>

                {(id === 'meninas' || id === 'meninos') && (
                  <ImageCropUploader
                    aspect={7 / 11}
                    currentUrl={section.imageUrls[0]}
                    onUpload={url => updateHomepageSection(id, { imageUrls: [url] })}
                    label="foto"
                  />
                )}
                {isInstagram && (
                  <div className="adm-homepage-photos">
                    {section.imageUrls.map((url, i) => (
                      <div key={i} className="adm-homepage-thumb-wrap">
                        <img src={url} alt="" className="adm-homepage-thumb" />
                        <button
                          className="adm-homepage-thumb-remove"
                          onClick={() => handleRemovePhoto(id, i)}
                          title="Remover"
                        >×</button>
                      </div>
                    ))}
                    {section.imageUrls.length < 6 && (
                      <>
                        <button
                          className="adm-homepage-upload-btn"
                          onClick={() => inputRefs.current[id]?.click()}
                        >
                          + foto
                        </button>
                        <input
                          ref={el => { inputRefs.current[id] = el; }}
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={e => handleUpload(id, e.target.files)}
                        />
                      </>
                    )}
                  </div>
                )}

                <button
                  className={`adm-homepage-toggle ${section.visible ? 'adm-homepage-toggle--on' : 'adm-homepage-toggle--off'}`}
                  onClick={() => handleToggle(id)}
                >
                  {section.visible ? 'visível' : 'oculto'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
