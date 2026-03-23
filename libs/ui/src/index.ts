// libs/ui/src/index.ts
export { default as NavBar, type NavBarProps } from './components/NavBar';
export { NotificationPanel, type NotificationPanelProps } from './components/NotificationPanel';
export type { Notification } from './types/Notification';
export { default as ActionButton, type DropdownItem } from './components/ActionButton';
export { ThemeModeProvider, useThemeMode, useSwitchTheme, type ThemeMode } from './hooks/theme';
export { default as Sidebar, type SidebarItem, type SidebarProps } from './components/Sidebar';
export { cn } from './lib/utils';

// shadcn UI primitives — available to all libs via @item-bank/ui
export { Button, buttonVariants } from './components/ui/button';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from './components/ui/select';
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from './components/ui/dialog';
export { Badge, badgeVariants } from './components/ui/badge';
export { Separator } from './components/ui/separator';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';
export { Textarea } from './components/ui/textarea';
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip';
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/ui/alert-dialog';
export {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from './components/ui/avatar';
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/ui/accordion';
export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './components/ui/popover';
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './components/ui/sheet';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from './components/ui/dropdown-menu';
export { Slider } from './components/ui/slider';
