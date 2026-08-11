"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { MediaSize, Size } from "react-easy-crop";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Camera, Check, KeyRound, Loader2, Mail, Upload, X } from "lucide-react";
import "react-easy-crop/react-easy-crop.css";
import { updateProfileAction } from "@/app/actions/profile";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80, "First name is too long"),
  lastName: z.string().trim().max(80, "Last name is too long").optional(),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  userId: string;
  initialEmail: string;
  initialFirstName: string;
  initialLastName: string;
  initialAvatarUrl?: string | null;
};

type AreaPixels = { x: number; y: number; width: number; height: number };
const AVATAR_BUCKET = "profile-avatars";
// The stored avatar is a fixed-size square. Avatars render at ~96px on screen,
// so 512px is plenty for retina without bloating the upload. Fixing the output
// size also normalizes the file regardless of how far the user zoomed out — a
// full-image "fit" crop and a tight face crop both land as a 512×512 webp.
const AVATAR_OUTPUT_SIZE = 512;
// Accepted input types. `image/*` on the <input> is permissive; we still guard
// explicitly so an odd file (HEIC the browser can't decode, an SVG, etc.) gets
// a friendly message instead of a broken canvas later.
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function getInitials(firstName: string, lastName: string, email: string): string {
  const full = `${firstName} ${lastName}`.trim();
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function getStoragePathFromPublicUrl(publicUrl?: string | null): string | null {
  if (!publicUrl) return null;
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function imageToCanvas(imageSrc: string, area: AreaPixels): Promise<HTMLCanvasElement> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Could not read this image."));
  });

  const canvas = document.createElement("canvas");
  // Always emit a fixed square. The source rectangle (`area`) is in the image's
  // natural pixel space; when the user has zoomed OUT to fit the whole photo,
  // `area` extends past the image bounds (negative x/y, width > naturalWidth) so
  // the parts outside the image draw as transparent — the honest result of
  // "capture the whole thing," and the corners are clipped by the circular
  // avatar mask anyway.
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE
  );

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to prepare image."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

