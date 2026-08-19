import React, { useState } from 'react';
import { EventGalleryImage, CurrentUser } from '../types';
import { INITIAL_EVENT_GALLERY } from '../mockData';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  RotateCcw,
  Calendar,
  Tag,
  Maximize2,
  Check,
  FolderOpen,
  Folder,
  ExternalLink,
} from 'lucide-react';

interface EventGallerySectionProps {
  gallery: EventGalleryImage[];
  onSaveGallery: (gallery: EventGalleryImage[]) => void;
  currentUser: CurrentUser;
  onOpenLogin?: () => void;
}

export const CATEGORY_OPTIONS = [
  'गणेशोत्सव',
  'विसर्जन मिरवणूक',
  'सजावट व रोषणाई',
  'महाप्रसाद',
  'सामाजिक उपक्रम',
  'धार्मिक कार्यक्रम',
  'सांस्कृतिक व क्रीडा',
  'सामाजिक कार्य',
  'इतर',
];

export const DEFAULT_CATEGORY_DRIVE_LINKS: Record<string, string> = {
  'गणेशोत्सव': 'https://drive.google.com/drive/folders/morya_ganeshotsav_photos',
  'विसर्जन मिरवणूक': 'https://drive.google.com/drive/folders/morya_visarjan_photos',
  'सजावट व रोषणाई': 'https://drive.google.com/drive/folders/morya_decoration_photos',
  'महाप्रसाद': 'https://drive.google.com/drive/folders/morya_mahaprasad_photos',
  'सामाजिक उपक्रम': 'https://drive.google.com/drive/folders/morya_social_initiatives',
  'धार्मिक कार्यक्रम': 'https://drive.google.com/drive/folders/morya_religious_events',
  'सांस्कृतिक व क्रीडा': 'https://drive.google.com/drive/folders/morya_cultural_sports',
  'सामाजिक कार्य': 'https://drive.google.com/drive/folders/morya_social_work',
  'इतर': 'https://drive.google.com/drive/folders/morya_event_photos',
  'सर्व': 'https://drive.google.com/drive/folders/morya_all_event_photos',
};

export const getCategoryDriveUrl = (category?: string, itemDriveUrl?: string) => {
  if (itemDriveUrl && itemDriveUrl.trim() !== '') return itemDriveUrl.trim();
  if (category && DEFAULT_CATEGORY_DRIVE_LINKS[category]) return DEFAULT_CATEGORY_DRIVE_LINKS[category];
  return 'https://drive.google.com';
};

