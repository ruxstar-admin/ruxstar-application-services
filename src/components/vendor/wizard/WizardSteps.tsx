/**
 * Add-Business Wizard — step UI components
 * CategoryStep · TypeStep · BookingStep · DetailsStep · Field
 */

import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import type {
  CatalogBusinessCategory,
  CatalogBusinessType,
  BookingMode,
} from '@/services/vendor-business-service';

// ─── India location data ──────────────────────────────────────────────────────

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const CITIES_BY_STATE: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Rajahmundry','Tirupati','Kakinada','Kadapa','Anantapur','Vizianagaram','Eluru','Ongole','Gudivada','Narasaraopet','Machilipatnam','Tenali','Chittoor','Hindupur','Bhimavaram','Proddatur','Madanapalle','Srikakulam','Tadepalligudem','Chilakaluripet'],
  'Arunachal Pradesh': ['Itanagar','Naharlagun','Pasighat','Tawang','Ziro','Bomdila','Tezu','Roing','Aalo','Changlang'],
  'Assam': ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Tezpur','Bongaigaon','Karimganj','Dhubri','North Lakhimpur','Sivasagar','Goalpara','Barpeta'],
  'Bihar': ['Patna','Gaya','Bhagalpur','Muzaffarpur','Darbhanga','Purnia','Arrah','Begusarai','Katihar','Munger','Chhapra','Saharsa','Hajipur','Siwan','Motihari'],
  'Chhattisgarh': ['Raipur','Bhilai','Bilaspur','Korba','Durg','Rajnandgaon','Jagdalpur','Raigarh','Ambikapur','Dhamtari','Chirmiri','Mahasamund'],
  'Goa': ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda','Bicholim','Curchorem','Sanquelim'],
  'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Junagadh','Gandhinagar','Anand','Nadiad','Morbi','Mehsana','Bharuch','Vapi','Navsari','Porbandar','Gandhidham','Veraval'],
  'Haryana': ['Faridabad','Gurgaon','Panipat','Ambala','Yamunanagar','Rohtak','Hisar','Karnal','Sonipat','Panchkula','Bhiwani','Sirsa','Jind','Kaithal','Rewari'],
  'Himachal Pradesh': ['Shimla','Dharamshala','Solan','Mandi','Palampur','Baddi','Nahan','Kullu','Chamba','Una','Hamirpur','Manali'],
  'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Deoghar','Phusro','Hazaribagh','Giridih','Ramgarh','Medininagar','Chirkunda','Dumka'],
  'Karnataka': ['Bengaluru','Mysuru','Hubballi','Mangaluru','Belagavi','Davanagere','Ballari','Tumakuru','Shivamogga','Raichur','Bidar','Hospet','Hassan','Gulbarga','Udupi','Chitradurga','Mandya'],
  'Kerala': ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Alappuzha','Palakkad','Malappuram','Kannur','Kasaragod','Kottayam','Pathanamthitta','Idukki','Wayanad'],
  'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Dewas','Satna','Ratlam','Rewa','Murwara','Singrauli','Burhanpur','Khandwa','Chhindwara','Morena'],
  'Maharashtra': ['Mumbai','Pune','Nagpur','Thane','Nashik','Aurangabad','Solapur','Kolhapur','Amravati','Nanded','Sangli','Jalgaon','Akola','Latur','Dhule','Ahmednagar','Chandrapur','Panvel','Ratnagiri','Satara'],
  'Manipur': ['Imphal','Thoubal','Bishnupur','Churachandpur','Kakching','Ukhrul','Senapati'],
  'Meghalaya': ['Shillong','Tura','Nongstoin','Jowai','Baghmara','Williamnagar','Nongpoh'],
  'Mizoram': ['Aizawl','Lunglei','Champhai','Serchhip','Kolasib','Saiha'],
  'Nagaland': ['Kohima','Dimapur','Mokokchung','Tuensang','Wokha','Zunheboto','Mon'],
  'Odisha': ['Bhubaneswar','Cuttack','Rourkela','Berhampur','Sambalpur','Puri','Balasore','Bhadrak','Baripada','Jharsuguda','Jeypore','Angul','Dhenkanal'],
  'Punjab': ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Pathankot','Hoshiarpur','Batala','Moga','Abohar','Malerkotla','Khanna','Phagwara'],
  'Rajasthan': ['Jaipur','Jodhpur','Kota','Bikaner','Ajmer','Udaipur','Bhilwara','Alwar','Bharatpur','Sikar','Pali','Sri Ganganagar','Tonk','Kishangarh','Beawar','Hanumangarh'],
  'Sikkim': ['Gangtok','Namchi','Gyalshing','Mangan','Rangpo','Jorethang'],
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Tiruppur','Erode','Vellore','Thoothukudi','Dindigul','Thanjavur','Ranipet','Nagercoil','Kanchipuram','Karur','Hosur','Cuddalore'],
  'Telangana': ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Ramagundam','Mahbubnagar','Nalgonda','Adilabad','Suryapet','Siddipet','Miryalaguda','Jagtial','Sangareddy'],
  'Tripura': ['Agartala','Udaipur','Dharmanagar','Kailashahar','Belonia','Ambassa'],
  'Uttar Pradesh': ['Lucknow','Kanpur','Ghaziabad','Agra','Varanasi','Meerut','Prayagraj','Bareilly','Aligarh','Moradabad','Saharanpur','Gorakhpur','Noida','Firozabad','Jhansi','Muzaffarnagar','Mathura','Ayodhya','Rampur','Shahjahanpur'],
  'Uttarakhand': ['Dehradun','Haridwar','Roorkee','Haldwani','Rudrapur','Kashipur','Rishikesh','Nainital','Almora','Pithoragarh','Mussoorie'],
  'West Bengal': ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman','Malda','Baharampur','Habra','Kharagpur','Shantipur','Darjeeling','Jalpaiguri','Krishnanagar','Raiganj'],
  'Andaman and Nicobar Islands': ['Port Blair','Diglipur','Rangat','Mayabunder','Car Nicobar'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman','Diu','Silvassa'],
  'Delhi': ['New Delhi','Delhi','North Delhi','South Delhi','East Delhi','West Delhi','Central Delhi','Dwarka','Rohini','Saket'],
  'Jammu and Kashmir': ['Srinagar','Jammu','Anantnag','Baramulla','Udhampur','Kathua','Sopore','Pulwama','Rajouri'],
  'Ladakh': ['Leh','Kargil','Nubra','Diskit'],
  'Lakshadweep': ['Kavaratti','Agatti','Minicoy','Amini'],
  'Puducherry': ['Puducherry','Karaikal','Mahe','Yanam','Oulgaret'],
};

