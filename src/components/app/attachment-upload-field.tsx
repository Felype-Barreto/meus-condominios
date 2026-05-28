"use client";

import { FileUp, Loader2, Paperclip, X } from "lucide-react";
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

export function AttachmentUploadField({
  condoId,
  folder,
  name = "attachments",
  label = "Anexos",
  description = "Opcional. Arquivos ficam no Storage privado do condomínio.",
}: {
  condoId: string;
  folder: "tickets" | "incidents" | "packages";
  name?: string;
  label?: string;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList) {
    setError("");
    setUploading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre na sua conta para enviar anexos.");

      const nextPaths: string[] = [];
      const nextFileNames: string[] = [];
      for (const file of Array.from(files).slice(0, 5)) {
        const safeName = cleanFileName(file.name || "anexo");
        const objectPath = `${condoId}/${folder}/${user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("morai-documents")
          .upload(objectPath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;
        nextPaths.push(objectPath);
        nextFileNames.push(file.name);
      }

      setPaths((current) => [...current, ...nextPaths]);
      setFileNames((current) => [...current, ...nextFileNames]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o anexo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={paths.join(",")} />
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) void uploadFiles(event.target.files);
        }}
      />
      <div className="rounded-lg border bg-muted/45 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
              <Paperclip className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Enviar arquivo
          </Button>
        </div>
        {fileNames.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {fileNames.map((fileName, index) => (
              <span key={`${fileName}-${index}`} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold">
                {fileName}
                <button
                  type="button"
                  aria-label={`Remover ${fileName}`}
                  onClick={() => {
                    setPaths((current) => current.filter((_, itemIndex) => itemIndex !== index));
                    setFileNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
