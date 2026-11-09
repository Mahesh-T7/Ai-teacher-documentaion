import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Search,
  BookOpen,
} from 'lucide-react';
import { photoApi } from '../../api/photoApi';
import { diaryApi } from '../../api/diaryApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const PhotoDocsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Gallery Filters
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [searchCaption, setSearchCaption] = useState('');

  // Upload Form State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    className: 'Class 9',
    section: 'A',
    subject: 'Artificial Intelligence',
    unit: '',
    topic: '',
    caption: '',
    date: new Date().toISOString().split('T')[0],
    policyConsent: true,
  });

  // Preview & Edit Modals
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [editPhotoTarget, setEditPhotoTarget] = useState(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await photoApi.getPhotos({
        className: classFilter || undefined,
        subject: subjectFilter || undefined,
      });
      if (res.success && res.photos) {
        setPhotos(res.photos);
      }
    } catch (err) {
      showToast('Failed to fetch photo gallery', 'error');
    } finally {
      setLoading(false);
    }
  }, [classFilter, subjectFilter, showToast]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate size (5MB) and type
    const validFiles = [];
    const previews = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} is larger than 5MB limit.`, 'warning');
        continue;
      }
      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }

    setSelectedFiles(validFiles);
    setFilePreviews(previews);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      showToast('Please select at least one image file.', 'warning');
      return;
    }
    if (!uploadForm.policyConsent) {
      showToast('Please confirm student media policy consent.', 'warning');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('photos', file);
      });
      formData.append('className', uploadForm.className);
      formData.append('section', uploadForm.section);
      formData.append('subject', uploadForm.subject);
      formData.append('unit', uploadForm.unit);
      formData.append('topic', uploadForm.topic);
      formData.append('caption', uploadForm.caption);
      formData.append('date', uploadForm.date);
      formData.append('policyConsent', uploadForm.policyConsent ? 'true' : 'false');

      const res = await photoApi.uploadPhotos(formData);
      if (res.success) {
        showToast(`Uploaded ${res.count || selectedFiles.length} photo(s) successfully!`, 'success');
        setShowUploadModal(false);
        setSelectedFiles([]);
        setFilePreviews([]);
        setUploadForm((prev) => ({ ...prev, caption: '', topic: '' }));
        fetchPhotos();
      }
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCaption = async () => {
    if (!editPhotoTarget) return;
    try {
      const res = await photoApi.updatePhoto(editPhotoTarget._id || editPhotoTarget.id, {
        caption: editCaptionText,
      });
      if (res.success) {
        showToast('Caption updated successfully', 'success');
        setEditPhotoTarget(null);
        fetchPhotos();
      }
    } catch (err) {
      showToast('Failed to update caption', 'error');
    }
  };

  const handleDeletePhoto = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await photoApi.deletePhoto(deleteTargetId);
      if (res.success) {
        showToast('Photo documentation deleted', 'success');
        setDeleteTargetId(null);
        fetchPhotos();
      }
    } catch (err) {
      showToast('Failed to delete photo', 'error');
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (searchCaption && !p.caption?.toLowerCase().includes(searchCaption.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Phase 4 Classroom Evidence
            </span>
            <span className="text-xs text-slate-500 font-medium">{photos.length} Photographs Documented</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-emerald-600" />
            Classroom Photo Documentation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and organize authentic classroom activity photographs, board demonstrations, practicals, and student work.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <Upload className="w-4 h-4" /> Upload Photos
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Search by photo caption or topic..."
            value={searchCaption}
            onChange={(e) => setSearchCaption(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All Classes</option>
            <option value="Class 8">Class 8</option>
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
          </select>

          <input
            type="text"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
            placeholder="Filter subject..."
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          />

          {(classFilter || subjectFilter || searchCaption) && (
            <button
              onClick={() => {
                setClassFilter('');
                setSubjectFilter('');
                setSearchCaption('');
              }}
              className="px-3 py-1.5 text-xs text-rose-600 hover:underline font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No classroom photographs yet"
          description="Upload classroom pictures, student group activities, experiments, and whiteboard notes to build your inspection portfolio."
          actionLabel="Upload First Photo"
          onAction={() => setShowUploadModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPhotos.map((photo) => (
            <div
              key={photo._id || photo.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Image Preview Container */}
              <div
                className="relative aspect-video bg-slate-100 overflow-hidden cursor-pointer"
                onClick={() => setPreviewPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=60';
                  }}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow">
                    <Eye className="w-4 h-4" />
                  </span>
                </div>

                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                  {new Date(photo.date).toLocaleDateString()}
                </span>
              </div>

              {/* Photo Metadata */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
                    <span>{photo.className} {photo.section ? `(${photo.section})` : ''}</span>
                    <span className="text-emerald-700 font-semibold">{photo.subject}</span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-800 line-clamp-2" title={photo.caption}>
                    {photo.caption}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[120px]" title={photo.topic || photo.unit}>
                    {photo.topic || photo.unit || 'Classroom session'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditPhotoTarget(photo);
                        setEditCaptionText(photo.caption || '');
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title="Edit Caption"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(photo._id || photo.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" /> Upload Classroom Photographs
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              {/* File Drop Area */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  id="photo-upload"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="font-semibold text-slate-700">Click to choose image files</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, or WebP (Max 5MB each, up to 10 photos)</span>
                </label>
              </div>

              {/* Thumbnails preview */}
              {filePreviews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {filePreviews.map((src, i) => (
                    <img key={i} src={src} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              )}

              {/* Class & Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Class *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={uploadForm.className}
                    onChange={(e) => setUploadForm({ ...uploadForm, className: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Section</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={uploadForm.section}
                    onChange={(e) => setUploadForm({ ...uploadForm, section: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={uploadForm.subject}
                    onChange={(e) => setUploadForm({ ...uploadForm, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={uploadForm.date}
                    onChange={(e) => setUploadForm({ ...uploadForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Topic / Activity Description</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Robotics obstacle-avoiding bot demonstration"
                  value={uploadForm.topic}
                  onChange={(e) => setUploadForm({ ...uploadForm, topic: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Caption *</label>
                <input
                  type="text"
                  required
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Students assembling ultrasonic sensors in STEM lab"
                  value={uploadForm.caption}
                  onChange={(e) => setUploadForm({ ...uploadForm, caption: e.target.value })}
                />
              </div>

              {/* Consent Policy Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="policyConsent"
                  checked={uploadForm.policyConsent}
                  onChange={(e) => setUploadForm({ ...uploadForm, policyConsent: e.target.checked })}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="policyConsent" className="text-[11px] text-slate-600 leading-snug">
                  <strong>Media Policy Compliance:</strong> I confirm that these photographs represent genuine classroom activities and adhere to educational privacy and school media guidelines.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading ? <LoadingSpinner size="sm" /> : <Upload className="w-4 h-4" />} Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SIZE PREVIEW MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <img src={previewPhoto.url} alt={previewPhoto.caption} className="max-h-full max-w-full object-contain" />
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{previewPhoto.caption}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {previewPhoto.className} • {previewPhoto.subject} • {new Date(previewPhoto.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CAPTION MODAL */}
      {editPhotoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Edit Photo Caption</h3>
            <textarea
              rows={3}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={editCaptionText}
              onChange={(e) => setEditCaptionText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditPhotoTarget(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCaption}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Photo Record"
        message="Are you sure you want to permanently delete this classroom photograph from documentation?"
        confirmLabel="Delete Photo"
        variant="danger"
        onConfirm={handleDeletePhoto}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

export default PhotoDocsPage;
