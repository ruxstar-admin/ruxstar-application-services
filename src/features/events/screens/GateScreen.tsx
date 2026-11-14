import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { DeskService } from '@/services/events-service';
import type { DeskCounts, DeskEvent, OfflineList, OfflineTicket, ScanResult, SyncResult, SyncScan } from '@/types/events';
import { useAwakeWhileFocused } from '../hooks/use-awake-while-focused';
import { useScanSounds, type ScanTone } from '../hooks/use-scan-sounds';
import { dayLabel, timeText } from '../lib/events';
import { GateStore, OUTCOME, POLL_MS, SYNC_BATCH, byHash, checkLocal, findOffline, insideToday, lookupKind, repeatFilter, sha256, type LocalResult } from '../lib/gate';
import { errorText, isOffline } from '../lib/messages';

/** The same QR held in front of the camera is read many times a second; it counts once in this window. */
const REPEAT_MS = 4000;
/** The result stays up this long, then the gate goes back to "ready". */
const PANEL_MS = 8000;
/** A saved list older than this is downloaded again while online. */
const LIST_MAX_AGE_MS = 15 * 60_000;

type Color = ScanTone;
const COLORS: Record<Color, string> = { green: Brand.success, amber: Brand.warning, red: Brand.error };
const ICONS: Record<Color, keyof typeof Ionicons.glyphMap> = { green: 'checkmark-circle', amber: 'alert-circle', red: 'close-circle' };

interface Panel {
  color: Color;
  title: string;
  message: string;
  who: string | null;
  offline: boolean;
}

/** A ticket found by code or phone, from the server or the saved list. */
interface Found {
  id: string;
  name: string;
  detail: string;
  valid: boolean;
  inToday: string | null;
  offline: OfflineTicket | null;
}

const whoOf = (t: { name: string; tier: string; team?: string | null; code: string } | null) =>
  t ? [t.name, t.team, t.tier, t.code].filter(Boolean).join(' · ') : null;

const fromServer = (res: ScanResult): Panel => ({ color: OUTCOME[res.result].color, title: OUTCOME[res.result].title, message: res.message, who: whoOf(res.ticket), offline: false });
const fromLocal = (res: LocalResult): Panel => ({
  color: OUTCOME[res.result].color,
  title: OUTCOME[res.result].title,
  message: res.message,
  who: res.ticket ? whoOf({ name: res.ticket.n, tier: res.ticket.t, code: res.ticket.c }) : null,
  offline: true,
});

