/**
 * PrintConfigurator — full print order configuration form (theme-aware).
 * Uses an internal BrandCtx so nested sub-components share brand without prop drilling.
 */

import { createContext, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import { computePrice, pricingDimensions } from '@/lib/print-pricing';
import { categoryRequirements, notesPlaceholder } from '@/lib/print-requirements';
import type {
  PrintCategory,
  PrintShop,
  PrintOrderDraft,
  PriceSelection,
  PrintOrderAttributes,
} from '@/types/print';

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ─── Brand context (shared inside this file) ──────────────────────────────────

const BrandCtx = createContext<BrandTokens | null>(null);
const useBrand = () => useContext(BrandCtx)!;

// ─── Section type for per_page flow ──────────────────────────────────────────

type PageSection = { id: string; pages: string; color: 'bw' | 'color' };

// ─── Chip selector ────────────────────────────────────────────────────────────

function ChipSelector({
  label,
  options,
  value,
  onChange,
}: {
  label:    string;
  options:  string[];
  value:    string;
  onChange: (v: string) => void;
}) {
  const brand = useBrand();
  if (options.length === 0) return null;
  return (
    <View style={cs.fieldWrap}>
      <Text style={[cs.fieldLabel, { color: brand.creamSub }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.chipRow}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              style={[
                cs.chip,
                { borderColor: brand.border2, backgroundColor: brand.surface1 },
                active && { borderColor: brand.primary, backgroundColor: brand.primaryGlow },
              ]}
              onPress={() => onChange(active ? '' : opt)}
            >
              <Text style={[cs.chipText, { color: brand.creamSub }, active && { color: brand.primary, fontWeight: '700' }]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options:  { value: T; label: string }[];
  value:    T;
  onChange: (v: T) => void;
}) {
  const brand = useBrand();
  return (
    <View style={[cs.segWrap, { backgroundColor: brand.surface2 }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[
              cs.segBtn,
              active && { backgroundColor: brand.surface1, borderWidth: 1, borderColor: brand.border1 },
            ]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[cs.segText, { color: active ? brand.cream : brand.creamSub }, active && { fontWeight: '700' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label:    string;
  value:    number;
  min:      number;
  onChange: (v: number) => void;
}) {
  const brand = useBrand();
  return (
    <View style={cs.fieldWrap}>
      <Text style={[cs.fieldLabel, { color: brand.creamSub }]}>{label}</Text>
      <View style={cs.stepperRow}>
        <Pressable
          style={[
            cs.stepperBtn,
            { backgroundColor: brand.surface2, borderColor: brand.border2 },
            value <= min && cs.stepperBtnDisabled,
          ]}
          onPress={() => { if (value > min) onChange(value - 1); }}
          disabled={value <= min}
        >
          <Text style={[cs.stepperBtnText, { color: brand.cream }]}>−</Text>
        </Pressable>
        <TextInput
          style={[
            cs.stepperInput,
            { backgroundColor: brand.surface1, borderColor: brand.border2, color: brand.cream },
          ]}
          value={String(value)}
          keyboardType="number-pad"
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            if (!isNaN(n) && n >= min) onChange(n);
          }}
        />
        <Pressable
          style={[cs.stepperBtn, { backgroundColor: brand.surface2, borderColor: brand.border2 }]}
          onPress={() => onChange(value + 1)}
        >
          <Text style={[cs.stepperBtnText, { color: brand.cream }]}>+</Text>
        </Pressable>
      </View>
      {min > 1 && <Text style={[cs.fieldHint, { color: brand.creamMuted }]}>Minimum {min}</Text>}
    </View>
  );
}

// ─── Per-unit form ────────────────────────────────────────────────────────────

function UnitForm({
  minQty, quantity, onQuantity,
  dims, options, onOption,
  mode, onMode,
  extraFields, extras, onExtra,
}: {
  minQty:      number;
  quantity:    number;
  onQuantity:  (v: number) => void;
  dims:        { key: string; label: string; values: string[] }[];
  options:     Record<string, string>;
  onOption:    (key: string, value: string) => void;
  mode:        'guided' | 'upload';
  onMode:      (m: 'guided' | 'upload') => void;
  extraFields: { key: string; label: string; type: string; placeholder: string }[];
  extras:      Record<string, string>;
  onExtra:     (key: string, value: string) => void;
}) {
  const brand = useBrand();
  const shownDims = mode === 'upload' ? dims.filter((d) => d.key === 'size' || d.key === 'sides') : dims;

  return (
    <View style={cs.section}>
      <Stepper label="Quantity *" value={quantity} min={minQty} onChange={onQuantity} />
      <Segmented
        options={[
          { value: 'guided', label: 'Choose options' },
          { value: 'upload', label: 'Upload artwork' },
        ]}
        value={mode}
        onChange={onMode}
      />
      {shownDims.map((dim) => (
        <ChipSelector
          key={dim.key}
          label={dim.label}
          options={dim.values}
          value={options[dim.key] ?? ''}
          onChange={(v) => onOption(dim.key, v)}
        />
      ))}
      {mode === 'guided' && extraFields.map((f) => (
        <View key={f.key} style={cs.fieldWrap}>
          <Text style={[cs.fieldLabel, { color: brand.creamSub }]}>{f.label}</Text>
          <TextInput
            style={[
              cs.textInput,
              { backgroundColor: brand.surface1, borderColor: brand.border2, color: brand.cream },
              f.type === 'textarea' && cs.textArea,
            ]}
            value={extras[f.key] ?? ''}
            placeholder={f.placeholder}
            placeholderTextColor={brand.creamMuted}
            onChangeText={(v) => onExtra(f.key, v)}
            multiline={f.type === 'textarea'}
            numberOfLines={f.type === 'textarea' ? 3 : 1}
          />
        </View>
      ))}
    </View>
  );
}

// ─── Per-page form ────────────────────────────────────────────────────────────

function PerPageForm({
  minQty, copies, onCopies,
  pageMode, onPageMode,
  simplePages, onSimplePages,
  simpleColor, onSimpleColor,
  sections, onSections,
  doubleSided, onDoubleSided,
  binding, onBinding, bindingOptions,
  paperSize, onPaperSize, sizeOptions,
}: {
  minQty:        number;
  copies:        number;
  onCopies:      (v: number) => void;
  pageMode:      'simple' | 'sections';
  onPageMode:    (m: 'simple' | 'sections') => void;
  simplePages:   string;
  onSimplePages: (v: string) => void;
  simpleColor:   'bw' | 'color';
  onSimpleColor: (c: 'bw' | 'color') => void;
  sections:      PageSection[];
  onSections:    (s: PageSection[]) => void;
  doubleSided:   boolean;
  onDoubleSided: (v: boolean) => void;
  binding:       string;
  onBinding:     (v: string) => void;
  bindingOptions: string[];
  paperSize:     string;
  onPaperSize:   (v: string) => void;
  sizeOptions:   string[];
}) {
  const brand = useBrand();

  return (
    <View style={cs.section}>
      <Stepper label="Copies *" value={copies} min={minQty} onChange={onCopies} />
      <Segmented
        options={[
          { value: 'simple',   label: 'All pages same' },
          { value: 'sections', label: 'By section' },
        ]}
        value={pageMode}
        onChange={onPageMode}
      />

      {pageMode === 'simple' ? (
        <View style={cs.row2}>
          <View style={[cs.fieldWrap, { flex: 1 }]}>
            <Text style={[cs.fieldLabel, { color: brand.creamSub }]}>Number of pages *</Text>
            <TextInput
              style={[cs.textInput, { backgroundColor: brand.surface1, borderColor: brand.border2, color: brand.cream }]}
              value={simplePages}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={brand.creamMuted}
              onChangeText={onSimplePages}
            />
          </View>
          <View style={[cs.fieldWrap, { flex: 1 }]}>
            <Text style={[cs.fieldLabel, { color: brand.creamSub }]}>Print colour</Text>
            <Segmented
              options={[
                { value: 'bw',    label: 'B/W' },
                { value: 'color', label: 'Colour' },
              ]}
              value={simpleColor}
              onChange={onSimpleColor}
            />
          </View>
        </View>
      ) : (
        <View style={cs.fieldWrap}>
          <Text style={[cs.fieldLabel, { color: brand.creamSub }]}>Page groups</Text>
          <Text style={[cs.fieldHint, { color: brand.creamMuted }]}>e.g. cover in colour, body in B/W</Text>
          {sections.map((sec, i) => (
            <View key={sec.id} style={cs.sectionRow}>
              <TextInput
                style={[cs.textInput, cs.sectionInput, { backgroundColor: brand.surface1, borderColor: brand.border2, color: brand.cream }]}
                value={sec.pages}
                keyboardType="number-pad"
                placeholder="Pages"
                placeholderTextColor={brand.creamMuted}
                onChangeText={(t) =>
                  onSections(sections.map((s) => (s.id === sec.id ? { ...s, pages: t } : s)))
                }
              />
              <Segmented
                options={[
                  { value: 'bw',    label: 'B/W' },
                  { value: 'color', label: 'Colour' },
                ]}
                value={sec.color}
                onChange={(c) =>
                  onSections(sections.map((s) => (s.id === sec.id ? { ...s, color: c } : s)))
                }
              />
              {sections.length > 1 && (
                <Pressable
                  onPress={() => onSections(sections.filter((s) => s.id !== sec.id))}
                  style={cs.removeBtn}
                  accessibilityLabel={`Remove group ${i + 1}`}
                >
                  <Ionicons name="close" size={14} color={brand.error} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable
            style={[cs.addGroupBtn, { borderColor: brand.border2 }]}
            onPress={() =>
              onSections([...sections, { id: String(Date.now()), pages: '', color: 'bw' }])
            }
          >
            <Text style={[cs.addGroupBtnText, { color: brand.creamSub }]}>+ Add group</Text>
          </Pressable>
        </View>
      )}

      {/* Double-sided toggle */}
      <Pressable style={cs.toggleRow} onPress={() => onDoubleSided(!doubleSided)}>
        <View style={[
          cs.checkbox,
          { borderColor: brand.border2, backgroundColor: brand.surface1 },
          doubleSided && { backgroundColor: brand.primary, borderColor: brand.primary },
        ]}>
          {doubleSided && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
        <Text style={[cs.toggleLabel, { color: brand.cream }]}>Double-sided</Text>
      </Pressable>

      {sizeOptions.length > 0 && (
        <ChipSelector label="Paper size" options={sizeOptions} value={paperSize} onChange={onPaperSize} />
      )}
      {bindingOptions.length > 0 && (
        <ChipSelector label="Binding" options={bindingOptions} value={binding} onChange={onBinding} />
      )}
    </View>
  );
}

// ─── File upload section ──────────────────────────────────────────────────────

function FileUploadSection({
  perPage, designFileName, uploading, onPickFile, onRemove,
}: {
  perPage:        boolean;
  designFileName: string;
  uploading:      boolean;
  onPickFile:     () => void;
  onRemove:       () => void;
}) {
  const brand = useBrand();
  const hasFile = Boolean(designFileName);
  return (
    <View style={[cs.uploadBox, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <Text style={[cs.uploadLabel, { color: brand.creamSub }]}>
        {perPage ? 'Upload document ' : 'Upload artwork '}
        <Text style={{ color: brand.creamMuted, fontWeight: '400' }}>(optional)</Text>
      </Text>
      {hasFile ? (
        <View style={[cs.fileChip, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
          <Text style={cs.fileChipIcon}>📎</Text>
          <Text style={[cs.fileChipName, { color: brand.cream }]} numberOfLines={1}>{designFileName}</Text>
          <Pressable onPress={onRemove} style={cs.fileChipRemove}>
            <Ionicons name="close" size={14} color={brand.error} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[
            cs.uploadBtn,
            { borderColor: brand.primary, backgroundColor: brand.primaryGlow },
            uploading && cs.uploadBtnDisabled,
          ]}
          onPress={onPickFile}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={brand.primary} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color={brand.primary} />
              <Text style={[cs.uploadBtnText, { color: brand.primary }]}>
                {perPage ? 'Pick PDF or image' : 'Pick image'}
              </Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PrintConfigurator({
  category,
  shop,
  city,
  onBack,
  onCheckout,
}: {
  category:   PrintCategory;
  shop:       PrintShop;
  city:       string;
  onBack:     () => void;
  onCheckout: (draft: PrintOrderDraft) => void;
}) {
  const { brand } = useTheme();
  const perPage = category.pricingModel === 'per_page';
  const minQty  = Math.max(1, shop.minQuantity || category.minQuantity || 1);

  const [notes,          setNotes]          = useState('');
  const [designImage,    setDesignImage]     = useState('');
  const [designFileName, setDesignFileName]  = useState('');
  const [uploading,      setUploading]       = useState(false);
  const [error,          setError]           = useState('');

  const dims        = useMemo(() => pricingDimensions(category), [category]);
  const extraFields = useMemo(
    () => categoryRequirements(category).filter((f) => f.type === 'text' || f.type === 'textarea'),
    [category],
  );
  const [quantity, setQuantity] = useState(minQty);
  const [options,  setOptions]  = useState<Record<string, string>>({});
  const [unitMode, setUnitMode] = useState<'guided' | 'upload'>('guided');
  const [extras,   setExtras]   = useState<Record<string, string>>({});

  const [copies,      setCopies]      = useState(minQty);
  const [pageMode,    setPageMode]    = useState<'simple' | 'sections'>('simple');
  const [simplePages, setSimplePages] = useState('');
  const [simpleColor, setSimpleColor] = useState<'bw' | 'color'>('bw');
  const [sections,    setSections]    = useState<PageSection[]>([{ id: 'initial', pages: '', color: 'bw' }]);
  const [doubleSided, setDoubleSided] = useState(false);
  const [binding,     setBinding]     = useState('');
  const [paperSize,   setPaperSize]   = useState('');

  const selection: PriceSelection = perPage
    ? {
        copies,
        sections: (pageMode === 'simple'
          ? [{ pages: Math.round(Number(simplePages) || 0), color: simpleColor }]
          : sections.map((s) => ({ pages: Math.round(Number(s.pages) || 0), color: s.color }))
        ).filter((s) => s.pages > 0),
        doubleSided,
        binding:   binding   || undefined,
        paperSize: paperSize || undefined,
      }
    : { quantity, options };

  const price = computePrice(category, shop.pricing, selection);

  /** Reads a local picked-file uri into the `data:<mime>;base64,...` shape the backend expects. */
  async function loadAsDataUri(uri: string, mimeType: string, name: string) {
    const base64 = await new File(uri).base64();
    setDesignImage(`data:${mimeType};base64,${base64}`);
    setDesignFileName(name);
  }

  async function handlePickFile() {
    setError('');
    setUploading(true);
    try {
      if (perPage) {
        // Documents (per-page pricing) — actually let the vendor pick a PDF,
        // not just photos, since that's what the button already promises.
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        await loadAsDataUri(asset.uri, asset.mimeType ?? 'application/pdf', asset.name ?? 'document');
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to upload your file.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'image';
      await loadAsDataUri(asset.uri, asset.mimeType ?? 'image/jpeg', name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setUploading(false);
    }
  }

  function validate(): string | null {
    if (perPage) {
      if (copies < minQty) return `Minimum ${minQty} cop${minQty === 1 ? 'y' : 'ies'}.`;
      const pages = (selection.sections ?? []).reduce((sum, s) => sum + s.pages, 0);
      if (pages <= 0) return 'Enter the number of pages to print.';
    } else {
      if (quantity < minQty) return `Minimum quantity is ${minQty}.`;
      for (const field of categoryRequirements(category)) {
        if (!field.required) continue;
        if (['size', 'material', 'printType', 'color'].includes(field.key)) {
          if (unitMode === 'upload' && field.key !== 'size') continue;
          if (!options[field.key]) return `Select ${field.label.toLowerCase()}.`;
        }
      }
    }
    if (price.total <= 0) return 'This configuration has no price. Adjust your options.';
    return null;
  }

  function buildAttributes(): PrintOrderAttributes {
    if (perPage) {
      const pages    = (selection.sections ?? []).reduce((sum, s) => sum + s.pages, 0);
      const hasColor = (selection.sections ?? []).some((s) => s.color === 'color');
      const extrasOut: Record<string, string> = {
        pages:     String(pages),
        colorMode: hasColor ? 'colour' : 'black & white',
        copies:    String(copies),
      };
      if (doubleSided) extrasOut.doubleSided = 'yes';
      if (binding)     extrasOut.binding     = binding;
      if (paperSize)   extrasOut.paperSize   = paperSize;
      return { extras: extrasOut };
    }
    const attrs: PrintOrderAttributes = {};
    if (options.size)      attrs.size      = options.size;
    if (options.material)  attrs.material  = options.material;
    if (options.printType) attrs.printType = options.printType;
    if (options.color)     attrs.color     = options.color;
    const extrasOut: Record<string, string> = {};
    if (options.sides) extrasOut.sides = options.sides;
    for (const [k, v] of Object.entries(extras)) {
      if (v.trim()) extrasOut[k] = v.trim();
    }
    if (Object.keys(extrasOut).length) attrs.extras = extrasOut;
    return attrs;
  }

  function submit() {
    const err = validate();
    if (err) { setError(err); return; }
    onCheckout({
      category,
      shop,
      city,
      quantity: perPage ? copies : quantity,
      selection,
      attributes: buildAttributes(),
      notes:      notes.trim(),
      designImage:    designImage    || undefined,
      designFileName: designFileName || undefined,
      price,
    });
  }

  return (
    <BrandCtx.Provider value={brand}>
      <View style={cf.wrap}>
        {/* Header */}
        <View style={[cf.header, { borderBottomColor: brand.border1 }]}>
          <Pressable style={cf.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={16} color={brand.creamSub} />
            <Text style={[cf.backText, { color: brand.creamSub }]}>Back to shops</Text>
          </Pressable>
          <View style={cf.catRow}>
            <View style={[cf.catIcon, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
              <Text style={cf.catIconText}>{category.icon}</Text>
            </View>
            <View style={cf.catMeta}>
              <Text style={[cf.catLabel, { color: brand.cream }]}>{category.label}</Text>
              <Text style={[cf.shopMeta, { color: brand.creamSub }]} numberOfLines={1}>
                {shop.name}{shop.turnaroundDays > 0 ? ` · ~${shop.turnaroundDays}d turnaround` : ''}
              </Text>
            </View>
          </View>
          {error ? (
            <View style={[cf.errorBanner, { backgroundColor: `${brand.error}10`, borderColor: `${brand.error}25` }]}>
              <Ionicons name="alert-circle-outline" size={14} color={brand.error} />
              <Text style={[cf.errorText, { color: brand.error }]}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Scrollable form */}
        <ScrollView
          style={cf.scroll}
          contentContainerStyle={cf.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {perPage ? (
            <PerPageForm
              minQty={minQty}
              copies={copies}
              onCopies={setCopies}
              pageMode={pageMode}
              onPageMode={setPageMode}
              simplePages={simplePages}
              onSimplePages={setSimplePages}
              simpleColor={simpleColor}
              onSimpleColor={setSimpleColor}
              sections={sections}
              onSections={setSections}
              doubleSided={doubleSided}
              onDoubleSided={setDoubleSided}
              binding={binding}
              onBinding={setBinding}
              bindingOptions={category.bindingOptions}
              paperSize={paperSize}
              onPaperSize={setPaperSize}
              sizeOptions={category.sizes}
            />
          ) : (
            <UnitForm
              minQty={minQty}
              quantity={quantity}
              onQuantity={setQuantity}
              dims={dims}
              options={options}
              onOption={(k, v) => setOptions((prev) => ({ ...prev, [k]: v }))}
              mode={unitMode}
              onMode={setUnitMode}
              extraFields={extraFields}
              extras={extras}
              onExtra={(k, v) => setExtras((prev) => ({ ...prev, [k]: v }))}
            />
          )}

          <FileUploadSection
            perPage={perPage}
            designFileName={designFileName}
            uploading={uploading}
            onPickFile={handlePickFile}
            onRemove={() => { setDesignImage(''); setDesignFileName(''); }}
          />

          {/* Notes */}
          <View style={cs.fieldWrap}>
            <Text style={[cs.fieldLabel, { color: brand.creamSub }]}>
              Notes{' '}
              <Text style={{ color: brand.creamMuted, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <TextInput
              style={[cs.textInput, cs.textArea, { backgroundColor: brand.surface1, borderColor: brand.border2, color: brand.cream }]}
              value={notes}
              placeholder={notesPlaceholder(category)}
              placeholderTextColor={brand.creamMuted}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={[cf.footer, { borderTopColor: brand.border1, backgroundColor: brand.bg }]}>
          <View>
            <Text style={[cf.totalLabel, { color: brand.creamMuted }]}>Total</Text>
            <Text style={[cf.totalPrice, { color: brand.success }]}>
              {price.total > 0 ? money(price.total) : '—'}
            </Text>
            {perPage && price.totalPages ? (
              <Text style={[cf.totalSub, { color: brand.creamSub }]}>
                {price.totalPages} pages × {copies} cop{copies === 1 ? 'y' : 'ies'}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={[cf.checkoutBtn, { backgroundColor: brand.primary }, (uploading || price.total <= 0) && cf.checkoutBtnDisabled]}
            onPress={submit}
            disabled={uploading || price.total <= 0}
          >
            <Text style={cf.checkoutBtnText}>Review & pay</Text>
          </Pressable>
        </View>
      </View>
    </BrandCtx.Provider>
  );
}

// ─── Shared field styles (layout only) ───────────────────────────────────────

const cs = StyleSheet.create({
  section:   { gap: Spacing.three },
  fieldWrap: { gap: 6 },
  fieldLabel:{ fontSize: 13, fontWeight: '600' },
  fieldHint: { fontSize: 11 },

  textInput: {
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.three,
    paddingVertical:   11,
    fontSize:          14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  row2: { flexDirection: 'row', gap: Spacing.two },

  chipRow: { marginTop: 2 },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical:   8,
    borderRadius:      Radius.pill,
    borderWidth:       1,
    marginRight:       Spacing.two,
  },
  chipText: { fontSize: 13 },

  segWrap: {
    flexDirection: 'row',
    borderRadius:  Radius.pill,
    padding:       3,
  },
  segBtn: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius:   Radius.pill,
  },
  segText: { fontSize: 13 },

  stepperRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepperBtn: {
    width:        40,
    height:       40,
    borderRadius: 20,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperBtnText:     { fontSize: 20, lineHeight: 24 },
  stepperInput: {
    width:        70,
    textAlign:    'center',
    borderRadius: Radius.md,
    borderWidth:  1,
    paddingVertical: 9,
    fontSize:     16,
    fontWeight:   '700',
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
    marginBottom:  Spacing.two,
  },
  sectionInput: { width: 90, flex: undefined },
  removeBtn:    { padding: 4 },
  addGroupBtn: {
    alignSelf:         'flex-start',
    borderWidth:       1,
    borderRadius:      Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical:   8,
    marginTop:         Spacing.one,
  },
  addGroupBtnText: { fontSize: 13 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: {
    width:        22,
    height:       22,
    borderRadius: 6,
    borderWidth:  1.5,
    alignItems:   'center',
    justifyContent: 'center',
  },
  toggleLabel: { fontSize: 14 },

  uploadBox: {
    borderRadius: Radius.lg,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.two,
  },
  uploadLabel:    { fontSize: 13, fontWeight: '600' },
  uploadBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.two,
    borderWidth:     1.5,
    borderStyle:     'dashed',
    borderRadius:    Radius.md,
    paddingVertical: Spacing.three,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText:     { fontSize: 14, fontWeight: '600' },

  fileChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.three,
    paddingVertical:   10,
  },
  fileChipIcon:   { fontSize: 16 },
  fileChipName:   { flex: 1, fontSize: 13 },
  fileChipRemove: { padding: 2 },
});

// ─── Configurator layout styles (layout only) ─────────────────────────────────

const cf = StyleSheet.create({
  wrap:   { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop:        Spacing.three,
    paddingBottom:     Spacing.three,
    borderBottomWidth: 1,
    gap:               Spacing.two,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    alignSelf:     'flex-start',
  },
  backText: { fontSize: 13 },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: 4 },
  catIcon: {
    width:        48,
    height:       48,
    borderRadius: Radius.md,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },
  catIconText: { fontSize: 22 },
  catMeta:     { flex: 1 },
  catLabel:    { fontSize: 17, fontWeight: '700' },
  shopMeta:    { fontSize: 12, marginTop: 2 },

  errorBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.three,
    paddingVertical:   10,
    marginTop:         Spacing.one,
  },
  errorText: { flex: 1, fontSize: 13 },

  scroll:        { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop:        Spacing.three,
    paddingBottom:     Spacing.six,
    gap:               Spacing.three,
  },

  footer: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical:   Spacing.three,
    borderTopWidth:    1,
    gap:               Spacing.three,
  },
  totalLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  totalPrice: { fontSize: 26, fontWeight: '800' },
  totalSub:   { fontSize: 11, marginTop: 1 },

  checkoutBtn: {
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical:   14,
  },
  checkoutBtnDisabled: { opacity: 0.45 },
  checkoutBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});