export function ProfileForm({
  userId,
  initialEmail,
  initialFirstName,
  initialLastName,
  initialAvatarUrl,
}: ProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    initialAvatarUrl ? `${initialAvatarUrl}?v=${Date.now()}` : undefined
  );
  const initialAvatarUrlRef = useRef<string | undefined>(initialAvatarUrl ?? undefined);
  const pendingDeletePathRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // minZoom is computed per image once the media + crop area are measured, so it
  // can drop BELOW 1 for a photo that isn't already square — that's what lets the
  // user zoom out until the whole wide/tall image fits inside the crop circle.
  const [minZoom, setMinZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<AreaPixels | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // The crop source is an object URL (cheaper than a base64 data URL for big
  // photos). We hold it in a ref so we can revoke it on cancel / replace /
  // unmount and never leak. Latest media + crop dimensions feed the minZoom calc.
  const objectUrlRef = useRef<string | null>(null);
  const mediaSizeRef = useRef<MediaSize | null>(null);
  const cropSizeRef = useRef<Size | null>(null);
  // Guards the one-time "open showing the whole image" snap per selected file,
  // so later re-measures (e.g. container resize) don't yank the user's zoom.
  const didInitZoomRef = useRef(false);
  // "Send password reset link" — reuses the existing forgot-password
  // flow so we don't have to add a separate "change password" page.
  // The reset email funnels through the same hardened /auth/callback
  // route + branded template.
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialFirstName,
      lastName: initialLastName,
      email: initialEmail,
    },
    mode: "onTouched",
  });

  const initials = useMemo(
    () => getInitials(form.watch("firstName"), form.watch("lastName") ?? "", initialEmail),
    [form, initialEmail]
  );

  // Revoke the current crop object URL (if any) and forget it. Safe to call
  // repeatedly — the leak guard for cancel / replace / unmount / save.
  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  // Recompute the fit-to-image zoom whenever the media or crop area is measured.
  // fitZoom = the zoom at which the ENTIRE image fits inside the crop box; for a
  // non-square photo it is < 1, so we expose it as the slider's floor and open
  // the dialog already zoomed out to show the whole picture (the thing Morgan
  // could never reach before). restrictPosition is off, so panning past the
  // edges works and the crop can extend beyond the image when fully zoomed out.
  const recomputeMinZoom = () => {
    const media = mediaSizeRef.current;
    const cropSize = cropSizeRef.current;
    if (!media || !cropSize || media.width === 0 || media.height === 0) return;
    const fitZoom = Math.min(cropSize.width / media.width, cropSize.height / media.height);
    // Never let the floor exceed 1 (a square image fits at zoom 1), and keep a
    // small hard floor so an extreme panorama can't collapse the slider to ~0.
    const nextMin = Math.max(0.05, Math.min(fitZoom, 1));
    setMinZoom(nextMin);
    if (!didInitZoomRef.current) {
      // First measure for this image: open at the fit zoom so the WHOLE photo is
      // visible inside the circle straight away (a square image → fit is 1, i.e.
      // unchanged). The user can then zoom in for a tighter crop.
      didInitZoomRef.current = true;
      setZoom(nextMin);
    } else {
      // Later re-measures (resize): only nudge up if the floor rose past current.
      setZoom((current) => (current < nextMin ? nextMin : current));
    }
  };

  // Tear down the crop dialog. `revoke` is false only when we've just consumed
  // the image into an upload and already revoked it explicitly.
  const closeCropDialog = (revoke = true) => {
    setCropOpen(false);
    setRawImage(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(1);
    mediaSizeRef.current = null;
    cropSizeRef.current = null;
    didInitZoomRef.current = false;
    if (revoke) revokeObjectUrl();
  };

  const handleFileSelected = (file?: File) => {
    if (!file) return;
    const typeOk = file.type
      ? ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/")
      : false;
    if (!typeOk) {
      toast({
        title: "Unsupported file",
        description: "Please choose a JPG, PNG, WEBP, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "Image too large",
        description: "Please use an image smaller than 15MB before cropping.",
        variant: "destructive",
      });
      return;
    }

    // Replace any in-flight crop source before starting a new one (leak guard).
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    mediaSizeRef.current = null;
    cropSizeRef.current = null;
    didInitZoomRef.current = false;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(1);
    setCroppedAreaPixels(null);
    setRawImage(url);
    setCropOpen(true);
  };

  // Revoke any lingering crop object URL if the page unmounts mid-crop.
  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, []);

  const uploadCroppedAvatar = async () => {
    if (!rawImage || !croppedAreaPixels) return;

    try {
      setIsUploadingAvatar(true);
      const canvas = await imageToCanvas(rawImage, croppedAreaPixels);
      const blob = await canvasToBlob(canvas, 0.92);

      const supabase = createBrowserSupabaseClient();
      const path = `${userId}/avatar-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, blob, {
          upsert: true,
          cacheControl: "3600",
          contentType: "image/webp",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage.from("profile-avatars").getPublicUrl(path);
      const previousUrl = avatarUrl;
      setAvatarUrl(`${publicData.publicUrl}?v=${Date.now()}`);

      if (previousUrl && previousUrl !== initialAvatarUrlRef.current) {
        const previousPath = getStoragePathFromPublicUrl(previousUrl);
        if (previousPath) {
          await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
        }
      }

      if (previousUrl && previousUrl === initialAvatarUrlRef.current) {
        pendingDeletePathRef.current = getStoragePathFromPublicUrl(previousUrl);
      }

      // The blob has been drawn to canvas and uploaded — safe to revoke now.
      revokeObjectUrl();
      closeCropDialog(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload avatar.";
      toast({
        title: "Avatar upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!initialEmail || isSendingReset) return;
    setIsSendingReset(true);
    const result = await requestPasswordResetAction({ email: initialEmail });
    setIsSendingReset(false);
    if (!result.ok) {
      toast({
        title: "Couldn't send reset link",
        description: result.message,
        variant: "destructive",
      });
      return;
    }
    setResetSent(true);
    toast({
      title: "Reset link sent",
      description: `Check ${initialEmail} for the link to set a new password.`,
    });
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);
    const cleanAvatarUrl = avatarUrl ? avatarUrl.split("?")[0] : null;
    const result = await updateProfileAction({
      firstName: values.firstName,
      lastName: values.lastName ?? "",
      avatarUrl: cleanAvatarUrl,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast({
        title: "Could not save profile",
        description: result.message,
        variant: "destructive",
      });
      return;
    }

    if (cleanAvatarUrl && cleanAvatarUrl !== initialAvatarUrlRef.current && pendingDeletePathRef.current) {
      const supabase = createBrowserSupabaseClient();
      await supabase.storage.from(AVATAR_BUCKET).remove([pendingDeletePathRef.current]);
      pendingDeletePathRef.current = null;
    }

    initialAvatarUrlRef.current = cleanAvatarUrl ?? undefined;
    setAvatarUrl(cleanAvatarUrl ? `${cleanAvatarUrl}?v=${Date.now()}` : undefined);
    window.dispatchEvent(
      new CustomEvent("profile-updated", {
        detail: {
          firstName: values.firstName,
          lastName: values.lastName ?? "",
          avatarUrl: cleanAvatarUrl,
        },
      })
    );
    router.refresh();
    toast({
      title: "Profile updated",
      description: "Your profile changes have been saved successfully.",
    });
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-2">Your account details, profile photo, and billing.</p>
        </div>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div
              className={`rounded-3xl border bg-card/80 p-4 shadow-sm transition-colors sm:p-5 ${
                isDraggingOver ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isDraggingOver) setIsDraggingOver(true);
              }}
              onDragLeave={(event) => {
                // Ignore drag-leave bubbling up from child elements.
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setIsDraggingOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingOver(false);
                handleFileSelected(event.dataTransfer.files?.[0]);
              }}
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <button
                  type="button"
                  className="group relative shrink-0 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change profile photo"
                >
                  <Avatar className="size-20 border border-border shadow-sm sm:size-24">
                    <AvatarImage key={avatarUrl ?? "empty-avatar"} src={avatarUrl} alt="Profile photo" />
                    <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary sm:text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-100 transition-opacity group-hover:bg-black/45 sm:opacity-0 sm:group-hover:opacity-100">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/80 text-foreground/70 shadow-sm backdrop-blur sm:size-10">
                      <Camera className="size-4 sm:size-5" />
                    </span>
                  </span>
                </button>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {`${form.watch("firstName")} ${form.watch("lastName") ?? ""}`.trim() || initialEmail}
                  </p>
                  <p className="truncate text-sm text-muted-foreground sm:text-base">{initialEmail}</p>
                  <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Tap the photo{" "}
                    <span className="hidden sm:inline">or drag an image here</span> to update your
                    profile picture and crop it in a circle. JPG, PNG, WEBP, or GIF up to 15MB.
                  </p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                handleFileSelected(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input className="h-11 rounded-xl" placeholder="First name" disabled={isSaving} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 rounded-xl"
                        placeholder="Last name"
                        disabled={isSaving}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        className="h-11 cursor-not-allowed rounded-xl bg-muted/40 text-muted-foreground"
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Email cannot be changed here.</p>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSaving} className="min-w-40 rounded-xl">
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Security — change password via emailed reset link. Keeps the
            flow simple and secure (proves email access) while avoiding a
            separate in-app "current password / new password" form. */}
        <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <KeyRound className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground sm:text-base">Password</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Send yourself a one-time link to set a new password. The link is
                  emailed to <span className="font-medium text-foreground">{initialEmail}</span>{" "}
                  and expires in 1 hour.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl shrink-0"
              onClick={() => void handleSendPasswordReset()}
              disabled={isSendingReset || resetSent}
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : resetSent ? (
                <>
                  <Check className="size-4" />
                  Link sent
                </>
              ) : (
                <>
                  <Mail className="size-4" />
                  Send reset link
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          // Backdrop click / Esc closes → treat as cancel (revoke + reset),
          // but never yank the dialog out from under an in-progress upload.
          if (!open) {
            if (isUploadingAvatar) return;
            closeCropDialog(true);
            return;
          }
          setCropOpen(open);
        }}
      >
        {/* Column + inner scroller (same shape as template-form-dialog): the
            header/cropper/zoom block scrolls and the footer stays pinned, so
            Cancel + Save photo are reachable on a short viewport. `p-0
            overflow-hidden` deletes the Dialog primitive's own overflow-y-auto
            via tailwind-merge, so this dialog has to supply its own. */}
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-center sm:text-center text-4xl font-bold">
                Crop profile photo
              </DialogTitle>
              <DialogDescription className="text-center text-xl">
                Adjust the circle to choose the area for your avatar.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6">
              <div className="relative h-[340px] sm:h-[420px] bg-black rounded-3xl overflow-hidden">
                {rawImage ? (
                  <Cropper
                    image={rawImage}
                    crop={crop}
                    zoom={zoom}
                    minZoom={minZoom}
                    maxZoom={4}
                    aspect={1}
                    cropShape="round"
                    showGrid={true}
                    // restrictPosition off is what lets the user zoom OUT below
                    // "cover" to fit the whole image and pan all the way to the
                    // edges — with it on (the default) the image is pinned to
                    // cover the crop and you can never reach a wide/tall edge.
                    restrictPosition={false}
                    zoomWithScroll
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onMediaLoaded={(mediaSize) => {
                      mediaSizeRef.current = mediaSize;
                      recomputeMinZoom();
                    }}
                    onCropSizeChange={(cropSize) => {
                      cropSizeRef.current = cropSize;
                      recomputeMinZoom();
                    }}
                    onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels as AreaPixels)}
                  />
                ) : null}
              </div>

              <div className="py-6 px-1">
                <Slider
                  value={[zoom]}
                  min={minZoom}
                  max={4}
                  step={0.01}
                  aria-label="Zoom"
                  onValueChange={(values) => setZoom(values[0])}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Drag the photo to reposition. Slide left to fit the whole image, right to zoom in.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 px-6 pb-6 sm:justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl min-w-36"
              onClick={() => closeCropDialog(true)}
              disabled={isUploadingAvatar}
            >
              <X />
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-2xl min-w-44 bg-[#2f658f] hover:bg-[#2f658f]/90 text-white"
              onClick={() => void uploadCroppedAvatar()}
              disabled={isUploadingAvatar || !croppedAreaPixels}
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload />
                  Save photo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
