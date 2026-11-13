import { useCallback, useEffect, useRef, useState } from 'react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import type { Recording } from '@/features/chat/hooks/use-thread';

/** The API's limit; recording stops itself here. */
export const VOICE_MAX_MS = 2 * 60_000;
/** Shorter than this is a slip of the finger, not a message. */
export const VOICE_MIN_MS = 700;
const LEVELS = 48;
const TICK_MS = 100;

/** Microphone loudness in dB (-160 silent to 0 loudest) as a 0-100 bar. */
const toLevel = (db: number | undefined) => (db === undefined ? 0 : Math.round(Math.min(1, Math.max(0, (db + 55) / 55)) * 100));

/** Squeezes the loudness samples into at most LEVELS bars. */
export function squeeze(samples: number[], bars = LEVELS): number[] {
  if (samples.length <= bars) return samples;
  return Array.from({ length: bars }, (_, i) => {
    const from = Math.floor((i * samples.length) / bars);
    const to = Math.floor(((i + 1) * samples.length) / bars);
    return Math.max(...samples.slice(from, to));
  });
}

/**
 * Records a voice message: start asks for the microphone the first time, stop hands back the file with its
 * length and waveform, cancel throws it away. `denied` when the microphone is off for Ruxstar.
 */
export function useVoiceRecorder(onLimit: (recording: Recording) => void) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, TICK_MS);
  const [recording, setRecording] = useState(false);
  const [denied, setDenied] = useState(false);
  const samples = useRef<number[]>([]);
  const [live, setLive] = useState<number[]>([]);

  useEffect(() => {
    if (!recording || !state.isRecording) return;
    samples.current.push(toLevel(state.metering));
  }, [recording, state.isRecording, state.durationMillis, state.metering]);

  const finish = useCallback(async (): Promise<Recording | null> => {
    if (!recording) return null;
    setRecording(false);
    const durationMs = recorder.getStatus().durationMillis;
    await recorder.stop().catch(() => undefined);
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    const uri = recorder.uri;
    if (!uri || durationMs < VOICE_MIN_MS) return null;
    return { uri, durationMs: Math.min(durationMs, VOICE_MAX_MS), levels: squeeze(samples.current) };
  }, [recorder, recording]);

  const atLimit = useRef(() => {});
  useEffect(() => {
    atLimit.current = () => finish().then((done) => done && onLimit(done));
  });
  useEffect(() => {
    if (!recording) return;
    const timer = setTimeout(() => atLimit.current(), VOICE_MAX_MS);
    return () => clearTimeout(timer);
  }, [recording]);

  // The last few bars, for the live waveform while recording.
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setLive(samples.current.slice(-24)), 150);
    return () => clearInterval(timer);
  }, [recording]);

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    setDenied(!permission.granted);
    if (!permission.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    samples.current = [];
    setLive([]);
    recorder.record();
    setRecording(true);
    return true;
  }, [recorder]);

  const cancel = useCallback(async () => {
    await finish();
  }, [finish]);

  return { recording, denied, durationMs: recording ? state.durationMillis : 0, live, start, stop: finish, cancel };
}
