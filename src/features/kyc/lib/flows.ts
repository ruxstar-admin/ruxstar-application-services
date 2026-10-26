import { KycService } from '@/services/kyc-service';
import type { KycFlow, KycUploadKind } from '@/types/kyc';
import {
  digitsOnly,
  endingIn,
  isValidAadhaar,
  isValidAccountNumber,
  isValidBusinessId,
  isValidDrivingLicence,
  isValidIfsc,
  upperAlnum,
} from './validators';

export interface FlowContext {
  token: string;
  answers: Record<string, string>;
}

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboard?: 'number-pad' | 'default';
  clean: (value: string) => string;
  isValid: (value: string) => boolean;
  /** Shown once the field is non-empty and invalid. */
  error: string;
}

export interface ReviewRow {
  label: string;
  detail: string;
}

interface StepBase {
  id: string;
  title: string;
  subtitle: string;
}

export type StepDef =
  | (StepBase & { kind: 'fields'; fields: FieldDef[]; onContinue: (ctx: FlowContext) => Promise<unknown> })
  | (StepBase & { kind: 'otp'; onVerify: (ctx: FlowContext, otp: string) => Promise<unknown> })
  | (StepBase & { kind: 'photo'; hint: string; camera: 'front' | 'back'; fileKind: KycUploadKind })
  | (StepBase & { kind: 'review'; rows: (answers: Record<string, string>) => ReviewRow[] });

export interface FlowDef {
  id: KycFlow;
  title: string;
  steps: StepDef[];
  doneTitle: string;
  doneMessage: string;
}

const aadhaarField: FieldDef = {
  key: 'aadhaar',
  label: 'Aadhaar number',
  placeholder: '1234 5678 9012',
  keyboard: 'number-pad',
  clean: (v) => digitsOnly(v, 12),
  isValid: isValidAadhaar,
  error: 'Aadhaar is 12 digits and does not start with 0 or 1.',
};

const accountField: FieldDef = {
  key: 'accountNumber',
  label: 'Account number',
  placeholder: 'Account number',
  keyboard: 'number-pad',
  clean: (v) => digitsOnly(v, 18),
  isValid: isValidAccountNumber,
  error: 'Account numbers have 9 to 18 digits.',
};

const ifscField: FieldDef = {
  key: 'ifsc',
  label: 'IFSC',
  placeholder: 'HDFC0001234',
  clean: (v) => upperAlnum(v, 11),
  isValid: isValidIfsc,
  error: 'IFSC is 11 characters, like HDFC0001234.',
};

const BASE_FLOW: FlowDef = {
  id: 'base',
  title: 'Identity verification',
  doneTitle: 'Submitted for review',
  doneMessage: 'We are checking your documents. This usually takes a few minutes, and we will notify you.',
  steps: [
    {
      kind: 'fields',
      id: 'aadhaar',
      title: 'Start with your Aadhaar',
      subtitle: 'We use it once to confirm you are you. Ruxstar never shows it to anyone else.',
      fields: [aadhaarField],
      onContinue: ({ token, answers }) => KycService.aadhaarSendOtp(token, answers.aadhaar),
    },
    {
      kind: 'otp',
      id: 'aadhaar-otp',
      title: 'Enter the Aadhaar code',
      subtitle: 'Six digits sent to the mobile number linked with your Aadhaar.',
      onVerify: ({ token, answers }, otp) => KycService.aadhaarVerifyOtp(token, answers.aadhaar, otp),
    },
    {
      kind: 'photo',
      id: 'pan',
      title: 'Photograph your PAN card',
      subtitle: 'Needed for payouts above the tax-free limit.',
      hint: 'Lay the card flat, all four corners in frame, no glare.',
      camera: 'back',
      fileKind: 'pan',
    },
    {
      kind: 'photo',
      id: 'selfie',
      title: 'Take a selfie',
      subtitle: 'We match your face against your Aadhaar photo.',
      hint: 'Look straight at the camera in good light. No sunglasses.',
      camera: 'front',
      fileKind: 'selfie',
    },
    {
      kind: 'fields',
      id: 'bank',
      title: 'Where should money land?',
      subtitle: 'One account for every role you take on Ruxstar. Payouts and refunds both run through it.',
      fields: [accountField, ifscField],
      onContinue: ({ token, answers }) => KycService.saveBank(token, answers.accountNumber, answers.ifsc),
    },
    {
      kind: 'review',
      id: 'review',
      title: 'Check what you submit',
      subtitle: 'You can edit any step by going back.',
      rows: (a) => [
        { label: 'Aadhaar', detail: endingIn(a.aadhaar ?? '') },
        { label: 'PAN card', detail: 'Photo attached' },
        { label: 'Face match', detail: 'Selfie attached' },
        { label: 'Bank account', detail: endingIn(a.accountNumber ?? '') },
      ],
    },
  ],
};