/** Compose area + city + state into a single address string (matches web). */
export function composeAddress(state: string, city: string, area: string): string {
  return [area.trim(), city.trim(), state.trim()].filter(Boolean).join(', ');
}

// ─── Category → Ionicon mapping ───────────────────────────────────────────────

const CATEGORY_ICON_MAP: Array<[string, keyof typeof Ionicons.glyphMap]> = [
  ['sport',       'football-outline'],
  ['turf',        'golf-outline'],
  ['fitness',     'barbell-outline'],
  ['gym',         'barbell-outline'],
  ['yoga',        'body-outline'],
  ['salon',       'cut-outline'],
  ['beauty',      'cut-outline'],
  ['spa',         'leaf-outline'],
  ['wellness',    'leaf-outline'],
  ['clinic',      'medkit-outline'],
  ['health',      'medkit-outline'],
  ['medical',     'medkit-outline'],
  ['hospital',    'medkit-outline'],
  ['food',        'restaurant-outline'],
  ['restaurant',  'restaurant-outline'],
  ['cafe',        'cafe-outline'],
  ['bakery',      'cafe-outline'],
  ['event',       'calendar-outline'],
  ['venue',       'business-outline'],
  ['wedding',     'rose-outline'],
  ['party',       'balloon-outline'],
  ['education',   'school-outline'],
  ['tuition',     'school-outline'],
  ['coaching',    'school-outline'],
  ['retail',      'bag-outline'],
  ['shop',        'bag-outline'],
  ['store',       'storefront-outline'],
  ['service',     'construct-outline'],
  ['repair',      'construct-outline'],
  ['studio',      'camera-outline'],
  ['creator',     'camera-outline'],
  ['photo',       'camera-outline'],
  ['entertain',   'film-outline'],
  ['pet',         'paw-outline'],
  ['laundry',     'shirt-outline'],
  ['cleaning',    'sparkles-outline'],
];

