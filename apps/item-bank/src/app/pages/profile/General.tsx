import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, ImagePlus, X, ChevronDown } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Separator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@item-bank/ui';

const createProfileSchema = (t: (key: string) => string) =>
  z.object({
    firstName: z.string().min(1, t('profile.field_required')),
    lastName: z.string().min(1, t('profile.field_required')),
    username: z.string(),
    phoneNumber: z.string(),
    email: z.string(),
  });

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  email: string;
};

const defaultValues: ProfileFormValues = {
  firstName: '',
  lastName: '',
  username: 'john.smith',
  phoneNumber: '',
  email: 'johm.smith@sayeghonline.com',
};

const General = () => {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  const profileSchema = createProfileSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const onSave = handleSubmit((_data) => {
    setSaveMenuOpen(false);
  });

  return (
    <div className="flex-1 min-w-0 p-6 flex justify-center items-start bg-background">
      <div className="w-full rounded-[12px] p-6 shadow-md border border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <User className="text-primary" size={28} />
          <h2 className="font-semibold text-xl text-primary">
            {t('profile.edit_profile')}
          </h2>
        </div>

        <Separator className="mx-0" />

        <div className="flex gap-8 mt-6 flex-wrap">
          {/* Avatar upload zone */}
          <div
            className="cursor-pointer flex items-center justify-center relative w-[200px] h-[200px] shrink-0 rounded-full overflow-hidden transition-colors duration-200 bg-input border-2 border-dashed border-border hover:border-primary hover:bg-primary/[0.04] group"
            onClick={handleAvatarClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            role="button"
            aria-label={t('profile.upload_profile_picture')}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden
            />

            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-4">
                <ImagePlus size={56} className="text-muted-foreground" />
              </div>
            )}

            {profileImage && (
              <button
                type="button"
                className="absolute top-2 end-2 z-10 w-8 h-8 p-1.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors flex items-center justify-center"
                onClick={handleAvatarRemove}
                aria-label={t('profile.remove_photo')}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X size={16} />
              </button>
            )}

            {/* Hover overlay — shown when hovering the zone */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-background/85">
              <ImagePlus size={48} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center px-2">
                {t('profile.drag_and_drop')}
              </p>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAvatarClick();
                }}
              >
                {t('profile.browse')}
              </Button>
            </div>
          </div>

          {/* Profile form */}
          <form
            className="flex-1 min-w-[280px] flex flex-col gap-5"
            onSubmit={onSave}
          >
            {/* First name + last name row */}
            <div className="flex gap-4 [&>*]:flex-1">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">{t('profile.first_name')}</Label>
                <Input
                  id="firstName"
                  className="bg-input"
                  aria-invalid={!!errors.firstName}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">{t('profile.last_name')}</Label>
                <Input
                  id="lastName"
                  className="bg-input"
                  aria-invalid={!!errors.lastName}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{t('profile.username')}</Label>
              <Input
                id="username"
                className="bg-muted/50 disabled:opacity-50"
                disabled
                {...register('username')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phoneNumber">{t('profile.phone_number')}</Label>
              <Input
                id="phoneNumber"
                className="bg-input"
                {...register('phoneNumber')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('profile.email')}</Label>
              <Input
                id="email"
                className="bg-muted/50 disabled:opacity-50"
                disabled
                {...register('email')}
              />
            </div>

            <Separator className="mx-0" />

            {/* Action row */}
            <div className="flex items-center flex-wrap gap-3">
              <Button type="button" variant="outline">
                {t('profile.cancel')}
              </Button>

              {/* Split save button */}
              <div className="flex">
                <Button
                  type="submit"
                  className="rounded-e-none"
                  onClick={onSave}
                >
                  {t('profile.save')}
                </Button>
                <Popover open={saveMenuOpen} onOpenChange={setSaveMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      className="rounded-s-none border-s border-s-primary-foreground/30 px-2"
                      aria-haspopup="true"
                      aria-expanded={saveMenuOpen}
                      aria-label={t('profile.save_options')}
                    >
                      <ChevronDown size={16} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-1">
                    <button
                      type="button"
                      className="w-full text-start px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => setSaveMenuOpen(false)}
                    >
                      {t('profile.save_and_continue')}
                    </button>
                    <button
                      type="button"
                      className="w-full text-start px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => setSaveMenuOpen(false)}
                    >
                      {t('profile.save_and_close')}
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default General;