function Gate({ eventId }: { eventId: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const [permission, requestPermission] = useCameraPermissions();
  const [event, setEvent] = useState<DeskEvent | null>(null);
  const [counts, setCounts] = useState<DeskCounts | null>(null);
  const [online, setOnline] = useState(true);
  const [booting, setBooting] = useState(true);
  /** What this phone saved last time is read before going online, so nothing waiting to send is overwritten. */
  const [loaded, setLoaded] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [listInfo, setListInfo] = useState<{ at: string; count: number } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pending, setPending] = useState(0);
  const [clashes, setClashes] = useState<SyncResult['clashes']>([]);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [checking, setChecking] = useState(false);
  const [torch, setTorch] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const eventRef = useRef<DeskEvent | null>(null);
  const listRef = useRef<OfflineList | null>(null);
  const queueRef = useRef<SyncScan[]>([]);
  /** Let in online on this phone today; the saved list doesn't know yet. */
  const seenRef = useRef<SyncScan[]>([]);
  const busyRef = useRef(false);
  const [firstRead] = useState(() => repeatFilter(REPEAT_MS));
  const [localIn, setLocalIn] = useState(0);
  const recount = useCallback(() => setLocalIn(insideToday(listRef.current, [...seenRef.current, ...queueRef.current])), []);
  const syncingRef = useRef(false);
  const refreshingRef = useRef(false);
  const panelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sound = useScanSounds();
  useAwakeWhileFocused('ruxstar-gate');

  const show = useCallback(
    (next: Panel) => {
      if (next.color === 'green') Feedback.success();
      else if (next.color === 'amber') Feedback.warning();
      else Feedback.error();
      sound(next.color);
      setPanel(next);
      if (panelTimer.current) clearTimeout(panelTimer.current);
      panelTimer.current = setTimeout(() => setPanel(null), PANEL_MS);
    },
    [sound],
  );
  useEffect(
    () => () => {
      if (panelTimer.current) clearTimeout(panelTimer.current);
    },
    [],
  );

  const takeEvent = useCallback((next: DeskEvent) => {
    eventRef.current = next;
    setEvent(next);
    setCounts(next.counts);
    void GateStore.saveEvent(next);
  }, []);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const list = await DeskService.offline(token, eventId);
      listRef.current = list;
      setListInfo({ at: list.at, count: list.tickets.length });
      recount();
      await GateStore.saveList(list);
    } catch (err) {
      if (isOffline(err)) setOnline(false);
    } finally {
      setDownloading(false);
    }
  }, [token, eventId, recount]);

  const sync = useCallback(async () => {
    if (syncingRef.current || !queueRef.current.length) return;
    syncingRef.current = true;
    try {
      while (queueRef.current.length) {
        const batch = queueRef.current.slice(0, SYNC_BATCH);
        const res = await DeskService.sync(token, eventId, batch);
        seenRef.current = [...seenRef.current, ...batch];
        queueRef.current = queueRef.current.slice(batch.length);
        await GateStore.saveQueue(eventId, queueRef.current);
        setPending(queueRef.current.length);
        setCounts(res.counts);
        if (res.clashes.length) setClashes((all) => [...all, ...res.clashes]);
      }
    } catch (err) {
      if (isOffline(err)) setOnline(false);
    } finally {
      syncingRef.current = false;
    }
  }, [token, eventId]);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const next = await DeskService.get(token, eventId);
      takeEvent(next);
      setOnline(true);
      setFatal(null);
      await sync();
      const list = listRef.current;
      if (next.today && (!list || Date.now() - Date.parse(list.at) > LIST_MAX_AGE_MS)) await download();
    } catch (err) {
      if (isOffline(err)) setOnline(false);
      else if (!eventRef.current) setFatal(errorText(err));
    } finally {
      refreshingRef.current = false;
      setBooting(false);
    }
  }, [token, eventId, sync, download, takeEvent]);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [saved, list, queue] = await Promise.all([GateStore.event(eventId), GateStore.list(eventId), GateStore.queue(eventId)]);
      if (!live) return;
      if (saved && !eventRef.current) {
        eventRef.current = saved;
        setEvent(saved);
        setCounts(saved.counts);
      }
      listRef.current = list;
      if (list) setListInfo({ at: list.at, count: list.tickets.length });
      queueRef.current = queue;
      setPending(queue.length);
      recount();
      setLoaded(true);
    })();
    return () => {
      live = false;
    };
  }, [eventId, recount]);

  useFocusEffect(
    useCallback(() => {
      if (!loaded) return;
      void refresh();
      const timer = setInterval(() => void refresh(), POLL_MS);
      return () => clearInterval(timer);
    }, [refresh, loaded]),
  );

  const enqueue = async (scan: SyncScan) => {
    queueRef.current = [...queueRef.current, scan];
    setPending(queueRef.current.length);
    recount();
    await GateStore.saveQueue(eventId, queueRef.current);
  };

  const see = (ticketId: string, manual: boolean) => {
    seenRef.current = [...seenRef.current, { ticketId, at: new Date().toISOString(), manual, fresh: true }];
    recount();
  };

  /** Checks a ticket against the saved list and, when it's a first entry today, keeps it to send later. */
  const checkSaved = async (ticket: OfflineTicket | undefined, manual: boolean) => {
    const list = listRef.current;
    const current = eventRef.current;
    if (!list || !current) {
      show({
        color: 'red',
        title: 'Can’t check offline',
        message: 'There’s no ticket list on this phone yet. Connect once to download it, then scanning works without a connection.',
        who: null,
        offline: true,
      });
      return;
    }
    const res = checkLocal(list, ticket, { days: current.days, queue: [...seenRef.current, ...queueRef.current] });
    if (res.result === 'ok' && res.ticket) await enqueue({ ticketId: res.ticket.id, at: new Date().toISOString(), manual, fresh: true });
    show(fromLocal(res));
  };

  const check = async (qr: string) => {
    setChecking(true);
    try {
      const res = await DeskService.scan(token, eventId, qr);
      setOnline(true);
      setCounts(res.counts);
      if (res.result === 'ok' && res.ticket) see(res.ticket.id, false);
      show(fromServer(res));
    } catch (err) {
      if (!isOffline(err)) {
        show({ color: 'red', title: 'Couldn’t check', message: errorText(err), who: null, offline: false });
        return;
      }
      setOnline(false);
      const list = listRef.current;
      await checkSaved(list ? byHash(list, await sha256(qr)) : undefined, false);
    } finally {
      setChecking(false);
    }
  };

  const onScan = ({ data }: BarcodeScanningResult) => {
    if (busyRef.current || lookupOpen || !firstRead(data)) return;
    busyRef.current = true;
    void check(data).finally(() => {
      busyRef.current = false;
    });
  };

  const search = async () => {
    const kind = lookupKind(query);
    setLookupError(null);
    if (!kind) {
      setLookupError('Type the six letters on the ticket, or a 10-digit mobile number.');
      return;
    }
    setSearching(true);
    try {
      const page = await DeskService.lookup(token, eventId, 'code' in kind ? kind.code : kind.phone);
      setOnline(true);
      setFound(
        page.items.map((t) => ({
          id: t.id,
          name: t.name,
          detail: [t.team, t.tier, t.code, t.phone].filter(Boolean).join(' · '),
          valid: t.status === 'valid',
          inToday: t.inToday,
          offline: null,
        })),
      );
    } catch (err) {
      if (!isOffline(err)) {
        setLookupError(errorText(err));
        return;
      }
      setOnline(false);
      const list = listRef.current;
      if (!list) {
        setLookupError('You’re offline and there’s no ticket list on this phone yet.');
        return;
      }
      const tickets = await findOffline(list, query);
      const queued = [...seenRef.current, ...queueRef.current];
      setFound(
        tickets.map((t) => ({
          id: t.id,
          name: t.n,
          detail: [t.t, t.c].join(' · '),
          valid: t.s === 'v',
          inToday: t.i ?? queued.find((s) => s.ticketId === t.id)?.at ?? null,
          offline: t,
        })),
      );
    } finally {
      setSearching(false);
    }
  };

  const checkIn = async (ticket: Found) => {
    setCheckingIn(ticket.id);
    try {
      if (ticket.offline) {
        await checkSaved(ticket.offline, true);
      } else {
        try {
          const res = await DeskService.checkIn(token, eventId, ticket.id);
          setCounts(res.counts);
          if (res.result === 'ok') see(ticket.id, true);
          show(fromServer(res));
        } catch (err) {
          if (!isOffline(err)) throw err;
          setOnline(false);
          const list = listRef.current;
          await checkSaved(list?.tickets.find((t) => t.id === ticket.id), true);
        }
      }
      closeLookup();
    } catch (err) {
      setLookupError(errorText(err));
    } finally {
      setCheckingIn(null);
    }
  };

  const closeLookup = () => {
    setLookupOpen(false);
    setQuery('');
    setFound(null);
    setLookupError(null);
  };

  if (fatal && !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ScreenHeader title="Scan tickets" onBack={() => router.back()} />
        </View>
        <EmptyState icon="lock-closed-outline" title="Can’t open this gate" message={fatal} actionLabel="Try again" onAction={() => void refresh()} />
      </SafeAreaView>
    );
  }
  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        {booting ? (
          <ActivityIndicator color={Brand.primarySoft} />
        ) : (
          <EmptyState icon="cloud-offline-outline" title="You’re offline" message="Open this gate once with a connection so the phone can save the ticket list." actionLabel="Try again" onAction={() => void refresh()} />
        )}
      </SafeAreaView>
    );
  }

  const inNow = online ? (counts?.inToday ?? 0) : Math.max(counts?.inToday ?? 0, localIn);
  const color = panel ? COLORS[panel.color] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title={event.title} onBack={() => router.back()} />
      </View>

      <View style={styles.camera}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={lookupOpen ? undefined : onScan}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noCamera]}>
            <Ionicons name="camera-outline" size={36} color={Brand.textMuted} />
            <Text style={styles.noCameraText}>
              {permission?.canAskAgain === false ? 'Camera is off for Ruxstar. Turn it on in Settings, or type codes below.' : 'Allow the camera to scan tickets.'}
            </Text>
            {permission?.canAskAgain !== false ? <PrimaryButton label="Allow camera" onPress={() => void requestPermission()} /> : null}
          </View>
        )}
        {permission?.granted && !panel ? <View style={styles.frame} pointerEvents="none" /> : null}
        {permission?.granted ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Turn the torch off' : 'Turn the torch on'}
            onPress={() => {
              Feedback.tap();
              setTorch(!torch);
            }}
            style={styles.torch}
          >
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color={Brand.text} />
          </Pressable>
        ) : null}
        {checking ? (
          <View style={styles.checking}>
            <ActivityIndicator color={Brand.text} />
          </View>
        ) : null}
        {panel && color ? (
          <View style={[styles.panel, { backgroundColor: color }]} accessibilityLiveRegion="assertive" accessibilityRole="alert">
            <View style={styles.panelHead}>
              <Ionicons name={ICONS[panel.color]} size={34} color="#0D0C12" />
              <Text style={styles.panelTitle}>{panel.title}</Text>
            </View>
            {panel.who ? <Text style={styles.panelWho}>{panel.who}</Text> : null}
            <Text style={styles.panelText}>{panel.message}</Text>
            {panel.offline ? <Text style={styles.panelNote}>Checked on this phone while offline</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <View style={styles.countRow}>
          <View>
            <Text style={styles.count}>{`${inNow} in`}</Text>
            <Text style={styles.small}>{`of ${counts?.tickets ?? 0} tickets${event.today ? ' today' : ''}`}</Text>
          </View>
          <View style={styles.status}>
            <View style={[styles.dot, { backgroundColor: online ? Brand.success : Brand.warning }]} />
            <Text style={styles.small}>{online ? (pending ? `Online · sending ${pending}` : 'Online') : `Offline${pending ? ` · ${pending} to send` : ''}`}</Text>
          </View>
        </View>

        {!event.today ? (
          <Text style={styles.warn}>{`Check-ins open on ${event.days.map(dayLabel).join(', ')}. Scans today show red.`}</Text>
        ) : (
          <Text style={styles.small}>
            {downloading
              ? 'Saving the ticket list for offline…'
              : listInfo
                ? `Works offline · ${listInfo.count} tickets saved at ${timeText(listInfo.at)}`
                : online
                  ? 'Saving the ticket list for offline…'
                  : 'No ticket list on this phone yet'}
          </Text>
        )}

        {clashes.length ? (
          <View style={styles.clashes}>
            <Text style={styles.warnStrong}>{`${clashes.length} ${clashes.length === 1 ? 'ticket was' : 'tickets were'} used on two phones`}</Text>
            {clashes.slice(-3).map((c) => (
              <Text key={`${c.ticketId}${c.firstAt}`} style={styles.small}>{`${c.name} · ${c.code} · first in ${timeText(c.firstAt)}`}</Text>
            ))}
            <Text style={styles.link} onPress={() => setClashes([])}>
              Got it
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton label="Type code or phone" variant="outline" onPress={() => setLookupOpen(true)} />
          </View>
          {event.canSeeGuests ? (
            <View style={styles.action}>
              <PrimaryButton label="Guest list" variant="outline" onPress={() => router.push({ pathname: '/(customer)/gate/guests/[id]', params: { id: eventId } })} />
            </View>
          ) : null}
        </View>
      </View>

      <BottomSheet visible={lookupOpen} onClose={closeLookup} title="Find a ticket">
        <InputField
          value={query}
          onChangeText={setQuery}
          placeholder="ABC123 or 98xxxxxxxx"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={search}
          error={lookupError ?? undefined}
          hint="The six letters under the QR code, or the ticket holder’s mobile."
        />
        <PrimaryButton label="Find" loading={searching} onPress={search} />
        {found && !found.length ? <Text style={styles.small}>No ticket for this event matches.</Text> : null}
        {found?.map((t) => (
          <View key={t.id} style={styles.found}>
            <View style={styles.foundText}>
              <Text style={styles.foundName}>{t.name}</Text>
              <Text style={styles.small}>{t.detail}</Text>
              {!t.valid ? <Text style={styles.bad}>Cancelled</Text> : t.inToday ? <Text style={styles.amber}>{`Inside since ${timeText(t.inToday)}`}</Text> : null}
            </View>
            {t.valid && !t.inToday ? (
              <View style={styles.letIn}>
                <PrimaryButton label="Let in" loading={checkingIn === t.id} onPress={() => void checkIn(t)} />
              </View>
            ) : null}
          </View>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

/** The gate: point the camera at a ticket for green, amber or red. It keeps working offline and sends check-ins when back. */
export function GateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Gate key={id} eventId={id} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  camera: { flex: 1, marginHorizontal: Spacing.three, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: '#000' },
  noCamera: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four, backgroundColor: Brand.surface },
  noCameraText: { ...Typography.body, color: Brand.textMuted, textAlign: 'center' },
  frame: { position: 'absolute', alignSelf: 'center', top: '18%', width: '62%', aspectRatio: 1, borderRadius: Radius.xl, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  torch: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,12,18,0.6)',
  },
  checking: { position: 'absolute', top: Spacing.two, left: Spacing.two, padding: Spacing.two, borderRadius: Radius.pill, backgroundColor: 'rgba(13,12,18,0.6)' },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.four, gap: Spacing.one },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  panelTitle: { ...Typography.title, fontSize: 26, color: '#0D0C12', flex: 1 },
  panelWho: { ...Typography.bodyStrong, fontSize: 17, color: '#0D0C12' },
  panelText: { ...Typography.body, fontSize: 16, color: '#0D0C12' },
  panelNote: { ...Typography.caption, color: 'rgba(13,12,18,0.75)' },
  bottom: { padding: Spacing.three, gap: Spacing.two },
  countRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  count: { ...Typography.title, fontSize: 30, color: Brand.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  small: { ...Typography.caption, color: Brand.textMuted },
  warn: { ...Typography.caption, color: Brand.warning },
  warnStrong: { ...Typography.bodyStrong, fontSize: 14, color: Brand.warning },
  link: { ...Typography.caption, color: Brand.primarySoft, paddingTop: 2 },
  clashes: { gap: 2, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  found: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  foundText: { flex: 1, gap: 2 },
  letIn: { width: 120 },
  foundName: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  bad: { ...Typography.caption, color: Brand.error },
  amber: { ...Typography.caption, color: Brand.warning },
});
