import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Check, X, Tag, Calendar, ShieldAlert } from 'lucide-react';
import { Category, UserProfile } from '../types';
import { TaskTrackerRepository } from '../repositories/TaskTrackerRepository';

interface CategoriesViewProps {
  categories: Category[];
  currentUser: UserProfile;
  onRefresh: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#64748b'  // Slate
];

export default function CategoriesView({ categories, currentUser, onRefresh }: CategoriesViewProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete Confirm State
  const [catToDelete, setCatToDelete] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Category Name is required');
      return;
    }

    // Check duplicate
    if (categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A category with this name already exists');
      return;
    }

    setLoading(true);
    try {
      await TaskTrackerRepository.createCategory(name, selectedColor, currentUser.uid);
      setName('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (catId: string) => {
    setError('');
    if (!editName.trim()) {
      setError('Name is required');
      return;
    }

    // Check duplicate among OTHER categories
    if (categories.some(c => c.id !== catId && c.name.toLowerCase() === editName.trim().toLowerCase())) {
      setError('Another category already has this name');
      return;
    }

    try {
      await TaskTrackerRepository.updateCategory(catId, editName, editColor);
      setEditingCatId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    }
  };

  const handleDeleteRequest = (catId: string) => {
    setCatToDelete(catId);
  };

  const executeDelete = async () => {
    if (!catToDelete) return;
    setError('');
    try {
      await TaskTrackerRepository.deleteCategory(catToDelete);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setCatToDelete(null);
    }
  };

  return (
    <div className="space-y-8 select-none" id="categories-view-root">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="categories-header">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Category Management</h2>
        <p className="text-sm text-slate-500 mt-0.5">Dynamically add and customize categories for your workflow engine.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2" id="categories-error-banner">
          <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Create Category Panel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 h-fit" id="create-category-panel">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            Create Category
          </h3>

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="category-name-input">Category Name</label>
              <input
                id="category-name-input"
                type="text"
                maxLength={40}
                placeholder="e.g. QA Automation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
              />
            </div>

            {/* Predefined Colors */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Brand Color Accent</label>
              <div className="grid grid-cols-5 gap-2.5 pt-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className="h-8 w-full rounded-lg transition-all relative flex items-center justify-center cursor-pointer border border-transparent shadow-xs hover:scale-105"
                    style={{ backgroundColor: c }}
                  >
                    {selectedColor === c && (
                      <Check className="h-4 w-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
                
                {/* Custom Hex Color Picker */}
                <div className="relative h-8 w-full rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50">
                  <input 
                    type="color" 
                    value={selectedColor} 
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="absolute inset-0 opacity-0 h-full w-full cursor-pointer"
                  />
                  <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: selectedColor }} />
                </div>
              </div>
            </div>

            <button
              id="create-category-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{loading ? 'Creating...' : 'Add Category'}</span>
            </button>
          </form>
        </div>

        {/* Existing Categories List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-8" id="categories-list-panel">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-5">Active Custom Categories</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(c => {
              const isEditing = editingCatId === c.id;

              return (
                <motion.div 
                  key={c.id}
                  layout
                  className="p-4 border border-slate-200 bg-slate-50/50 hover:bg-white rounded-xl flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-all duration-200"
                >
                  {isEditing ? (
                    <div className="space-y-3" id={`edit-cat-${c.id}`}>
                      {/* Edit Name */}
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 rounded-lg"
                      />
                      {/* Edit Color Choices */}
                      <div className="flex gap-1.5 flex-wrap">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className="h-6 w-6 rounded-md border border-transparent flex items-center justify-center cursor-pointer shadow-2xs"
                            style={{ backgroundColor: color }}
                          >
                            {editColor === color && <Check className="h-3 w-3 text-white" />}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-md cursor-pointer flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdate(c.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md cursor-pointer flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        {/* Color & Title */}
                        <div className="flex items-center gap-2.5">
                          <div className="h-4 w-4 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: c.color }} />
                          <span className="font-bold text-slate-700 tracking-tight">{c.name}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCatId(c.id);
                              setEditName(c.name);
                              setEditColor(c.color);
                            }}
                            className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(c.id)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-md flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Created date & metadata */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Calendar className="h-3 w-3" />
                        <span>Created: {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}

            {categories.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm md:col-span-2">
                No custom categories found. Create a category to start structuring tasks.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Delete Category Confirmation Modal */}
      <AnimatePresence>
        {catToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCatToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              id="delete-cat-backdrop"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl shadow-xl flex flex-col gap-4 text-slate-800 z-10"
              id="delete-cat-dialog"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm md:text-base">Delete Category?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to delete this category? Any tasks using it will still display the text, but the category object will be removed.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  id="delete-cat-cancel"
                  type="button"
                  onClick={() => setCatToDelete(null)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg text-xs transition-all border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="delete-cat-confirm"
                  type="button"
                  onClick={executeDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-all shadow-2xs cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
