"use client";

import { useState, useCallback } from "react";

interface ModalState<T> {
  modalOpen: boolean;
  editingId: string | null;
  deleteConfirm: T | null;
  openModal: (id?: string | null) => void;
  closeModal: () => void;
  setDeleteConfirm: (item: T | null) => void;
}

export function useModalState<T = unknown>(): ModalState<T> {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<T | null>(null);

  const openModal = useCallback((id?: string | null) => {
    setEditingId(id ?? null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  return { modalOpen, editingId, deleteConfirm, openModal, closeModal, setDeleteConfirm };
}
