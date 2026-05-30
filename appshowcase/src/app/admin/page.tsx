'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '../../lib/supabase/client';
import AppLogo from '../../components/ui/AppLogo';
import AppImage from '../../components/ui/AppImage';
import Icon from '../../components/ui/AppIcon';

interface FeatureItem {
  text: string;
}

interface FeatureSection {
  id: string;
  sectionOrder: number;
  sectionKey: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: FeatureItem[];
  highlight: string;
  designInsightLabel: string;
  designInsightDescription: string;
  screenImage: string;
  screenAlt: string;
  accentColor: string;
  isActive: boolean;
}

interface FeatureSectionRow {
  id: string;
  section_order: number;
  section_key: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: FeatureItem[] | unknown;
  highlight: string;
  design_insight_label: string;
  design_insight_description: string;
  screen_image: string;
  screen_alt: string;
  accent_color: string;
  is_active: boolean;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const ICON_OPTIONS = [
  'HomeIcon',
  'AcademicCapIcon',
  'CurrencyDollarIcon',
  'BookOpenIcon',
  'ShieldCheckIcon',
  'UserGroupIcon',
  'ChartBarIcon',
  'BellIcon',
  'CogIcon',
  'StarIcon',
  'SparklesIcon',
  'RocketLaunchIcon',
  'GlobeAltIcon',
  'DevicePhoneMobileIcon',
  'ComputerDesktopIcon',
];

function mapRow(row: FeatureSectionRow): FeatureSection {
  return {
    id: row.id,
    sectionOrder: row.section_order,
    sectionKey: row.section_key,
    icon: row.icon,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    features: Array.isArray(row.features) ? row.features : [],
    highlight: row.highlight,
    designInsightLabel: row.design_insight_label,
    designInsightDescription: row.design_insight_description,
    screenImage: row.screen_image,
    screenAlt: row.screen_alt,
    accentColor: row.accent_color,
    isActive: row.is_active,
  };
}

const DEFAULT_NEW_SECTION: Partial<FeatureSection> = {
  title: '',
  subtitle: '',
  description: '',
  features: [],
  highlight: '',
  designInsightLabel: 'Design Decision',
  designInsightDescription: '',
  screenImage: '',
  screenAlt: '',
  accentColor: '#6366F1',
  icon: 'SparklesIcon',
  isActive: true,
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [sections, setSections] = useState<FeatureSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<FeatureSection>>({});
  const [featuresText, setFeaturesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [addSectionData, setAddSectionData] = useState<Partial<FeatureSection>>({
    ...DEFAULT_NEW_SECTION,
  });
  const [addFeaturesText, setAddFeaturesText] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [addUploadingScreenshot, setAddUploadingScreenshot] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const fetchSections = useCallback(async () => {
    setLoadingData(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('feature_sections')
        .select('*')
        .order('section_order', { ascending: true });

      if (fetchError) throw fetchError;
      const mapped = ((data || []) as FeatureSectionRow[]).map(mapRow);
      setSections(mapped);
      if (mapped.length > 0 && !selectedId) {
        setSelectedId(mapped[0].id);
        setEditData(mapped[0]);
        setFeaturesText(mapped[0].features.map((f: FeatureItem) => f.text).join('\n'));
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load sections'));
    } finally {
      setLoadingData(false);
    }
  }, [supabase, selectedId]);

  useEffect(() => {
    if (user) fetchSections();
  }, [user, fetchSections]);

  const selectSection = (section: FeatureSection) => {
    setSelectedId(section.id);
    setEditData({ ...section });
    setFeaturesText(section.features.map((f) => f.text).join('\n'));
    setSaveMsg('');
    setError('');
    setIsAddingSection(false);
  };

  // Upload screenshot to Supabase Storage
  const uploadScreenshot = async (file: File, isAdd = false): Promise<string | null> => {
    const setUploading = isAdd ? setAddUploadingScreenshot : setUploadingScreenshot;
    const setErr = isAdd ? setAddError : setError;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `screenshots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('showcase-screenshots')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('showcase-screenshots')
        .getPublicUrl(fileName);

      return urlData?.publicUrl || null;
    } catch (err: unknown) {
      setErr(
        errorMessage(
          err,
          'Upload failed. Make sure the "showcase-screenshots" bucket exists in Supabase Storage.'
        )
      );
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, isAdd = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadScreenshot(file, isAdd);
    if (url) {
      if (isAdd) {
        setAddSectionData((p) => ({ ...p, screenImage: url }));
      } else {
        setEditData((p) => ({ ...p, screenImage: url }));
      }
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!selectedId || !editData) return;
    setSaving(true);
    setSaveMsg('');
    setError('');

    const parsedFeatures: FeatureItem[] = featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

    try {
      const { error: updateError } = await supabase
        .from('feature_sections')
        .update({
          title: editData.title,
          subtitle: editData.subtitle,
          description: editData.description,
          features: parsedFeatures,
          highlight: editData.highlight,
          design_insight_label: editData.designInsightLabel,
          design_insight_description: editData.designInsightDescription,
          screen_image: editData.screenImage,
          screen_alt: editData.screenAlt,
          accent_color: editData.accentColor,
          icon: editData.icon,
        })
        .eq('id', selectedId);

      if (updateError) throw updateError;

      setSaveMsg('Changes saved successfully!');
      await fetchSections();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = async () => {
    if (!addSectionData.title?.trim()) {
      setAddError('Section title is required.');
      return;
    }
    setAddSaving(true);
    setAddError('');

    const parsedFeatures: FeatureItem[] = addFeaturesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

    const sectionKey = (addSectionData.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const maxOrder = sections.reduce((max, s) => Math.max(max, s.sectionOrder), -1);

    try {
      const { data, error: insertError } = await supabase
        .from('feature_sections')
        .insert({
          section_order: maxOrder + 1,
          section_key: sectionKey || `section-${Date.now()}`,
          icon: addSectionData.icon || 'SparklesIcon',
          title: addSectionData.title,
          subtitle: addSectionData.subtitle || '',
          description: addSectionData.description || '',
          features: parsedFeatures,
          highlight: addSectionData.highlight || '',
          design_insight_label: addSectionData.designInsightLabel || 'Design Decision',
          design_insight_description: addSectionData.designInsightDescription || '',
          screen_image: addSectionData.screenImage || '',
          screen_alt: addSectionData.screenAlt || '',
          accent_color: addSectionData.accentColor || '#6366F1',
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setIsAddingSection(false);
      setAddSectionData({ ...DEFAULT_NEW_SECTION });
      setAddFeaturesText('');
      await fetchSections();
      if (data) {
        const mapped = mapRow(data as FeatureSectionRow);
        setSelectedId(mapped.id);
        setEditData(mapped);
        setFeaturesText(mapped.features.map((f) => f.text).join('\n'));
      }
    } catch (err: unknown) {
      setAddError(errorMessage(err, 'Failed to add section'));
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedId) return;
    setDeleting(true);
    setError('');
    try {
      const { error: deleteError } = await supabase
        .from('feature_sections')
        .delete()
        .eq('id', selectedId);

      if (deleteError) throw deleteError;

      setConfirmDelete(false);
      setSelectedId(null);
      setEditData({});
      setFeaturesText('');
      await fetchSections();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to delete section'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const selected = sections.find((s) => s.id === selectedId);

  // Shared screenshot field renderer
  const ScreenshotField = ({
    value,
    onChange,
    altValue,
    onAltChange,
    uploading,
    fileRef,
    onFileChange,
    error: fieldError,
  }: {
    value: string;
    onChange: (v: string) => void;
    altValue: string;
    onAltChange: (v: string) => void;
    uploading: boolean;
    fileRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
  }) => (
    <div className="flex flex-col gap-4">
      {/* Upload area */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Screenshot
        </label>
        <div
          className="relative border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all duration-200 group"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Uploading…</p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon name="CloudArrowUpIcon" size={20} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Upload screenshot</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PNG, JPG, WebP — stored in Supabase Storage
                </p>
              </div>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
        {fieldError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={12} />
            {fieldError}
          </p>
        )}
      </div>

      {/* Or paste URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Or paste image URL
        </label>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Alt text */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Alt Text
        </label>
        <input
          type="text"
          value={altValue}
          onChange={(e) => onAltChange(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Preview */}
      {value && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Preview
          </label>
          <div className="flex justify-center py-4 bg-secondary/20 rounded-xl border border-border">
            <div className="relative w-[120px]">
              <div className="relative bg-primary rounded-[1.8rem] p-2 shadow-xl">
                <div
                  className="relative bg-white rounded-[1.4rem] overflow-hidden"
                  style={{ aspectRatio: '9/19' }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-primary rounded-b-xl z-20" />
                  <AppImage
                    src={value}
                    alt={altValue || 'Preview'}
                    fill
                    className="object-cover object-top"
                    sizes="120px"
                  />
                </div>
                <div className="absolute -left-0.5 top-12 w-0.5 h-5 bg-primary/50 rounded-l-sm" />
                <div className="absolute -right-0.5 top-10 w-0.5 h-7 bg-primary/50 rounded-r-sm" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-6 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <AppLogo size={28} />
          <div>
            <span className="text-sm font-bold text-foreground">SchoolDesk Admin</span>
            <span className="ml-2 text-xs text-muted-foreground font-mono">Showcase Editor</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="ArrowTopRightOnSquareIcon" size={12} />
            View Site
          </a>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Icon name="ArrowRightOnRectangleIcon" size={12} />
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-border bg-card flex-shrink-0 overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
              Sections
            </p>
            <span className="text-xs text-muted-foreground">{sections.length}</span>
          </div>
          <nav className="p-2 flex flex-col gap-1 flex-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => selectSection(section)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2.5 ${
                  selectedId === section.id && !isAddingSection
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: section.accentColor }}
                />
                <span className="truncate">{section.title}</span>
              </button>
            ))}
          </nav>
          {/* Add Section Button */}
          <div className="p-2 border-t border-border">
            <button
              onClick={() => {
                setIsAddingSection(true);
                setSelectedId(null);
                setAddSectionData({ ...DEFAULT_NEW_SECTION });
                setAddFeaturesText('');
                setAddError('');
              }}
              className={`w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isAddingSection
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <Icon name="PlusIcon" size={14} />
              Add Section
            </button>
          </div>
        </aside>

        {/* Main editor */}
        <main className="flex-1 overflow-y-auto">
          {/* ADD SECTION FORM */}
          {isAddingSection && (
            <div className="max-w-4xl mx-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon name="PlusIcon" size={14} className="text-primary" />
                    </div>
                    Add New Section
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    Will be appended after existing sections
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {addError && (
                    <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                      <Icon name="ExclamationCircleIcon" size={14} />
                      {addError}
                    </span>
                  )}
                  <button
                    onClick={() => setIsAddingSection(false)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSection}
                    disabled={addSaving}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {addSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Icon name="PlusIcon" size={14} />
                    )}
                    {addSaving ? 'Creating…' : 'Create Section'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-5">
                  {/* Icon picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Icon
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ICON_OPTIONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setAddSectionData((p) => ({ ...p, icon: iconName }))}
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-150 ${
                            addSectionData.icon === iconName
                              ? 'bg-primary/10 border-primary text-primary' :'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                          title={iconName}
                        >
                          <Icon name={iconName as Parameters<typeof Icon>[0]['name']} size={16} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Section Title *
                    </label>
                    <input
                      type="text"
                      value={addSectionData.title || ''}
                      onChange={(e) => setAddSectionData((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Communication"
                      className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Subtitle / Hook
                    </label>
                    <input
                      type="text"
                      value={addSectionData.subtitle || ''}
                      onChange={(e) =>
                        setAddSectionData((p) => ({ ...p, subtitle: e.target.value }))
                      }
                      placeholder="e.g. Keep everyone in the loop"
                      className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      value={addSectionData.description || ''}
                      onChange={(e) =>
                        setAddSectionData((p) => ({ ...p, description: e.target.value }))
                      }
                      rows={4}
                      className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Feature Bullets{' '}
                      <span className="ml-1 font-normal text-muted-foreground normal-case">
                        (one per line)
                      </span>
                    </label>
                    <textarea
                      value={addFeaturesText}
                      onChange={(e) => setAddFeaturesText(e.target.value)}
                      rows={4}
                      placeholder="Feature one&#10;Feature two&#10;Feature three"
                      className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Highlight Statement
                    </label>
                    <input
                      type="text"
                      value={addSectionData.highlight || ''}
                      onChange={(e) =>
                        setAddSectionData((p) => ({ ...p, highlight: e.target.value }))
                      }
                      className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      Design Insight Block
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Label
                      </label>
                      <input
                        type="text"
                        value={addSectionData.designInsightLabel || ''}
                        onChange={(e) =>
                          setAddSectionData((p) => ({ ...p, designInsightLabel: e.target.value }))
                        }
                        className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Description
                      </label>
                      <textarea
                        value={addSectionData.designInsightDescription || ''}
                        onChange={(e) =>
                          setAddSectionData((p) => ({
                            ...p,
                            designInsightDescription: e.target.value,
                          }))
                        }
                        rows={3}
                        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Accent color */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={addSectionData.accentColor || '#6366F1'}
                        onChange={(e) =>
                          setAddSectionData((p) => ({ ...p, accentColor: e.target.value }))
                        }
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                      />
                      <input
                        type="text"
                        value={addSectionData.accentColor || ''}
                        onChange={(e) =>
                          setAddSectionData((p) => ({ ...p, accentColor: e.target.value }))
                        }
                        className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <ScreenshotField
                    value={addSectionData.screenImage || ''}
                    onChange={(v) => setAddSectionData((p) => ({ ...p, screenImage: v }))}
                    altValue={addSectionData.screenAlt || ''}
                    onAltChange={(v) => setAddSectionData((p) => ({ ...p, screenAlt: v }))}
                    uploading={addUploadingScreenshot}
                    fileRef={addFileInputRef as React.RefObject<HTMLInputElement>}
                    onFileChange={(e) => handleScreenshotUpload(e, true)}
                    error={
                      addError.includes('bucket') || addError.includes('Upload')
                        ? addError
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* EDIT SECTION FORM */}
          {!isAddingSection && selected && (
            <div className="max-w-4xl mx-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-foreground">Edit: {selected.title}</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    key: {selected.sectionKey}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {saveMsg && (
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <Icon name="CheckCircleIcon" size={14} />
                      {saveMsg}
                    </span>
                  )}
                  {error && (
                    <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                      <Icon name="ExclamationCircleIcon" size={14} />
                      {error}
                    </span>
                  )}
                  {confirmDelete ? (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-red-600 font-medium">Delete this section?</span>
                      <button
                        onClick={handleDeleteSection}
                        disabled={deleting}
                        className="flex items-center gap-1 h-7 px-2.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                      >
                        {deleting ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Icon name="TrashIcon" size={11} />
                        )}
                        {deleting ? 'Deleting…' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="h-7 px-2.5 rounded-md border border-red-200 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmDelete(true);
                        setSaveMsg('');
                        setError('');
                      }}
                      className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                    >
                      <Icon name="TrashIcon" size={13} />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Icon name="CheckIcon" size={14} />
                    )}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-5">
                  {/* Icon picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Icon
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ICON_OPTIONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditData((p) => ({ ...p, icon: iconName }))}
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-150 ${
                            editData.icon === iconName
                              ? 'bg-primary/10 border-primary text-primary' :'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                          title={iconName}
                        >
                          <Icon name={iconName as Parameters<typeof Icon>[0]['name']} size={16} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={editData.title || ''}
                      onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
                      className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Subtitle / Hook
                    </label>
                    <input
                      type="text"
                      value={editData.subtitle || ''}
                      onChange={(e) => setEditData((p) => ({ ...p, subtitle: e.target.value }))}
                      className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                      rows={4}
                      className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Feature Bullets{' '}
                      <span className="ml-1 font-normal text-muted-foreground normal-case">
                        (one per line)
                      </span>
                    </label>
                    <textarea
                      value={featuresText}
                      onChange={(e) => setFeaturesText(e.target.value)}
                      rows={5}
                      placeholder="Role-based personalized dashboards&#10;Live school summary for administrators"
                      className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Highlight Statement
                    </label>
                    <input
                      type="text"
                      value={editData.highlight || ''}
                      onChange={(e) => setEditData((p) => ({ ...p, highlight: e.target.value }))}
                      className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      Design Insight Block
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Label
                      </label>
                      <input
                        type="text"
                        value={editData.designInsightLabel || ''}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, designInsightLabel: e.target.value }))
                        }
                        className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Description
                      </label>
                      <textarea
                        value={editData.designInsightDescription || ''}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, designInsightDescription: e.target.value }))
                        }
                        rows={3}
                        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Accent color */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={editData.accentColor || '#F59E0B'}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, accentColor: e.target.value }))
                        }
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                      />
                      <input
                        type="text"
                        value={editData.accentColor || ''}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, accentColor: e.target.value }))
                        }
                        className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <ScreenshotField
                    value={editData.screenImage || ''}
                    onChange={(v) => setEditData((p) => ({ ...p, screenImage: v }))}
                    altValue={editData.screenAlt || ''}
                    onAltChange={(v) => setEditData((p) => ({ ...p, screenAlt: v }))}
                    uploading={uploadingScreenshot}
                    fileRef={fileInputRef as React.RefObject<HTMLInputElement>}
                    onFileChange={(e) => handleScreenshotUpload(e, false)}
                    error={error.includes('bucket') || error.includes('Upload') ? error : undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {!isAddingSection && !selected && (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">Select a section to edit</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