function categoryIcon(cat: CatalogBusinessCategory): keyof typeof Ionicons.glyphMap {
  const label = cat.label.toLowerCase();
  for (const [keyword, icon] of CATEGORY_ICON_MAP) {
    if (label.includes(keyword)) return icon;
  }
  return 'storefront-outline';
}

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  stepContent:    { padding: Spacing.three, paddingBottom: Spacing.six },
  detailsContent: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },

  grid2Col: { gap: Spacing.two, marginBottom: Spacing.two },
  catCard: {
    flex: 1,
    backgroundColor: brand.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  catIconWrap: {
    width: 44, height: 44,
    borderRadius: Radius.md,
    backgroundColor: brand.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  catLabel: { fontSize: 13, fontWeight: '700', color: brand.cream },
  catDesc:  { fontSize: 11, color: brand.creamSub, lineHeight: 15 },

  typeCard: {
    backgroundColor: brand.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  typeCardActive:  { borderColor: brand.primary, backgroundColor: brand.primaryGlow },
  typeRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  typeInfo:        { flex: 1 },
  typeLabel:       { fontSize: 14, fontWeight: '600', color: brand.cream },
  typeLabelActive: { color: brand.primary },
  typeDesc:        { fontSize: 12, color: brand.creamSub, marginTop: 2 },

  bookingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: brand.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  bookingCardActive:  { borderColor: brand.primary, backgroundColor: brand.primaryGlow },
  bookingIcon: {
    width: 40, height: 40,
    borderRadius: Radius.md,
    backgroundColor: brand.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  bookingIconActive:  { backgroundColor: 'rgba(124,58,237,0.15)' },
  bookingInfo:        { flex: 1 },
  bookingTitle:       { fontSize: 14, fontWeight: '700', color: brand.cream },
  bookingTitleActive: { color: brand.primary },
  bookingDesc:        { fontSize: 12, color: brand.creamSub, marginTop: 3, lineHeight: 17 },
  bookingCheck:       { marginTop: 10 },

  field:         { gap: 7 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldLabel:    { fontSize: 13, fontWeight: '600', color: brand.cream },
  required:      { fontSize: 13, color: brand.primary, fontWeight: '700' },
  fieldHint:     { fontSize: 11, color: brand.creamMuted, marginLeft: 'auto' },

  input: {
    backgroundColor: brand.surface1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: brand.border1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    color: brand.cream,
    fontSize: 15,
  },
  textarea: { minHeight: 100, paddingTop: 13 },

  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brand.surface1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: brand.border1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
  },
  dropdownBtnText:     { flex: 1, fontSize: 15, color: brand.cream },
  dropdownPlaceholder: { color: brand.creamMuted },

  pickerList: {
    maxHeight: 180,
    marginTop: 4,
    backgroundColor: brand.surface1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: brand.border1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
  },
  pickerItemActive:     { backgroundColor: brand.primaryGlow },
  pickerItemText:       { fontSize: 14, color: brand.cream, flex: 1 },
  pickerItemTextActive: { color: brand.primary, fontWeight: '600' },
  pickerEmpty:     { padding: Spacing.three },
  pickerEmptyText: { fontSize: 13, color: brand.creamMuted },

  addressPreview: { fontSize: 11, color: brand.creamSub, marginTop: 4, fontStyle: 'italic' },

  coverPickerWrap: {
    height: 160,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: brand.border1,
    backgroundColor: brand.surface1,
    overflow: 'hidden',
  },
  coverPreview: { width: '100%', height: '100%' },
  coverPickerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  coverPickerHint: { fontSize: 13, color: brand.creamMuted },
  coverPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.two,
  },
  coverPickerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2, paddingVertical: 5,
  },
  coverPickerPillText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  skeletonBox: { borderRadius: Radius.lg, marginBottom: Spacing.two },

  emptyStep: { padding: Spacing.four, alignItems: 'center' },
  emptyText: { color: brand.creamSub, fontSize: 14 },

  pressed: { opacity: 0.75 },
});

