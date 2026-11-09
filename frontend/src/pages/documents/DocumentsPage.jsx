import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderArchive,
  Upload,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Trash2,
  Eye,
  Download,
  PlusCircle,
  Calendar,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { documentIntelligenceApi } from '../../api/documentIntelligenceApi';
import { photoApi } from '../../api/photoApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const STANDARD_CLASSES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const STANDARD_SUBJECTS = ['General Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Social Science'];

export const DocumentsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Grouping & Filtering
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'date' | 'class' | 'subject'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'pdf' | 'ppt' | 'doc' | 'image'
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(searchParams.get('action') === 'upload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadClass, setUploadClass] = useState(user?.classesHandled?.[0] || 'Class 10');
  const [uploadSubject, setUploadSubject] = useState(user?.subjectsTaught?.[0] || 'General Science');

  // Preview & Delete Modals
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name, isPhoto }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [docsRes, photosRes] = await Promise.all([
        documentIntelligenceApi.getDocuments(),
        photoApi.getPhotos(),
      ]);

      if (docsRes.success && docsRes.data) {
        setDocuments(docsRes.data);
      }
      if (photosRes.success && photosRes.data) {
        setPhotos(photosRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combined unified items list
  const unifiedItems = useMemo(() => {
    const docItems = documents.map((d) => ({
      ...d,
      itemType: (d.extension || '').toLowerCase().includes('ppt')
        ? 'ppt'
        : (d.extension || '').toLowerCase().includes('doc')
        ? 'doc'
        : (d.extension || '').toLowerCase().includes('pdf')
        ? 'pdf'
        : 'other',
      isPhoto: false,
    }));

    const photoItems = photos.map((p) => ({
      ...p,
      originalName: p.originalFileName || p.caption || 'Classroom Snapshot',
      extension: 'jpg',
      itemType: 'image',
      isPhoto: true,
      fileSize: p.fileSize || 500000,
      storageKey: p.storageKey,
    }));

    return [...docItems, ...photoItems];
  }, [documents, photos]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'pdf' && item.itemType !== 'pdf') return false;
        if (typeFilter === 'ppt' && item.itemType !== 'ppt') return false;
        if (typeFilter === 'doc' && item.itemType !== 'doc') return false;
        if (typeFilter === 'image' && item.itemType !== 'image') return false;
      }

      // Class & Subject filters
      if (classFilter && item.className !== classFilter) return false;
      if (subjectFilter && item.subject?.toLowerCase() !== subjectFilter.toLowerCase()) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.originalName?.toLowerCase().includes(q) ||
          item.subject?.toLowerCase().includes(q) ||
          item.className?.toLowerCase().includes(q) ||
          item.topic?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [unifiedItems, typeFilter, classFilter, subjectFilter, searchQuery]);

  // Grouped items structure
  const groupedItems = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Teaching Documents & Media': filteredItems };
    }

    const groups = {};
    filteredItems.forEach((item) => {
      let key = 'Uncategorized';
      if (groupBy === 'date') {
        key = item.date
          ? new Date(item.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'Unknown Date';
      } else if (groupBy === 'class') {
        key = item.className || 'General Class';
      } else if (groupBy === 'subject') {
        key = item.subject || 'General Subject';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return groups;
  }, [filteredItems, groupBy]);

  // Handle Material Upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('className', uploadClass);
    formData.append('subject', uploadSubject);
    formData.append('date', new Date().toISOString());

    try {
      setUploading(true);
      setUploadProgress(10);
      const res = await documentIntelligenceApi.uploadDocuments(formData, (percent) => {
        setUploadProgress(percent);
      });

      if (res.success && res.data) {
        showToast(`Uploaded ${res.data.length} document(s) successfully!`, 'success');
        setUploadModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.isPhoto) {
        await photoApi.deletePhoto(deleteTarget.id);
        setPhotos((prev) => prev.filter((p) => (p._id || p.id) !== deleteTarget.id));
      } else {
        await documentIntelligenceApi.deleteDocument(deleteTarget.id);
        setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== deleteTarget.id));
      }
      showToast('Document deleted successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete document', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Teaching Documents
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organized repository of PDF lesson notes, presentations, worksheets, and classroom media.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Material</span>
        </button>
      </div>

      {/* Filter and Group Controls Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by name, topic, or subject..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group By Selector */}
          <div className="flex items-center gap-2 self-start">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500"
            >
              <option value="none">No Grouping (Flat)</option>
              <option value="date">Date</option>
              <option value="class">Class</option>
              <option value="subject">Subject</option>
            </select>
          </div>
        </div>

        {/* File Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'all', label: 'All Files', count: unifiedItems.length },
            { id: 'pdf', label: 'PDF Documents', count: unifiedItems.filter((i) => i.itemType === 'pdf').length },
            { id: 'ppt', label: 'Presentations', count: unifiedItems.filter((i) => i.itemType === 'ppt').length },
            { id: 'doc', label: 'Word Documents', count: unifiedItems.filter((i) => i.itemType === 'doc').length },
            { id: 'image', label: 'Photos & Snapshots', count: unifiedItems.filter((i) => i.itemType === 'image').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                typeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  typeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Documents Grid */}
      {loading ? (
        <div className="py-24 bg-white rounded-2xl border border-slate-200">
          <LoadingSpinner message="Loading teaching materials..." />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FolderArchive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery || typeFilter !== 'all'
              ? 'Try adjusting your search query or file type filter.'
              : 'Upload lesson presentations, PDFs, or photos to keep your materials organized.'}
          </p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Material</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([groupTitle, items]) => (
            <div key={groupTitle} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {groupTitle}
                </h3>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item, idx) => {
                  const itemId = item._id || item.id || idx;
                  const ext = (item.extension || '').toUpperCase();
                  const sizeMb = item.fileSize ? (item.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '';
                  const itemDate = item.date ? new Date(item.date).toLocaleDateString('en-GB') : '';
                  const fileUrl = item.storageKey ? `/uploads/${item.storageKey}` : item.storagePath;

                  return (
                    <div
                      key={itemId}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-3 group"
                    >
                      <div>
                        {/* Thumbnail / Header */}
                        {item.itemType === 'image' ? (
                          <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 mb-2 border border-slate-100">
                            <img
                              src={fileUrl}
                              alt={item.originalName}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/300x200?text=Photo';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                item.itemType === 'pdf'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                  : item.itemType === 'ppt'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : item.itemType === 'doc'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {ext || 'FILE'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                {item.itemType === 'pdf'
                                  ? 'PDF Document'
                                  : item.itemType === 'ppt'
                                  ? 'Presentation'
                                  : item.itemType === 'doc'
                                  ? 'Word Document'
                                  : 'File'}
                              </span>
                              {itemDate && <span className="text-[10px] text-slate-400">{itemDate}</span>}
                            </div>
                          </div>
                        )}

                        <p className="text-xs font-bold text-slate-900 line-clamp-2" title={item.originalName}>
                          {item.originalName}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          {item.className && <span>{item.className}</span>}
                          {item.subject && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">{item.subject}</span>
                            </>
                          )}
                        </div>

                        {sizeMb && <p className="text-[10px] text-slate-400 mt-1">{sizeMb}</p>}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </a>

                        <div className="flex items-center gap-1">
                          <a
                            href={fileUrl}
                            download={item.originalName}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: itemId,
                                name: item.originalName,
                                isPhoto: item.isPhoto,
                              })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Upload Teaching Materials</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                <select
                  value={uploadClass}
                  onChange={(e) => setUploadClass(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  {STANDARD_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  {STANDARD_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50 hover:bg-blue-50/30 transition cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Click to choose files or drop here</p>
              <p className="text-[11px] text-slate-500 mt-1">PDF, PowerPoint, Word documents, or photos</p>
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-blue-800">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Document?"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"?`}
        confirmText="Delete Document"
        confirmVariant="danger"
      />
    </div>
  );
};

export default DocumentsPage;
