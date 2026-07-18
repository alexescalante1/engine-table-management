"use client";

import { forwardRef } from "react";

interface FileInputProps {
  accept?: string;
  onChange: (file: File) => void;
  disabled?: boolean;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ accept, onChange, disabled }, ref) => (
    <input
      ref={ref}
      type="file"
      accept={accept}
      disabled={disabled}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onChange(file);
        e.target.value = "";
      }}
    />
  ),
);

FileInput.displayName = "FileInput";
export default FileInput;
