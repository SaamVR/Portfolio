"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  Palette,
  Rocket,
  Image as ImageIcon,
  Type,
  List,
  MessageSquare,
  HelpCircle,
  Tag,
  Star,
  CheckCircle2,
  X,
  Smartphone,
  Monitor,
  GripVertical,
  Clock,
  Sparkles,
  Trophy,
  ShoppingBag
} from "lucide-react";
import { themePresets } from "@/lib/themePresets";

// --- TYPES ---
export interface SandboxBlock {
  id: string;
  type: string;
  label: string;
  icon: any;
  props: Record<string, any>;
}

export interface SandboxState {
  currentQuest: number;
  completedQuests: number[];
  xp: number;
  achievements: string[];
  
  niche: 'fashion' | 'beauty' | 'tech' | 'food' | null;
  storeName: string;
  
  blocks: SandboxBlock[];
  selectedBlockId: string | null;
  dragOperationCount: number;
  
  activeTheme: string;
  
  editedFields: Record<string, Record<string, string>>;
  
  timerStarted: number | null;
  timerEnabled: boolean;
  
  previewMode: 'desktop' | 'mobile';
  contentEditorOpen: boolean;
}

// --- CONSTANTS ---
const NICHES = [
  { id: 'fashion', label: 'Fashion', icon: ShoppingBag, color: '#10b981', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80', products: ['Hoodie', 'Sneakers', 'Bag'] },
  { id: 'beauty', label: 'Beauty', icon: Sparkles, color: '#f472b6', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', products: ['Serum', 'Moisturizer', 'Mask'] },
  { id: 'tech', label: 'Tech', icon: Monitor, color: '#3b82f6', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', products: ['Headphones', 'Charger', 'Case'] },
  { id: 'food', label: 'Food', icon: Tag, color: '#f59e0b', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80', products: ['Cake', 'Coffee', 'Bread'] }
] as const;

const AVAILABLE_BLOCKS: Record<string, { type: string, label: string, icon: any, defaultProps: any }> = {
  'hero': { type: 'hero', label: 'Hero Banner', icon: ImageIcon, defaultProps: { headline: 'Welcome to our store', tagline: 'The best products online', cta: 'Shop Now' } },
  'featured-products': { type: 'featured-products', label: 'Product Grid', icon: LayoutTemplate, defaultProps: { title: 'Featured Collection' } },
  'trust-badges': { type: 'trust-badges', label: 'Trust & Guarantees', icon: CheckCircle2, defaultProps: { badge1: 'Free Delivery', badge2: 'Secure Payment' } },
  'testimonials': { type: 'testimonials', label: 'Customer Reviews', icon: Star, defaultProps: { reviewer: 'John D.', text: 'Amazing quality!' } },
  'faq-accordion': { type: 'faq-accordion', label: 'FAQ Section', icon: HelpCircle, defaultProps: { q1: 'Delivery time?', a1: '2-3 days' } },
  'rich-text': { type: 'rich-text', label: 'Rich Text', icon: Type, defaultProps: { text: 'Write your story here...' } },
  'promo-banner': { type: 'promo-banner', label: 'Promo Banner', icon: Tag, defaultProps: { text: '20% OFF ALL WEEKEND' } }
};

// --- MAIN COMPONENT ---
export function StoreSandbox({ onClose }: { onClose?: () => void }) {
  const [state, setState] = useState<SandboxState>({
    currentQuest: 1,
    completedQuests: [],
    xp: 0,
    achievements: [],
    niche: null,
    storeName: '',
    blocks: [],
    selectedBlockId: null,
    dragOperationCount: 0,
    activeTheme: themePresets[0].id,
    editedFields: {},
    timerStarted: null,
    timerEnabled: true,
    previewMode: 'desktop',
    contentEditorOpen: false,
  });

  const [toast, setToast] = useState<{ icon: string, title: string } | null>(null);
  const [xpPopup, setXpPopup] = useState<{ id: number, xp: number, x: number, y: number }[]>([]);

  // Update XP & Quests
  const completeQuest = (questId: number, xpReward: number, achievementIcon?: string, achievementName?: string, e?: React.MouseEvent) => {
    if (state.completedQuests.includes(questId)) return;
    
    setState(s => {
      const nextQuests = [...s.completedQuests, questId];
      const nextQuest = (questId === 6 ? 6 : Math.max(s.currentQuest, questId + 1));
      
      const nextAchievements = achievementName && !s.achievements.includes(achievementName) 
        ? [...s.achievements, achievementName] 
        : s.achievements;

      if (questId === 1 && s.timerEnabled && !s.timerStarted) {
        return { ...s, completedQuests: nextQuests, currentQuest: nextQuest, xp: s.xp + xpReward, achievements: nextAchievements, timerStarted: Date.now() };
      }

      return { ...s, completedQuests: nextQuests, currentQuest: nextQuest, xp: s.xp + xpReward, achievements: nextAchievements };
    });

    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setXpPopup(p => [...p, { id: Date.now(), xp: xpReward, x: rect.left + rect.width / 2, y: rect.top }]);
      setTimeout(() => setXpPopup(p => p.slice(1)), 1500);
    }

    if (achievementName && achievementIcon) {
      setToast({ icon: achievementIcon, title: achievementName });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Handlers
  const handleNicheSelect = (nicheId: 'fashion' | 'beauty' | 'tech' | 'food', e: React.MouseEvent) => {
    const defaultBlocks = ['hero', 'featured-products', 'trust-badges', 'testimonials', 'faq-accordion'].map(type => ({
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: AVAILABLE_BLOCKS[type].label,
      icon: AVAILABLE_BLOCKS[type].icon,
      props: { ...AVAILABLE_BLOCKS[type].defaultProps },
    }));

    setState(s => ({ ...s, niche: nicheId, blocks: defaultBlocks }));
    completeQuest(1, 20, undefined, undefined, e);
  };

  const handleStoreNameChange = (val: string) => {
    setState(s => ({ ...s, storeName: val }));
    if (val.length >= 3) {
      // Complete quest 2 if not done
      completeQuest(2, 15, "🏷️", "Brand Architect");
    }
  };

  const handleThemeChange = (themeId: string, e: React.MouseEvent) => {
    setState(s => ({ ...s, activeTheme: themeId }));
    if (themeId !== themePresets[0].id) {
      completeQuest(4, 20, "🎨", "Color Master", e);
    }
  };

  // Drag and Drop Logic
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const newBlocks = [...state.blocks];
    const dragItemContent = newBlocks[dragItem.current];
    newBlocks.splice(dragItem.current, 1);
    newBlocks.splice(dragOverItem.current, 0, dragItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    setState(s => ({ 
      ...s, 
      blocks: newBlocks,
      dragOperationCount: s.dragOperationCount + 1 
    }));
    
    completeQuest(3, 25, "🧱", "Block Master", e as any);
  };

  const handleFieldEdit = (blockId: string, field: string, value: string) => {
    setState(s => ({
      ...s,
      editedFields: {
        ...s.editedFields,
        [blockId]: {
          ...(s.editedFields[blockId] || {}),
          [field]: value
        }
      }
    }));
    completeQuest(5, 25, "✏️", "Content Creator");
  };

  const handleLaunch = () => {
    completeQuest(6, 15);
    const params = new URLSearchParams({
      sandbox: 'true',
      store_name: state.storeName,
      template: state.niche || 'fashion',
      theme: state.activeTheme,
      blocks: state.blocks.map(b => b.type).join(','),
      ...(state.editedFields[state.blocks.find(b => b.type === 'hero')?.id || '']?.headline && {
        hero_headline: state.editedFields[state.blocks.find(b => b.type === 'hero')?.id || '']?.headline
      })
    });
    window.location.href = `/signup?${params.toString()}`;
  };

  const currentThemeData = themePresets.find(t => t.id === state.activeTheme) || themePresets[0];

  return (
    <div className="relative flex flex-col bg-background overflow-hidden min-h-[900px] border-y border-border/60">
      {/* Top Navbar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-card px-6">
        <div className="flex items-center gap-4">
          <div className="font-heading text-lg font-bold">Gamified Builder</div>
        </div>
        
        {/* XP Bar */}
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-muted-foreground">
            Lvl {Math.min(5, Math.floor(state.xp / 25) + 1)}
          </div>
          <div className="flex w-48 flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span>{state.xp} XP</span>
              <span className="text-muted-foreground">120 XP</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (state.xp / 120) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timer */}
        {state.timerEnabled && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-mono text-sm font-bold">
            <Clock className="h-4 w-4 text-emerald-500" />
            3:00
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Editor */}
        <div className="w-full max-w-md shrink-0 flex flex-col border-r border-border/60 bg-muted/10 overflow-y-auto">
          
          {/* Quests Container */}
          <div className="p-6">
            <h3 className="font-heading text-xl font-bold mb-6">Build Your Store</h3>

            {/* Quest 1: Vibe */}
            <div className={`mb-6 rounded-2xl border p-4 transition-all ${state.currentQuest === 1 ? 'border-primary shadow-lg bg-card' : 'border-border/50 bg-card/50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold">1. Pick Your Vibe</span>
                {state.completedQuests.includes(1) && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
              {state.currentQuest >= 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {NICHES.map(niche => (
                    <button
                      key={niche.id}
                      onClick={(e) => handleNicheSelect(niche.id as any, e)}
                      className={`flex items-center gap-2 rounded-xl border p-3 transition-all ${state.niche === niche.id ? 'border-primary bg-primary/10' : 'border-border/50 hover:bg-muted'}`}
                    >
                      <niche.icon className="h-5 w-5" style={{ color: niche.color }} />
                      <span className="text-sm font-semibold">{niche.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quest 2: Name */}
            <div className={`mb-6 rounded-2xl border p-4 transition-all ${state.currentQuest === 2 ? 'border-primary shadow-lg bg-card' : 'border-border/50 bg-card/50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold">2. Name Your Store</span>
                {state.completedQuests.includes(2) && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
              {state.currentQuest >= 2 && (
                <input
                  type="text"
                  value={state.storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  placeholder="e.g. Luna Wear"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
                />
              )}
            </div>

            {/* Quest 3: Blocks */}
            <div className={`mb-6 rounded-2xl border p-4 transition-all ${state.currentQuest === 3 ? 'border-primary shadow-lg bg-card' : 'border-border/50 bg-card/50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold">3. Arrange Blocks</span>
                {state.completedQuests.includes(3) && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
              {state.currentQuest >= 3 && (
                <div className="space-y-2">
                  {state.blocks.map((block, i) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragEnter={(e) => handleDragEnter(e, i)}
                      onDragEnd={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => setState(s => ({ ...s, selectedBlockId: block.id, contentEditorOpen: true }))}
                      className={`flex cursor-move items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-sm hover:border-primary/50 ${state.selectedBlockId === block.id ? 'ring-2 ring-primary/30 border-primary' : ''}`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <block.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{block.label}</span>
                    </div>
                  ))}
                  <div className="mt-4 border-t border-border/50 pt-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Add Block</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['promo-banner', 'rich-text'].map(t => {
                        const b = AVAILABLE_BLOCKS[t];
                        return (
                          <button
                            key={t}
                            onClick={(e) => {
                              setState(s => ({ ...s, blocks: [...s.blocks, { id: Math.random().toString(36).substr(2, 9), type: b.type, label: b.label, icon: b.icon, props: { ...b.defaultProps } }] }));
                              completeQuest(3, 25, "🧱", "Block Master", e);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            <b.icon className="h-3 w-3" /> {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quest 4: Theme */}
            <div className={`mb-6 rounded-2xl border p-4 transition-all ${state.currentQuest === 4 ? 'border-primary shadow-lg bg-card' : 'border-border/50 bg-card/50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold">4. Choose Theme</span>
                {state.completedQuests.includes(4) && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
              {state.currentQuest >= 4 && (
                <div className="grid grid-cols-3 gap-3">
                  {themePresets.slice(0, 6).map(preset => (
                    <button
                      key={preset.id}
                      onClick={(e) => handleThemeChange(preset.id, e)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 ${state.activeTheme === preset.id ? 'border-primary bg-primary/10' : 'border-border/50 hover:bg-muted'}`}
                    >
                      <div className="flex gap-1">
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.preview.bg }} />
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.preview.primary }} />
                      </div>
                      <span className="text-[10px] font-bold text-center leading-tight">{preset.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quest 6: Launch */}
            {state.completedQuests.includes(5) && (
              <div className="mt-8">
                <button onClick={handleLaunch} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 font-heading text-lg font-extrabold text-white shadow-xl hover:from-emerald-400 hover:to-teal-500">
                  Launch This Store For Real →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Live Preview */}
        <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 p-8 border-l border-border/60">
          <div className="mb-6 flex gap-2 rounded-xl bg-background/50 p-1 backdrop-blur-sm border border-border/50">
            <button onClick={() => setState(s => ({ ...s, previewMode: 'desktop' }))} className={`rounded-lg p-2 transition-all ${state.previewMode === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
              <Monitor className="h-5 w-5" />
            </button>
            <button onClick={() => setState(s => ({ ...s, previewMode: 'mobile' }))} className={`rounded-lg p-2 transition-all ${state.previewMode === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
              <Smartphone className="h-5 w-5" />
            </button>
          </div>

          <div 
            className={`relative overflow-y-auto overflow-x-hidden rounded-[2.5rem] border-8 border-muted-foreground/20 bg-background shadow-2xl transition-all duration-500 ${state.previewMode === 'desktop' ? 'h-[800px] w-full max-w-5xl rounded-xl border-4' : 'h-[800px] w-[375px]'}`}
            style={{ 
              backgroundColor: currentThemeData.preview.bg,
              color: currentThemeData.id === 'monochrome' ? '#ffffff' : '#000000'
            }}
          >
            {/* Store Navbar */}
            <div className="sticky top-0 z-10 border-b border-border/20 bg-background/80 px-5 py-4 backdrop-blur-md flex justify-between items-center">
              <span className="font-heading font-black tracking-widest uppercase">
                {state.storeName || "YOUR STORE"}
              </span>
              <div className="flex gap-4 text-sm font-bold">
                <span>Shop</span>
                <span>Cart (0)</span>
              </div>
            </div>

            {/* Render Blocks */}
            <div className="flex flex-col">
              {state.blocks.map(block => {
                const edits = state.editedFields[block.id] || {};
                
                if (block.type === 'hero') {
                  return (
                    <div key={block.id} className="relative flex flex-col items-center justify-center py-24 text-center" style={{ backgroundColor: currentThemeData.preview.primary + '20' }}>
                      <h1 className="font-heading text-4xl font-black mb-4">{edits.headline || block.props.headline}</h1>
                      <p className="text-lg opacity-80 mb-8">{edits.tagline || block.props.tagline}</p>
                      <button className="rounded-full px-8 py-3 font-bold text-white shadow-lg" style={{ backgroundColor: currentThemeData.preview.primary }}>
                        {edits.cta || block.props.cta}
                      </button>
                    </div>
                  );
                }
                if (block.type === 'featured-products') {
                  return (
                    <div key={block.id} className="py-16 px-6">
                      <h2 className="font-heading text-2xl font-bold mb-8 text-center">{edits.title || block.props.title}</h2>
                      <div className={`grid gap-6 ${state.previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                        {[1,2,3,4].map(i => (
                          <div key={i} className="rounded-2xl border border-border/20 p-4" style={{ backgroundColor: currentThemeData.preview.bg }}>
                            <div className="aspect-square rounded-xl bg-muted/30 mb-4" />
                            <h3 className="font-bold text-sm">Product {i}</h3>
                            <p className="text-sm font-semibold opacity-70 mt-1">৳ 1,200</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={block.id} className="py-12 px-6 border-b border-border/10">
                    <h3 className="text-xl font-bold">{block.label} Placeholder</h3>
                    <p className="opacity-60 mt-2">Block type: {block.type}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Flyout (Quest 5) */}
      {state.contentEditorOpen && state.selectedBlockId && (
        <div className="absolute bottom-6 left-6 z-50 w-80 rounded-2xl border border-border/60 bg-card p-5 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">Edit Block</span>
            <button onClick={() => setState(s => ({ ...s, contentEditorOpen: false }))}><X className="h-4 w-4" /></button>
          </div>
          {state.blocks.find(b => b.id === state.selectedBlockId)?.type === 'hero' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Headline</label>
                <input 
                  type="text" 
                  value={state.editedFields[state.selectedBlockId]?.headline || state.blocks.find(b => b.id === state.selectedBlockId)?.props.headline}
                  onChange={(e) => handleFieldEdit(state.selectedBlockId!, 'headline', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tagline</label>
                <input 
                  type="text" 
                  value={state.editedFields[state.selectedBlockId]?.tagline || state.blocks.find(b => b.id === state.selectedBlockId)?.props.tagline}
                  onChange={(e) => handleFieldEdit(state.selectedBlockId!, 'tagline', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a Hero block to edit text fields.</div>
          )}
        </div>
      )}

      {/* Achievement Toast */}
      {toast && (
        <div className="absolute right-6 top-6 z-50 animate-in slide-in-from-right fade-in flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xl backdrop-blur-md">
          <span className="text-2xl">{toast.icon}</span>
          <div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Achievement Unlocked</p>
            <p className="font-heading font-extrabold">{toast.title}</p>
          </div>
        </div>
      )}

      {/* XP Popups */}
      {xpPopup.map(popup => (
        <div 
          key={popup.id} 
          className="pointer-events-none fixed z-50 font-heading text-xl font-black text-emerald-400 drop-shadow-md animate-out fade-out slide-out-to-top duration-1000"
          style={{ left: popup.x, top: popup.y - 20 }}
        >
          +{popup.xp} XP
        </div>
      ))}
    </div>
  );
}
