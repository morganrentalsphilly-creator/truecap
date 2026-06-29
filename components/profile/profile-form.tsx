"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
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
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<AreaPixels | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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

  const handleFileSelected = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    const maxUploadBytes = 15 * 1024 * 1024;
    if (file.size > maxUploadBytes) {
      toast({
        title: "Image too large",
        description: "Please use an image smaller than 15MB before cropping.",
        variant: "destructive",
      });
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      setRawImage(fileReader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen(true);
    };
    fileReader.onerror = () => {
      toast({
        title: "Could not read image",
        description: "Please try another image.",
        variant: "destructive",
      });
    };
    fileReader.readAsDataURL(file);
  };

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

      setCropOpen(false);
      setRawImage(null);
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
            <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
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
                    Tap the photo to update your profile picture and crop it in a circle.
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
                void handleFileSelected(event.target.files?.[0]);
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

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
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
                  aspect={1}
                  cropShape="round"
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels as AreaPixels)}
                />
              ) : null}
            </div>

            <div className="py-6 px-1">
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={(values) => setZoom(values[0])}
              />
              <p className="text-xs text-muted-foreground mt-2">Zoom</p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 sm:justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl min-w-36"
              onClick={() => {
                setCropOpen(false);
                setRawImage(null);
              }}
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
