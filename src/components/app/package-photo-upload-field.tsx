"use client";

import { Camera, Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function cleanFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function PackagePhotoUploadField({
  condoId,
  name = "photo_url",
}: {
  condoId: string;
  name?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [path, setPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    setError("");
    setUploading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const safeName = cleanFileName(file.name || "foto-encomenda.jpg");
      const objectPath = `${condoId}/packages/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("morai-documents")
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setPath(objectPath);
      setFileName(file.name);
    } catch (uploadError) {
      setPath("");
      setFileName("");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={path} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />
      <div className="rounded-lg border bg-muted/45 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {fileName || "Foto da encomenda"}
              </p>
              <p className="text-xs text-muted-foreground">
                Opcional. A imagem fica salva no Storage privado do condomínio.
              </p>
            </div>
          </div>
          {path ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPath("");
                setFileName("");
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X className="h-4 w-4" />
              Remover
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Enviar foto
            </Button>
          )}
        </div>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
