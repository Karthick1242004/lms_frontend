"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { AttentionEvent, Lesson } from '@/lib/types'
import { sendAttendanceHeartbeat } from '@/lib/api'

// Constants for attendance tracking
const HEARTBEAT_INTERVAL = 10000 // 60 seconds
const INACTIVITY_THRESHOLD = 15000// 15 minutes

interface UseAttendanceProps {
  courseId: string
  moduleId: string
  lesson: Lesson
  videoDuration: number
}

export function useAttendance({ 
  courseId, 
  moduleId, 
  lesson, 
  videoDuration 
}: UseAttendanceProps) {
  const [isActive, setIsActive] = useState(true)
  const [showInactiveWarning, setShowInactiveWarning] = useState(false)
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)
  const [showFastForwardWarning, setShowFastForwardWarning] = useState(false)
  const [attentionEvents, setAttentionEvents] = useState<AttentionEvent[]>([])
  const [watchedDuration, setWatchedDuration] = useState(0)
  
  const lastActivityTime = useRef<number>(Date.now())
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastVideoTime = useRef<number>(0)
  const lastVideoTimestamp = useRef<number>(Date.now())
  const lastHeartbeatTime = useRef<number>(0)
  const pendingEvents = useRef<AttentionEvent[]>([])
  const isInitialized = useRef<boolean>(false)

  // Send attendance data to API
  const sendAttendanceData = useCallback((currentTime: number, latestEvent?: AttentionEvent) => {
    const now = Date.now()
    
    // Limit API calls by enforcing minimum time between calls
    // Skip this check for critical events
    if (
      !latestEvent || 
      latestEvent.eventType === 'heartbeat'
    ) {
      if (now - lastHeartbeatTime.current < HEARTBEAT_INTERVAL && isInitialized.current) {
        return
      }
    }
    
    lastHeartbeatTime.current = now
    isInitialized.current = true
    
    // Send to backend API
    sendAttendanceHeartbeat(
      courseId,
      moduleId,
      lesson.id || lesson.title,
      currentTime,
      videoDuration,
      latestEvent
    ).catch(err => console.error('Failed to send attendance event:', err))
    
    // Clear pending events
    pendingEvents.current = []
  }, [courseId, moduleId, lesson, videoDuration])

  // Record attention event without API call
  const recordEvent = useCallback((eventType: AttentionEvent['eventType'], details?: string) => {
    const newEvent: AttentionEvent = {
      timestamp: new Date(),
      eventType,
      details
    }
    
    setAttentionEvents(prev => [...prev, newEvent])
    pendingEvents.current.push(newEvent)
    
    // For specific events, send immediately and show appropriate warning
    if (eventType === 'fast_forward') {
      setShowFastForwardWarning(true)
      sendAttendanceData(watchedDuration, newEvent)
    } else if (eventType === 'inactivity') {
      setShowInactiveWarning(true)
      sendAttendanceData(watchedDuration, newEvent)
    } else if (eventType === 'tab_switch') {
      setShowTabSwitchWarning(true)
      sendAttendanceData(watchedDuration, newEvent)
    }
  }, [watchedDuration, sendAttendanceData])

  // Handle user activity
  const handleUserActivity = useCallback(() => {
    lastActivityTime.current = Date.now()
    
    if (!isActive) {
      setIsActive(true)
      recordEvent('activity_resumed')
      setShowInactiveWarning(false)
    }
  }, [isActive, recordEvent])

  // Setup heartbeat ping
  const sendHeartbeat = useCallback(() => {
    const now = Date.now()
    
    // Record heartbeat event
    recordEvent('heartbeat')
    
    // Check for inactivity
    const timeSinceLastActivity = now - lastActivityTime.current
    
    if (timeSinceLastActivity >= INACTIVITY_THRESHOLD && !showInactiveWarning) {
      setShowInactiveWarning(true)
      recordEvent('inactivity', `Inactive for ${Math.round(timeSinceLastActivity / 1000 / 60)} minutes`)
    }
    
    // Send the attendance data with current watched duration
    sendAttendanceData(watchedDuration)
  }, [recordEvent, sendAttendanceData, showInactiveWarning, watchedDuration])

  // Handle tab visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setShowTabSwitchWarning(true)
      recordEvent('tab_switch', 'User switched tab or minimized window')
    } else {
      setShowTabSwitchWarning(false)
      handleUserActivity()
    }
  }, [handleUserActivity, recordEvent])

  // Handle video time update to detect fast forwarding
  const handleTimeUpdate = useCallback((currentTime: number) => {
    const now = Date.now()
    const timeSinceLastCheck = now - lastVideoTimestamp.current
    const expectedTimeDiff = timeSinceLastCheck / 1000 // Expected time passed in seconds
    
    // If this is not the first update
    if (lastVideoTime.current > 0) {
      const actualTimeDiff = currentTime - lastVideoTime.current
      
      // If video jumped forward more than expected (with a small buffer)
      // Only check significant jumps (more than 3 seconds) to avoid false positives
      if (actualTimeDiff > expectedTimeDiff + 3 && actualTimeDiff > 5) {
        recordEvent('fast_forward', `Fast forwarded ${Math.round(actualTimeDiff)} seconds`)
      }
    }
    
    lastVideoTime.current = currentTime
    lastVideoTimestamp.current = now
    setWatchedDuration(currentTime)
  }, [recordEvent])

  // Setup event listeners
  useEffect(() => {
    // Activity listeners
    const activityEvents = ['mousedown', 'keydown', 'mousemove', 'wheel', 'touchstart']
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity)
    })
    
    // Visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Setup heartbeat
    heartbeatInterval.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    
    // Create initial heartbeat - with a slight delay to prevent double calls
    setTimeout(() => {
      recordEvent('heartbeat', 'Session started')
      sendAttendanceData(watchedDuration)
    }, 500)
    
    return () => {
      // Cleanup
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity)
      })
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }
      
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current)
      }
      
      // Send final heartbeat
      recordEvent('heartbeat', 'Session ended')
      sendAttendanceData(watchedDuration)
    }
  }, [handleUserActivity, handleVisibilityChange, recordEvent, sendAttendanceData, sendHeartbeat, watchedDuration])

  return {
    isActive,
    showInactiveWarning,
    showTabSwitchWarning,
    showFastForwardWarning,
    attentionEvents,
    watchedDuration,
    handleTimeUpdate,
    setShowInactiveWarning,
    setShowTabSwitchWarning,
    setShowFastForwardWarning,
    resetWarnings: () => {
      setShowInactiveWarning(false)
      setShowTabSwitchWarning(false)
      setShowFastForwardWarning(false)
    }
  }
} 