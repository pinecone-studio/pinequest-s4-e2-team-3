import { useEffect, useRef } from 'react'
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useDeadSwitchStore, OVERLAY_COUNTDOWN_SECS } from '@/stores/deadSwitchStore'
import { useAuthStore, getEmergencyContact } from '@/stores/authStore'

const GREEN = '#1F9D6B'
const RED = '#e53935'
const SAND = '#F3EEE6'
const INK = '#1b2640'
const INK_MUTED = '#8a8275'
const AMBER = '#D9831F'

export function DeadSwitchOverlay() {
  const { showOverlay, countdownSecs, setCountdown, approve, decline } =
    useDeadSwitchStore()
  const user = useAuthStore((s) => s.user)
  const contact = getEmergencyContact(user)

  const progressAnim = useRef(new Animated.Value(1)).current
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!showOverlay) return

    // Reset
    setCountdown(OVERLAY_COUNTDOWN_SECS)
    progressAnim.setValue(1)

    // Animate progress bar over the full countdown
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: OVERLAY_COUNTDOWN_SECS * 1000,
      useNativeDriver: false,
    }).start()

    // Tick down the seconds counter
    intervalRef.current = setInterval(() => {
      const next = useDeadSwitchStore.getState().countdownSecs - 1
      if (next <= 0) {
        clearInterval(intervalRef.current!)
        // Auto-trigger on timeout
        decline(contact?.name ?? 'Emergency contact', contact?.phone ?? '')
      } else {
        setCountdown(next)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      progressAnim.stopAnimation()
    }
  }, [showOverlay])

  const handleApprove = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    progressAnim.stopAnimation()
    approve()
  }

  const handleDecline = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    progressAnim.stopAnimation()
    decline(contact?.name ?? 'Emergency contact', contact?.phone ?? '')
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  const mins = Math.floor(countdownSecs / 60)
  const secs = countdownSecs % 60
  const timerLabel = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <Modal visible={showOverlay} animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        {/* Card */}
        <View style={styles.card}>

          {/* Icon ring */}
          <View style={styles.iconRing}>
            <Text style={styles.iconText}>⚠</Text>
          </View>

          <Text style={styles.label}>Dead Man&apos;s Switch</Text>
          <Text style={styles.heading}>Are you okay?</Text>

          {contact ? (
            <Text style={styles.sub}>
              <Text style={styles.contactName}>{contact.name}</Text>
              {' '}will be alerted if you need help.
            </Text>
          ) : (
            <Text style={styles.sub}>
              No emergency contact set — add one in your profile.
            </Text>
          )}

          {/* Countdown */}
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>{timerLabel}</Text>
            <Text style={styles.timerHint}>until auto-alert</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth,
                  backgroundColor: countdownSecs < 15 ? RED : AMBER,
                },
              ]}
            />
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.btn, styles.btnApprove]}
            onPress={handleApprove}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>I'm Okay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnDecline]}
            onPress={handleDecline}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>I Need Help</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(27,38,64,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: SAND,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: AMBER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
    lineHeight: 36,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: INK_MUTED,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: INK,
    marginBottom: 10,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: INK_MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  contactName: {
    color: INK,
    fontWeight: '600',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  timerLabel: {
    fontSize: 36,
    fontWeight: '700',
    color: INK,
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    fontSize: 12,
    color: INK_MUTED,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0d9d0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnApprove: {
    backgroundColor: GREEN,
  },
  btnDecline: {
    backgroundColor: RED,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})