export const EventGallerySection: React.FC<EventGallerySectionProps> = ({
  gallery,
  onSaveGallery,
  currentUser,
  onOpenLogin,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('सर्व');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isAdmin = isLoggedIn && ['ॲडमिन', 'Admin'].includes(currentUser.role?.trim() || '');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('गणेशोत्सव');
  const [formDate, setFormDate] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDriveUrl, setFormDriveUrl] = useState('');
  const [formYear, setFormYear] = useState('२०२५-२६');

  // Inline description & title edit state for Lightbox
  const [isEditingInlineDesc, setIsEditingInlineDesc] = useState(false);
  const [inlineDescText, setInlineDescText] = useState('');
  const [isEditingInlineTitle, setIsEditingInlineTitle] = useState(false);
  const [inlineTitleText, setInlineTitleText] = useState('');

  // Preview tab in modal: 'upload' | 'url'
  const [inputTab, setInputTab] = useState<'upload' | 'url'>('upload');

  const filteredGallery =
    selectedCategory === 'सर्व'
      ? gallery
      : gallery.filter((item) => item.category === selectedCategory);

  const openAddModal = () => {
    if (!isLoggedIn) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    setEditingId(null);
    setFormTitle('');
    setFormCategory('गणेशोत्सव');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormImageUrl('');
    setFormDescription('');
    setFormDriveUrl(DEFAULT_CATEGORY_DRIVE_LINKS['गणेशोत्सव'] || '');
    setFormYear('२०२५-२६');
    setIsModalOpen(true);
  };

  const openEditModal = (item: EventGalleryImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      alert('फोटोचे वर्णन किंवा बदल करण्याचे अधिकार केवळ ॲडमिन (Admin) यांनाच आहेत. कृपया ॲडमिन लॉगिन करा.');
      if (onOpenLogin) onOpenLogin();
      return;
    }
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormCategory(item.category || 'गणेशोत्सव');
    setFormDate(item.dateStr || '');
    setFormImageUrl(item.imageUrl);
    setFormDescription(item.description || '');
    setFormDriveUrl(item.googleDriveUrl || DEFAULT_CATEGORY_DRIVE_LINKS[item.category || 'गणेशोत्सव'] || '');
    setFormYear(item.year || '२०२५-२६');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (window.confirm('तुम्हाला खरोखर हा फोटो गॅलरीमधून काढायचा आहे का?')) {
      const updated = gallery.filter((g) => g.id !== id);
      onSaveGallery(updated);
    }
  };

  const handleResetDefault = () => {
    if (!isLoggedIn) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (window.confirm('मूळ मॅन्युअल ७-८ फोटो गॅलरी रीसेट करायची आहे का?')) {
      onSaveGallery(INITIAL_EVENT_GALLERY);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('कृपया ५MB पेक्षा लहान आकाराचा फोटो निवडा.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('कृपया कार्यक्रमाचे नाव प्रविष्ट करा.');
      return;
    }
    if (!formImageUrl.trim()) {
      alert('कृपया फोटोची इमेज लिंक टाका किंवा डिव्हाइसवरून फोटो अपलोड करा.');
      return;
    }

    if (editingId) {
      // Update existing
      const updated = gallery.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: formTitle.trim(),
              category: formCategory,
              dateStr: formDate,
              imageUrl: formImageUrl,
              description: formDescription.trim(),
              googleDriveUrl: formDriveUrl.trim(),
              year: formYear,
            }
          : item
      );
      onSaveGallery(updated);
    } else {
      // Add new
      const newItem: EventGalleryImage = {
        id: 'gal-' + Date.now(),
        title: formTitle.trim(),
        category: formCategory,
        dateStr: formDate,
        imageUrl: formImageUrl,
        description: formDescription.trim(),
        googleDriveUrl: formDriveUrl.trim(),
        year: formYear,
      };
      onSaveGallery([newItem, ...gallery]);
    }

    setIsModalOpen(false);
  };

  // Lightbox Navigation
  const prevLightbox = () => {
    setIsEditingInlineTitle(false);
    setIsEditingInlineDesc(false);
    if (lightboxIndex !== null && filteredGallery.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + filteredGallery.length) % filteredGallery.length);
    }
  };

  const nextLightbox = () => {
    setIsEditingInlineTitle(false);
    setIsEditingInlineDesc(false);
    if (lightboxIndex !== null && filteredGallery.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % filteredGallery.length);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>उत्सव व कार्यक्रम फोटो दालन</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                मोरया ग्रुपच्या गणेशोत्सव, महाप्रसाद, सामाजिक व सांस्कृतिक उपक्रमांच्या आठवणी (बदलण्यायोग्य)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ नवीन फोटो जोडा</span>
          </button>
          <button
            onClick={handleResetDefault}
            title="मूळ फोटो गॅलरी रीसेट करा"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">रीसेट</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills & Google Drive Quick Folder Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs flex-wrap">
          <button
            onClick={() => setSelectedCategory('सर्व')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'सर्व'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            सर्व
          </button>
          {CATEGORY_OPTIONS.map((cat) => {
            const count = gallery.filter((item) => item.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Quick Google Drive Folder Button for Active Category */}
        <a
          href={getCategoryDriveUrl(selectedCategory)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-bold border border-amber-500/40 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          title="Google Drive वरील सर्व फोटो फोल्डर उघडा"
        >
          <FolderOpen className="w-4 h-4 text-amber-600" />
          <span>{selectedCategory === 'सर्व' ? 'सर्व फोटो (Google Drive)' : `${selectedCategory} Drive फोल्डर`}</span>
          <ExternalLink className="w-3 h-3 text-amber-600" />
        </a>
      </div>

      {/* Photo Grid */}
      {filteredGallery.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">या श्रेणीमध्ये कोणतेही फोटो उपलब्ध नाहीत</p>

          <button
            onClick={openAddModal}
            className="mt-3 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
          >
            + पहिला फोटो जोडा
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredGallery.map((item, index) => {
            const driveUrl = getCategoryDriveUrl(item.category, item.googleDriveUrl);
            return (
              <div
                key={item.id}
                onClick={() => setLightboxIndex(index)}
                className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 overflow-hidden bg-slate-950">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback image on load error
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80';
                    }}
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                  {/* Top badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-amber-300 font-bold text-[10px] rounded-md border border-amber-500/30">
                      {item.category || 'कार्यक्रम'}
                    </span>
                    {item.dateStr && (
                      <span className="px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-slate-300 text-[10px] rounded-md">
                        {item.dateStr}
                      </span>
                    )}
                  </div>

                  {/* Edit & Delete Quick Action Hover Buttons */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => openEditModal(item, e)}
                      title="संपादित करा"
                      className="p-1.5 bg-slate-900/90 hover:bg-amber-500 text-white hover:text-slate-950 rounded-lg shadow cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      title="काढून टाका"
                      className="p-1.5 bg-slate-900/90 hover:bg-rose-600 text-white rounded-lg shadow cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Zoom Icon indicator */}
                  <div className="absolute bottom-2.5 right-2.5 p-1.5 bg-slate-900/70 text-amber-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Text content */}
                <div className="p-3 bg-slate-900 text-white flex-1 flex flex-col justify-between border-t border-slate-800">
                  <div>
                    <h4 className="font-bold text-xs text-amber-300 line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-snug">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 gap-1.5">
                    {/* Google Drive Link */}
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-md border border-amber-500/30 transition-colors flex items-center gap-1 font-bold cursor-pointer"
                      title="Google Drive वर अधिक फोटो पहा"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>अधिक फोटो (Drive)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    <span className="text-amber-400 font-bold group-hover:underline">
                      पहा & edit ➔
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && filteredGallery[lightboxIndex] && (() => {
        const activeItem = filteredGallery[lightboxIndex];
        const driveUrl = getCategoryDriveUrl(activeItem.category, activeItem.googleDriveUrl);
        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black text-xs rounded-md">
                    {activeItem.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    फोटो {lightboxIndex + 1} पैकी {filteredGallery.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Google Drive Link in Lightbox */}
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    title="या कार्यक्रमाचे सर्व फोटो Google Drive वर उघडा"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Drive वरील सर्व फोटो उघडा</span>
                    <span className="sm:hidden">Drive फोटो</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={(e) => openEditModal(activeItem, e)}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs rounded-lg border border-amber-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>संपादित करा</span>
                  </button>
                  <button
                    onClick={() => setLightboxIndex(null)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Image Display */}
              <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
                <img
                  src={activeItem.imageUrl}
                  alt={activeItem.title}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />

                {/* Prev / Next Arrows */}
                {filteredGallery.length > 1 && (
                  <>
                    <button
                      onClick={prevLightbox}
                      className="absolute left-3 p-2 bg-slate-950/80 hover:bg-amber-500 text-white hover:text-slate-950 rounded-full border border-slate-700 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextLightbox}
                      className="absolute right-3 p-2 bg-slate-950/80 hover:bg-amber-500 text-white hover:text-slate-950 rounded-full border border-slate-700 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Bottom Caption Info with Admin Title & Description Edit Options */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 text-white space-y-2">
                {/* Title Section with Inline Edit */}
                {isEditingInlineTitle ? (
                  <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/50 space-y-2">
                    <label className="block text-[11px] font-bold text-amber-300">
                      ॲडमिन: फोटोचे नवीन शीर्षक (Title) प्रविष्ट करा
                    </label>
                    <input
                      type="text"
                      value={inlineTitleText}
                      onChange={(e) => setInlineTitleText(e.target.value)}
                      placeholder="उदा. श्री गणेश मूर्ती प्रतिष्ठापना सोहळा"
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-amber-300 font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingInlineTitle(false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        रद्द करा
                      </button>
                      <button
                        onClick={() => {
                          if (!inlineTitleText.trim()) {
                            alert('कृपया शीर्षक रिकामे ठेवू नका.');
                            return;
                          }
                          const targetId = activeItem.id;
                          const updated = gallery.map((item) =>
                            item.id === targetId ? { ...item, title: inlineTitleText.trim() } : item
                          );
                          onSaveGallery(updated);
                          setIsEditingInlineTitle(false);
                        }}
                        className="px-4 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>शीर्षक साठवा (Save Title)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-base font-black text-amber-400">
                        {activeItem.title}
                      </h3>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setInlineTitleText(activeItem.title || '');
                            setIsEditingInlineTitle(true);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          title="ॲडमिन: फोटोचे शीर्षक बदला"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>शीर्षक बदला (Edit Title)</span>
                        </button>

                        {!isEditingInlineDesc && (
                          <button
                            onClick={() => {
                              setInlineDescText(activeItem.description || '');
                              setIsEditingInlineDesc(true);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            title="ॲडमिन: फोटोचे वर्णन बदला"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>वर्णन बदला (Edit Description)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isEditingInlineDesc ? (
                  <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/50 space-y-2 mt-1">
                    <label className="block text-[11px] font-bold text-amber-300">
                      ॲडमिन: फोटोचे नवीन वर्णन प्रविष्ट करा
                    </label>
                    <textarea
                      rows={2}
                      value={inlineDescText}
                      onChange={(e) => setInlineDescText(e.target.value)}
                      placeholder="उदा. गणेशोत्सव महाप्रसाद वाटप कार्यक्रम गोंधळनगर..."
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-amber-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingInlineDesc(false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        रद्द करा
                      </button>
                      <button
                        onClick={() => {
                          const targetId = activeItem.id;
                          const updated = gallery.map((item) =>
                            item.id === targetId ? { ...item, description: inlineDescText.trim() } : item
                          );
                          onSaveGallery(updated);
                          setIsEditingInlineDesc(false);
                        }}
                        className="px-4 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>साठवा (Save Description)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {activeItem.description ? (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {activeItem.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        (या फोटोचे वर्णन जोडलेले नाही. ॲडमिन हे वर्णन बदलू शकतात.)
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  {activeItem.dateStr && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      तारीख: {activeItem.dateStr}
                    </span>
                  )}
                  <span>स्थान: गोंधळनगर, हडपसर, पुणे</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Photo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>{editingId ? 'गॅलरी फोटो संपादित करा' : 'नवीन कार्यक्रम फोटो जोडा'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  फोटो / कार्यक्रमाचे शीर्षक (Event Image Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="उदा. श्री गणेश विसर्जन मिरवणूक सोहळा"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    वर्गवारी (Category)
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormCategory(newCat);
                      if (!editingId) {
                        setFormDriveUrl(DEFAULT_CATEGORY_DRIVE_LINKS[newCat] || '');
                      }
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-bold"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    तारीख (Date)
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Google Drive Folder Link Input */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  <span>Google Drive फोल्डर लिंक (अधिक फोटोसाठी)</span>
                </label>
                <input
                  type="url"
                  value={formDriveUrl}
                  onChange={(e) => setFormDriveUrl(e.target.value)}
                  placeholder="उदा. https://drive.google.com/drive/folders/..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-medium text-slate-800"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  या कार्यक्रमाच्या सर्व फोटोंचे Google Drive फोल्डर लिंक येथे प्रविष्ट करा.
                </p>
              </div>

              {/* Image Input Selection: Upload vs URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 uppercase">
                    फोटो जोडा (Image Source) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setInputTab('upload')}
                      className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                        inputTab === 'upload' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                      }`}
                    >
                      डिव्हाइसवरून निवडा
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputTab('url')}
                      className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                        inputTab === 'url' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                      }`}
                    >
                      वेब इमेज लिंक (URL)
                    </button>
                  </div>
                </div>

                {inputTab === 'upload' ? (
                  <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 text-center bg-slate-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="photo-file-input"
                    />
                    <label
                      htmlFor="photo-file-input"
                      className="cursor-pointer flex flex-col items-center gap-1.5 text-slate-600"
                    >
                      <Upload className="w-6 h-6 text-amber-600" />
                      <span className="font-bold text-xs text-amber-700">
                        गॅलरी / कॅमेरा मधून फोटो निवडा
                      </span>
                      <span className="text-[10px] text-slate-400">(JPG, PNG max 5MB)</span>
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                )}

                {/* Preview Image if exists */}
                {formImageUrl && (
                  <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-200 h-28 bg-slate-950 flex items-center justify-center">
                    <img
                      src={formImageUrl}
                      alt="पूर्वावलोकन"
                      className="max-h-full max-w-full object-contain"
                    />
                    <span className="absolute top-1 left-1 bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.2 rounded">
                      पूर्वावलोकन (Preview)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  विवरण / माहिती (Description)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="उदा. गोंधळनगर येथील महाप्रसादाचे आयोजन..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'अद्ययावत करा (Save)' : 'फोटो जोडा (Add)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
