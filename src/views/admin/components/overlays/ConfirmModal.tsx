"use client";

import { type ReactNode } from "react";
import Modal from "./Modal";
import Button from "../primitives/Button";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Texto o JSX mostrado debajo del preview. */
  message: ReactNode;
  /** Label del boton de confirmacion. Default: "Eliminar" */
  confirmLabel?: string;
  /** Variante del boton. Default: "danger" */
  confirmVariant?: "danger" | "primary";
  /** Deshabilita el boton de confirmacion. */
  confirmDisabled?: boolean;
  /** Muestra spinner en el boton de confirmacion. */
  loading?: boolean;
  /** Preview del item (thumbnail, card, icono) renderizado arriba del mensaje. */
  children?: ReactNode;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Eliminar",
  confirmVariant = "danger",
  confirmDisabled = false,
  loading = false,
  children,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      sheet
      role="alertdialog"
      bottomContent={
        <>
          <Button variant="outline" onClick={onClose} className="max-md:hidden">
            Cancelar
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={confirmDisabled || loading}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {children}
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{message}</div>
      </div>
    </Modal>
  );
}