const VENDOR_FLOW: FlowDef = {
  id: 'vendor',
  title: 'Vendor verification',
  doneTitle: 'Submitted for review',
  doneMessage: 'Once approved, your vendor portal opens and you can list services and take orders.',
  steps: [
    {
      kind: 'fields',
      id: 'business-id',
      title: 'GST or shop licence',
      subtitle: 'Either one works. A shop licence is fine for small stores.',
      fields: [
        {
          key: 'businessId',
          label: 'GST or shop licence number',
          placeholder: '29ABCDE1234F1Z5',
          clean: (v) => upperAlnum(v, 24),
          isValid: isValidBusinessId,
          error: 'Enter a valid GST number or shop licence number.',
        },
      ],
      onContinue: ({ token, answers }) => KycService.saveBusinessId(token, answers.businessId),
    },
    {
      kind: 'photo',
      id: 'shop',
      title: 'Show us your shop',
      subtitle: 'Helps customers recognise you in Discover.',
      hint: 'One photo of your shop front with the board visible.',
      camera: 'back',
      fileKind: 'shop',
    },
    {
      kind: 'review',
      id: 'review',
      title: 'Check before you submit',
      subtitle: 'Your identity is already verified, so this is the short add-on.',
      rows: (a) => [
        { label: 'Core KYC', detail: 'Approved earlier' },
        { label: 'GST or shop licence', detail: endingIn(a.businessId ?? '') },
        { label: 'Shop photo', detail: 'Photo attached' },
      ],
    },
  ],
};

const DELIVERY_FLOW: FlowDef = {
  id: 'delivery',
  title: 'Delivery verification',
  doneTitle: 'Submitted for review',
  doneMessage: 'Once approved, you can open the Ruxstar Partner app and start taking deliveries.',
  steps: [
    {
      kind: 'photo',
      id: 'licence-photo',
      title: 'Your driving licence',
      subtitle: 'Required before you can take any delivery job.',
      hint: 'Front side, clearly readable. The licence must be valid for six more months.',
      camera: 'back',
      fileKind: 'licence',
    },
    {
      kind: 'fields',
      id: 'licence-number',
      title: 'Licence number',
      subtitle: 'Type it as printed on the card.',
      fields: [
        {
          key: 'licenceNumber',
          label: 'Licence number',
          placeholder: 'KA0120190012345',
          clean: (v) => upperAlnum(v, 16),
          isValid: isValidDrivingLicence,
          error: 'Licence numbers look like KA0120190012345.',
        },
      ],
      onContinue: ({ token, answers }) => KycService.saveLicence(token, answers.licenceNumber),
    },
    {
      kind: 'photo',
      id: 'vehicle',
      title: 'Vehicle photo and RC',
      subtitle: 'Number plate must match the RC.',
      hint: 'One photo with the number plate visible, plus the RC book.',
      camera: 'back',
      fileKind: 'vehicle',
    },
    {
      kind: 'review',
      id: 'review',
      title: 'Check before you submit',
      subtitle: 'Core KYC is already approved. This is the delivery add-on.',
      rows: (a) => [
        { label: 'Core KYC', detail: 'Approved earlier' },
        { label: 'Driving licence', detail: endingIn(a.licenceNumber ?? '') },
        { label: 'Vehicle photo and RC', detail: 'Photo attached' },
      ],
    },
  ],
};

export const KYC_FLOWS: Record<KycFlow, FlowDef> = { base: BASE_FLOW, vendor: VENDOR_FLOW, delivery: DELIVERY_FLOW };
