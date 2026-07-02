"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { WizardProgress } from "./wizard-progress";
import { AccountStep, type AccountFields } from "./steps/account-step";
import { PhotosStep, type PhotoItem } from "./steps/photos-step";
import { DetailsStep, type DetailsFields } from "./steps/details-step";
import { DoneStep } from "./steps/done-step";

const EMPTY_ACCOUNT: AccountFields = {
  restaurantName: "",
  name: "",
  email: "",
  password: "",
};

const EMPTY_DETAILS: DetailsFields = {
  cuisine: "",
  tagline: "",
  tableCount: "",
  address: "",
  phone: "",
  description: "",
};

let localIdSeq = 0;
function nextLocalId() {
  localIdSeq += 1;
  return `local-${localIdSeq}`;
}

export function SignupWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [account, setAccount] = React.useState<AccountFields>(EMPTY_ACCOUNT);
  const [details, setDetails] = React.useState<DetailsFields>(EMPTY_DETAILS);
  const [photos, setPhotos] = React.useState<PhotoItem[]>([]);

  async function handleAccountSubmit(fields: AccountFields): Promise<string | null> {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.error ?? "Something went wrong. Please try again.";
      }
    } catch {
      return "Couldn't reach the server. Please try again.";
    }
    setAccount(fields);
    setStep(2);
    return null;
  }

  function uploadPhoto(localId: string, file: File) {
    const form = new FormData();
    form.append("files", file);
    fetch("/api/uploads", { method: "POST", body: form })
      .then(async (res) => {
        const data = await res.json().catch(() => ({ results: [] }));
        const result = data.results?.[0];
        setPhotos((prev) =>
          prev.map((p) =>
            p.localId === localId
              ? result?.id
                ? { ...p, status: "done", id: result.id, url: result.url }
                : { ...p, status: "error", error: result?.error ?? "Upload failed" }
              : p,
          ),
        );
      })
      .catch(() => {
        setPhotos((prev) =>
          prev.map((p) =>
            p.localId === localId
              ? { ...p, status: "error", error: "Upload failed" }
              : p,
          ),
        );
      });
  }

  function handleAddFiles(files: File[]) {
    const room = 6 - photos.length;
    const toAdd = files.slice(0, Math.max(0, room));
    const items: PhotoItem[] = toAdd.map((file) => ({
      localId: nextLocalId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }));
    setPhotos((prev) => [...prev, ...items]);
    items.forEach((item) => uploadPhoto(item.localId, item.file));
  }

  function handleRemovePhoto(localId: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.status === "done" && target.id) {
          fetch(`/api/uploads/${target.id}`, { method: "DELETE" }).catch(() => {});
        }
      }
      return prev.filter((p) => p.localId !== localId);
    });
  }

  async function handleDetailsSubmit(fields: DetailsFields): Promise<string | null> {
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuisine: fields.cuisine,
          tagline: fields.tagline,
          tableCount: Number(fields.tableCount),
          address: fields.address,
          phone: fields.phone,
          description: fields.description,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.error ?? "Something went wrong. Please try again.";
      }
    } catch {
      return "Couldn't reach the server. Please try again.";
    }
    setDetails(fields);
    setStep(4);
    return null;
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6">
        <WizardProgress step={step} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-md sm:p-8">
        {step === 1 && <AccountStep onSubmit={handleAccountSubmit} />}
        {step === 2 && (
          <PhotosStep
            photos={photos}
            onAddFiles={handleAddFiles}
            onRemove={handleRemovePhoto}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <DetailsStep
            initial={details}
            onBack={() => setStep(2)}
            onSubmit={handleDetailsSubmit}
          />
        )}
        {step === 4 && (
          <DoneStep
            account={account}
            details={details}
            photos={photos}
            onGoToDashboard={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}
