import { useState } from 'react';

import { useTranslation } from 'react-i18next';
import { UserPlus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';
import { getUsers } from '@item-bank/api';
import type { CourseAssignment } from '@item-bank/api';

import {
  useCourseAssignments,
  useAssignUser,
  useUnassignUser,
} from '../../../features/courses/hooks';

// ─── Assign dialog ────────────────────────────────────────────────────────────

interface AssignDialogProps {
  courseId: number;
  open: boolean;
  onClose: () => void;
}

function AssignDialog({ courseId, open, onClose }: AssignDialogProps) {
  const { t } = useTranslation('common');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: usersPage } = useQuery({
    queryKey: ['admin-users-picker'],
    queryFn: () => getUsers({ per_page: 200 }),
    enabled: open,
  });
  const users = usersPage?.items ?? [];

  const { mutate: assignUser, isPending } = useAssignUser();

  const handleSubmit = () => {
    if (!selectedUserId) return;
    assignUser(
      {
        courseId,
        data: {
          user_id: Number(selectedUserId),
          due_date: dueDate || undefined,
        },
      },
      {
        onSuccess: () => {
          setSelectedUserId('');
          setDueDate('');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('courses.assign_user_dialog_title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-user">{t('courses.user_email')}</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="assign-user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-due">{t('courses.due_date_optional')}</Label>
            <Input
              id="assign-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('profile.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!selectedUserId || isPending}
            onClick={handleSubmit}
          >
            {isPending ? t('courses.saving') : t('courses.assign_user')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignment row ───────────────────────────────────────────────────────────

interface AssignmentRowProps {
  assignment: CourseAssignment;
  courseId: number;
}

function AssignmentRow({ assignment, courseId }: AssignmentRowProps) {
  const { t } = useTranslation('common');
  const { mutate: unassign } = useUnassignUser();

  return (
    <li className="flex items-center gap-3 rounded-lg border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{assignment.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{assignment.user.email}</p>
        {assignment.due_date && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            {t('courses.due_date')}: {assignment.due_date}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label={t('courses.remove')}
        className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={() => unassign({ courseId, userId: assignment.user.id })}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export interface AssignedUsersPanelProps {
  courseId: number;
}

/**
 * Tab 3 of CourseEditor — lists enrolled users and provides assign/unassign UI.
 */
export function AssignedUsersPanel({ courseId }: AssignedUsersPanelProps) {
  const { t } = useTranslation('common');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: assignments = [], isLoading } = useCourseAssignments(courseId);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('courses.assigned_users')}</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <UserPlus size={14} className="me-1.5" />
          {t('courses.assign_user')}
        </Button>
      </div>

      {isLoading && (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && assignments.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('courses.no_assigned_users')}
        </p>
      )}

      {!isLoading && assignments.length > 0 && (
        <ol className="flex flex-col gap-2">
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} courseId={courseId} />
          ))}
        </ol>
      )}

      <AssignDialog courseId={courseId} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
