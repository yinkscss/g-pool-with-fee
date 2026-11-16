import * as React from "react";
import { cn } from "../../lib/utils";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, ModalSurface, type ModalRootProps } from "./dialog";

const sides = {
  right: "ui-from-right m-0 ml-auto h-full max-h-none w-[min(24rem,88vw)] max-w-none",
  left: "ui-from-left m-0 mr-auto h-full max-h-none w-[min(24rem,88vw)] max-w-none",
  bottom: "ui-from-bottom m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-2xl",
  top: "ui-from-top m-0 mb-auto max-h-[85vh] w-full max-w-none rounded-b-2xl",
};

/**
 * A panel that slides in from an edge: the menu on a phone (side="left" or "right"), filters, a
 * cart, or an action sheet a thumb can reach (side="bottom"). Same parts and behaviour as Dialog.
 */
export function Sheet(props: ModalRootProps) {
  return <Dialog {...props} />;
}

export function SheetContent({ side = "right", className, children, showClose }: { side?: keyof typeof sides; className?: string; children: React.ReactNode; showClose?: boolean }) {
  return (
    <ModalSurface part="SheetContent" showClose={showClose} className={cn(sides[side], className)}>
      {children}
    </ModalSurface>
  );
}

export const SheetTrigger = DialogTrigger;
export const SheetClose = DialogClose;
export const SheetHeader = DialogHeader;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
export const SheetFooter = DialogFooter;
