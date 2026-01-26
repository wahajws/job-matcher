import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function RightDrawer({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: RightDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        className={className}
        side="right"
        data-testid="right-drawer"
      >
        {(title || description) && (
          <SheetHeader className="pb-4">
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-auto custom-scrollbar">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