// ─── Shared ────────────────────────────────────────────────────────────────────

export function SkeletonBox({ h = 88 }: { h?: number }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return <View style={[s.skeletonBox, { height: h, backgroundColor: brand.surface2 }]} />;
}

export function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={s.field}>
      <View style={s.fieldLabelRow}>
        <Text style={s.fieldLabel}>{label}</Text>
        {required && <Text style={s.required}>*</Text>}
        {hint && <Text style={s.fieldHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

// ─── Step 1 – Category Grid ───────────────────────────────────────────────────

export function CategoryStep({
  categories,
  onSelect,
}: {
  categories: CatalogBusinessCategory[];
  onSelect:   (cat: CatalogBusinessCategory) => void;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  return (
    <FlatList
      data={categories}
      keyExtractor={(c) => c.id}
      numColumns={2}
      columnWrapperStyle={s.grid2Col}
      contentContainerStyle={s.stepContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: cat }) => (
        <Pressable
          style={({ pressed }) => [s.catCard, pressed && s.pressed]}
          onPress={() => onSelect(cat)}
        >
          <View style={s.catIconWrap}>
            <Ionicons name={categoryIcon(cat)} size={22} color={brand.primary} />
          </View>
          <Text style={s.catLabel} numberOfLines={2}>{cat.label}</Text>
          {cat.description ? (
            <Text style={s.catDesc} numberOfLines={2}>{cat.description}</Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}

// ─── Step 2 – Type Grid ───────────────────────────────────────────────────────

export function TypeStep({
  category,
  selectedId,
  onSelect,
}: {
  category:   CatalogBusinessCategory;
  selectedId: string | null;
  onSelect:   (t: CatalogBusinessType) => void;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  if (category.types.length === 0) {
    return (
      <View style={s.emptyStep}>
        <Text style={s.emptyText}>No types available for this category yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={category.types}
      keyExtractor={(t) => t.id}
      contentContainerStyle={s.stepContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: t }) => {
        const active = selectedId === t.id;
        return (
          <Pressable
            style={({ pressed }) => [
              s.typeCard,
              active && s.typeCardActive,
              pressed && !active && s.pressed,
            ]}
            onPress={() => onSelect(t)}
          >
            <View style={s.typeRow}>
              <View style={s.typeInfo}>
                <Text style={[s.typeLabel, active && s.typeLabelActive]}>{t.label}</Text>
                {t.description ? (
                  <Text style={s.typeDesc} numberOfLines={1}>{t.description}</Text>
                ) : null}
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={brand.primary} />}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

// ─── Step 3 – Booking Mode ────────────────────────────────────────────────────

function BookingCard({
  mode, title, desc, icon, selected, onPress,
}: {
  mode:     BookingMode;
  title:    string;
  desc:     string;
  icon:     keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress:  () => void;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  return (
    <Pressable
      style={({ pressed }) => [
        s.bookingCard,
        selected && s.bookingCardActive,
        pressed && !selected && s.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[s.bookingIcon, selected && s.bookingIconActive]}>
        <Ionicons name={icon} size={22} color={selected ? brand.primary : brand.creamSub} />
      </View>
      <View style={s.bookingInfo}>
        <Text style={[s.bookingTitle, selected && s.bookingTitleActive]}>{title}</Text>
        <Text style={s.bookingDesc}>{desc}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={20} color={brand.primary} style={s.bookingCheck} />
      )}
    </Pressable>
  );
}

export function BookingStep({
  selected,
  onSelect,
}: {
  selected: BookingMode | null;
  onSelect: (m: BookingMode) => void;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  return (
    <View style={s.stepContent}>
      <BookingCard
        mode="slots"
        title="Hourly slots"
        desc="Customers book by the hour — turfs, courts, studios, short rentals."
        icon="time-outline"
        selected={selected === 'slots'}
        onPress={() => onSelect('slots')}
      />
      <BookingCard
        mode="fullDay"
        title="Full day"
        desc="One booking per day — parties, weddings, events, full-day venue hire."
        icon="calendar-outline"
        selected={selected === 'fullDay'}
        onPress={() => onSelect('fullDay')}
      />
    </View>
  );
}

// ─── Step 4 – Details ─────────────────────────────────────────────────────────

export type DetailsForm = {
  name:        string;
  phone:       string;
  state:       string;
  city:        string;
  area:        string;
  description: string;
  thumbnail?:  string;
};

async function pickCoverPhoto(onChange: (patch: Partial<DetailsForm>) => void) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission required', 'Allow photo access to upload a cover image.');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return;
  const asset = result.assets[0];
  const mime  = asset.mimeType ?? 'image/jpeg';
  onChange({ thumbnail: `data:${mime};base64,${asset.base64}` });
}

export function DetailsStep({
  form, onChange, typeLabel, namePlaceholder,
}: {
  form:            DetailsForm;
  onChange:        (patch: Partial<DetailsForm>) => void;
  typeLabel:       string;
  namePlaceholder: string;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker,  setShowCityPicker]  = useState(false);

  const cities       = form.state ? (CITIES_BY_STATE[form.state] ?? []) : [];
  const isCityCustom = form.city !== '' && !cities.includes(form.city);
  const addressPreview = composeAddress(form.state, form.city, form.area);

  function selectState(st: string) {
    onChange({ state: st, city: '', area: '' });
    setShowStatePicker(false);
    setShowCityPicker(true);
  }

  function selectCity(city: string) {
    onChange({ city });
    if (cities.includes(city)) setShowCityPicker(false);
  }

  return (
    <ScrollView
      contentContainerStyle={s.detailsContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Cover photo picker */}
      <Field label="Cover photo" hint="Recommended">
        <Pressable style={s.coverPickerWrap} onPress={() => pickCoverPhoto(onChange)}>
          {form.thumbnail ? (
            <Image
              source={{ uri: form.thumbnail }}
              style={s.coverPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={s.coverPickerEmpty}>
              <Ionicons name="image-outline" size={28} color={brand.creamMuted} />
              <Text style={s.coverPickerHint}>Tap to choose a cover photo</Text>
            </View>
          )}
          <View style={s.coverPickerOverlay}>
            <View style={s.coverPickerPill}>
              <Ionicons name="camera-outline" size={12} color="#fff" />
              <Text style={s.coverPickerPillText}>
                {form.thumbnail ? 'Change photo' : 'Add photo'}
              </Text>
            </View>
          </View>
        </Pressable>
      </Field>

      <Field label={`${typeLabel} name`} required>
        <TextInput
          style={s.input}
          placeholder={namePlaceholder || `Enter ${typeLabel} name`}
          placeholderTextColor={brand.creamMuted}
          value={form.name}
          onChangeText={(v) => onChange({ name: v })}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </Field>

      <Field label="Phone number" required hint="10-digit mobile">
        <TextInput
          style={s.input}
          placeholder="9876543210"
          placeholderTextColor={brand.creamMuted}
          value={form.phone}
          onChangeText={(v) => onChange({ phone: v.replace(/\D/g, '').slice(0, 10) })}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="next"
        />
      </Field>

      {/* Location — State → City → Area */}
      <Field label="Location" required>
        <Pressable
          style={s.dropdownBtn}
          onPress={() => { setShowStatePicker((p) => !p); setShowCityPicker(false); }}
        >
          <Ionicons name="map-outline" size={14} color={brand.creamMuted} />
          <Text style={[s.dropdownBtnText, !form.state && s.dropdownPlaceholder]} numberOfLines={1}>
            {form.state || 'Select state'}
          </Text>
          <Ionicons
            name={showStatePicker ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={brand.creamMuted}
          />
        </Pressable>

        {showStatePicker && (
          <ScrollView
            style={s.pickerList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {INDIAN_STATES.map((st) => {
              const active = form.state === st;
              return (
                <Pressable
                  key={st}
                  style={[s.pickerItem, active && s.pickerItemActive]}
                  onPress={() => selectState(st)}
                >
                  <Text style={[s.pickerItemText, active && s.pickerItemTextActive]} numberOfLines={1}>{st}</Text>
                  {active && <Ionicons name="checkmark" size={14} color={brand.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {form.state ? (
          <>
            <Pressable
              style={[s.dropdownBtn, { marginTop: 8 }]}
              onPress={() => { setShowCityPicker((p) => !p); setShowStatePicker(false); }}
            >
              <Ionicons name="location-outline" size={14} color={brand.creamMuted} />
              <Text style={[s.dropdownBtnText, !form.city && s.dropdownPlaceholder]} numberOfLines={1}>
                {form.city || 'Select city / town'}
              </Text>
              <Ionicons
                name={showCityPicker ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={brand.creamMuted}
              />
            </Pressable>

            {showCityPicker && (
              <ScrollView
                style={s.pickerList}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {cities.length > 0 ? cities.map((city) => {
                  const active = form.city === city;
                  return (
                    <Pressable
                      key={city}
                      style={[s.pickerItem, active && s.pickerItemActive]}
                      onPress={() => selectCity(city)}
                    >
                      <Text style={[s.pickerItemText, active && s.pickerItemTextActive]} numberOfLines={1}>{city}</Text>
                      {active && <Ionicons name="checkmark" size={14} color={brand.primary} />}
                    </Pressable>
                  );
                }) : (
                  <View style={s.pickerEmpty}>
                    <Text style={s.pickerEmptyText}>No city list — type below</Text>
                  </View>
                )}
                {cities.length > 0 && (
                  <Pressable
                    style={[s.pickerItem, isCityCustom && s.pickerItemActive]}
                    onPress={() => { onChange({ city: '' }); setShowCityPicker(false); }}
                  >
                    <Text style={[s.pickerItemText, isCityCustom && s.pickerItemTextActive]}>Other — type manually</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}

            {(isCityCustom || cities.length === 0) && (
              <TextInput
                style={[s.input, { marginTop: 8 }]}
                placeholder="Enter city / town"
                placeholderTextColor={brand.creamMuted}
                value={form.city}
                onChangeText={(v) => onChange({ city: v })}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}

            <TextInput
              style={[s.input, { marginTop: 8 }]}
              placeholder="Area / landmark (optional) — e.g. Banjara Hills"
              placeholderTextColor={brand.creamMuted}
              value={form.area}
              onChangeText={(v) => onChange({ area: v })}
              autoCapitalize="words"
              returnKeyType="next"
            />

            {addressPreview ? (
              <Text style={s.addressPreview} numberOfLines={2}>{addressPreview}</Text>
            ) : null}
          </>
        ) : null}
      </Field>

      <Field label="Description" required hint={`${form.description.trim().length}/500`}>
        <TextInput
          style={[s.input, s.textarea]}
          placeholder="What you offer — keep it short and clear for customers"
          placeholderTextColor={brand.creamMuted}
          value={form.description}
          onChangeText={(v) => onChange({ description: v.slice(0, 500) })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </Field>
    </ScrollView>
  );
}
