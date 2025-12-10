"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings, CheckCircle2 } from "lucide-react";
import { UserProfile } from "@/types/database";
import Image from "next/image";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { useRouter } from "next/navigation";
import { CompanyAutocomplete } from "@/components/ui/company-autocomplete";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30).optional().or(z.literal("")),
  full_name: z.string().max(100).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  university: z.string().max(100).optional().or(z.literal("")),
  graduation_year: z.string().max(4).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  location: z.string().max(100).optional().or(z.literal("")),
  job_title: z.string().max(100).optional().or(z.literal("")),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  github_username: z.string().max(50).optional().or(z.literal("")),
  linkedin_username: z.string().max(50).optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  profile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

type School = {
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
};

export function EditProfileDialog({ profile, onProfileUpdate }: EditProfileDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // University search state
  const [universityQuery, setUniversityQuery] = useState("");
  const [universityResults, setUniversityResults] = useState<School[]>([]);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universityLoading, setUniversityLoading] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<School | null>(null);
  const universityAbortRef = useRef<AbortController | null>(null);

  // Company state
  const [company, setCompany] = useState(profile?.company || "");

  // Location state
  const [location, setLocation] = useState(profile?.location || "");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || "",
      full_name: profile?.full_name || "",
      bio: profile?.bio || "",
      university: profile?.university || "",
      graduation_year: profile?.graduation_year || "",
      company: profile?.company || "",
      location: profile?.location || "",
      job_title: profile?.job_title || "",
      website: profile?.website || "",
      github_username: profile?.github_username || "",
      linkedin_username: profile?.linkedin_username || "",
    },
  });

  // University search effect
  useEffect(() => {
    if (!universityQuery.trim() || universityQuery.trim().length < 2) {
      setUniversityResults([]);
      setShowUniversityDropdown(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setUniversityLoading(true);
        universityAbortRef.current?.abort();
        const ctrl = new AbortController();
        universityAbortRef.current = ctrl;

        const response = await fetch(
          `/api/schools?q=${encodeURIComponent(universityQuery)}`,
          { signal: ctrl.signal }
        );

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const schools: School[] = Array.isArray(data) ? data : [];

        setUniversityResults(schools);
        setShowUniversityDropdown(schools.length > 0);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("University search error:", error);
          setUniversityResults([]);
          setShowUniversityDropdown(false);
        }
      } finally {
        setUniversityLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      universityAbortRef.current?.abort();
    };
  }, [universityQuery]);

  // Reset form when profile changes or dialog opens
  React.useEffect(() => {
    if (open && profile) {
      reset({
        username: profile.username || "",
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        university: profile.university || "",
        graduation_year: profile.graduation_year || "",
        company: profile.company || "",
        location: profile.location || "",
        job_title: profile.job_title || "",
        website: profile.website || "",
        github_username: profile.github_username || "",
        linkedin_username: profile.linkedin_username || "",
      });
      setUniversityQuery(profile.university || "");
      setCompany(profile.company || "");
      setLocation(profile.location || "");
    }
  }, [open, profile, reset]);

  const handleUniversitySelect = (school: School) => {
    setSelectedUniversity(school);
    setUniversityQuery(school.name);
    setShowUniversityDropdown(false);
    // Update the form value
    reset({
      ...reset.getValues(),
      university: school.name,
    });
  };

  const handleUniversityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUniversityQuery(value);
    setSelectedUniversity(null);
    setShowUniversityDropdown(value.length >= 2);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);

    // Create preview and show crop dialog
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImage: Blob) => {
    setAvatarFile(croppedImage);

    // Create preview from cropped blob
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedImage);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      return data.avatarUrl;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw err;
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload avatar first if there's a new one
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          university: selectedUniversity ? selectedUniversity.name : universityQuery,
          company: company,
          location: location,
          avatar_url: avatarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const { profile: updatedProfile } = await response.json();
      onProfileUpdate(updatedProfile);
      setAvatarFile(null);
      setAvatarPreview(null);
      setOpen(false);

      // Profile updated successfully - no need for page reload
      toast.success("Profile updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 cursor-pointer">
          <Settings className="w-4 h-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. This will be visible to other users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-brand">Profile Picture</h3>
            <div className="flex items-center gap-6">
              {/* Avatar Preview */}
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-brand/30 bg-gradient-to-br from-brand/20 to-orange-300/20 flex items-center justify-center shadow-lg">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                  />
                ) : profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Current avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-2xl">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </span>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-brand/30 hover:bg-brand/10"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {avatarFile ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB • JPG, PNG, or GIF
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-brand">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                {...register("username")}
                className="bg-zinc-950 border-zinc-800"
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                {...register("full_name")}
                className="bg-zinc-950 border-zinc-800"
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                rows={4}
                {...register("bio")}
                className="bg-zinc-950 border-zinc-800"
              />
              {errors.bio && (
                <p className="text-sm text-red-500">{errors.bio.message}</p>
              )}
            </div>
          </div>

          {/* Education & Work */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-brand">Education & Work</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <div className="relative">
                  <Input
                    id="university"
                    placeholder="Search for your university..."
                    value={universityQuery}
                    onChange={handleUniversityInputChange}
                    className="bg-zinc-950 border-zinc-800"
                  />
                  
                  {/* University Dropdown */}
                  {showUniversityDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {universityLoading ? (
                        <div className="p-3 text-center text-zinc-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand mx-auto"></div>
                          <span className="ml-2">Searching...</span>
                        </div>
                      ) : universityResults.length > 0 ? (
                        universityResults.map((school) => (
                          <button
                            key={school.code}
                            type="button"
                            onClick={() => handleUniversitySelect(school)}
                            className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-white">{school.name}</div>
                              {school.city && school.state && (
                                <div className="text-sm text-zinc-400">
                                  {school.city}, {school.state}
                                </div>
                              )}
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-brand" />
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-zinc-400">
                          No universities found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {errors.university && (
                  <p className="text-sm text-red-500">{errors.university.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation_year">Graduation Year</Label>
                <Input
                  id="graduation_year"
                  placeholder="2027"
                  {...register("graduation_year")}
                  className="bg-zinc-950 border-zinc-800"
                />
                {errors.graduation_year && (
                  <p className="text-sm text-red-500">{errors.graduation_year.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title / Role</Label>
                <Input
                  id="job_title"
                  placeholder="Software Engineer"
                  {...register("job_title")}
                  className="bg-zinc-950 border-zinc-800"
                />
                {errors.job_title && (
                  <p className="text-sm text-red-500">{errors.job_title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <CompanyAutocomplete
                  value={company}
                  onValueChange={setCompany}
                  placeholder="Search for your company..."
                  className="bg-zinc-950 border-zinc-800"
                />
                {errors.company && (
                  <p className="text-sm text-red-500">{errors.company.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <LocationAutocomplete
                value={location}
                onValueChange={setLocation}
                placeholder="Search worldwide locations..."
                className="bg-zinc-950 border-zinc-800"
              />
              {errors.location && (
                <p className="text-sm text-red-500">{errors.location.message}</p>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-brand">Links</h3>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourwebsite.com"
                {...register("website")}
                className="bg-zinc-950 border-zinc-800"
              />
              {errors.website && (
                <p className="text-sm text-red-500">{errors.website.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="github_username">GitHub Username</Label>
                <Input
                  id="github_username"
                  placeholder="johndoe"
                  {...register("github_username")}
                  className="bg-zinc-950 border-zinc-800"
                />
                {errors.github_username && (
                  <p className="text-sm text-red-500">{errors.github_username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_username">LinkedIn Username</Label>
                <Input
                  id="linkedin_username"
                  placeholder="johndoe"
                  {...register("linkedin_username")}
                  className="bg-zinc-950 border-zinc-800"
                />
                {errors.linkedin_username && (
                  <p className="text-sm text-red-500">{errors.linkedin_username.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand hover:bg-brand/90"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Avatar Crop Dialog */}
      {rawImageSrc && (
        <AvatarCropDialog
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </Dialog>
  );
}
