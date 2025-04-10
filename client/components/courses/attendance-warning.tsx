"use client"

import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog"
import { AlertCircle } from "lucide-react"

interface AttendanceWarningProps {
  type: 'inactive' | 'tab_switch' | 'fast_forward'
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AttendanceWarning({
  type,
  isOpen,
  onClose,
  onConfirm
}: AttendanceWarningProps) {
  // Define the title and message based on warning type
  let title = ''
  let description = ''
  let confirmText = ''
  
  switch (type) {
    case 'inactive':
      title = 'Are you still there?'
      description = 'We noticed you haven\'t been active for a while. Please confirm you\'re still watching the video, or your attendance may not be recorded.'
      confirmText = 'I\'m Still Here'
      break
    case 'tab_switch':
      title = 'Attention Required'
      description = 'You\'ve switched to another tab or window. Please return to this tab to continue watching the video, or your attendance may not be marked.'
      confirmText = 'I\'m Back'
      break
    case 'fast_forward':
      title = 'Video Fast Forward Detected'
      description = 'We detected that you\'ve fast-forwarded the video. Please watch the entire video content to receive proper attendance credit.'
      confirmText = 'Continue Watching'
      break
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Dismiss</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 