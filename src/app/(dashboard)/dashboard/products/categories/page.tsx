"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { categorySchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  FolderOpen,
} from "lucide-react";

interface Category {
  id: string;
  merchant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantId, setMerchantId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!merchant) {
        router.push("/dashboard/setup");
        return;
      }

      setMerchantId(merchant.id);

      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("sort_order", { ascending: true });

      setCategories(data || []);
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validation = categorySchema.safeParse({
      name: newName,
      sort_order: categories.length,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid input");
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from("categories")
        .insert({
          merchant_id: merchantId,
          name: validation.data.name,
          sort_order: categories.length,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      if (data) {
        setCategories((prev) => [...prev, data]);
        setNewName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setError("");

    const validation = categorySchema.safeParse({ name: editingName });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid input");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("categories")
        .update({ name: validation.data.name })
        .eq("id", id)
        .eq("merchant_id", merchantId);

      if (updateError) throw new Error(updateError.message);

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === id ? { ...cat, name: validation.data.name } : cat
        )
      );
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products in this category will become uncategorized.")) {
      return;
    }

    setError("");

    try {
      // Unlink products from this category
      await supabase
        .from("products")
        .update({ category_id: null })
        .eq("category_id", id)
        .eq("merchant_id", merchantId);

      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("merchant_id", merchantId);

      if (deleteError) throw new Error(deleteError.message);

      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const index = categories.findIndex((cat) => cat.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === categories.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const newCategories = [...categories];
    [newCategories[index], newCategories[swapIndex]] = [
      newCategories[swapIndex],
      newCategories[index],
    ];

    // Update sort_order values
    const updated = newCategories.map((cat, i) => ({
      ...cat,
      sort_order: i,
    }));
    setCategories(updated);

    // Persist both swapped items
    try {
      await Promise.all([
        supabase
          .from("categories")
          .update({ sort_order: updated[index].sort_order })
          .eq("id", updated[index].id),
        supabase
          .from("categories")
          .update({ sort_order: updated[swapIndex].sort_order })
          .eq("id", updated[swapIndex].id),
      ]);
    } catch {
      setError("Failed to reorder. Please refresh.");
    }
  }

  function startEditing(cat: Category) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  if (loading) {
    return (
      <div className="md:ml-56 flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="md:ml-56">
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft size={16} />
          Back to products
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organize your products into categories
        </p>
      </div>

      <div className="bg-white rounded-lg border max-w-lg">
        {/* Add category form */}
        <form onSubmit={handleAdd} className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              maxLength={50}
            />
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className={cn(
                "flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                saving || !newName.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-700"
              )}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </form>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Category list */}
        {categories.length === 0 ? (
          <div className="p-8 text-center">
            <FolderOpen size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              No categories yet. Add one above to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {categories.map((cat, index) => (
              <li
                key={cat.id}
                className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50"
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      maxLength={50}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleUpdate(cat.id);
                        }
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                    <button
                      onClick={() => handleUpdate(cat.id)}
                      disabled={saving}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="Save"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-900">
                      {cat.name}
                    </span>

                    {/* Reorder buttons */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleReorder(cat.id, "up")}
                        disabled={index === 0}
                        className={cn(
                          "p-0.5",
                          index === 0
                            ? "text-gray-200 cursor-not-allowed"
                            : "text-gray-400 hover:text-gray-600"
                        )}
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleReorder(cat.id, "down")}
                        disabled={index === categories.length - 1}
                        className={cn(
                          "p-0.5",
                          index === categories.length - 1
                            ? "text-gray-200 cursor-not-allowed"
                            : "text-gray-400 hover:text-gray-600"
                        )}
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => startEditing(cat)}
                      className="text-gray-400 hover:text-green-600 p-1"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
