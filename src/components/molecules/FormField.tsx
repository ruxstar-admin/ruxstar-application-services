/**
 * FormField — Molecule
 *
 * Combines: Label atom + InputField atom + error/helper text
 * into one self-contained form field with a consistent layout.
 *
 * This is a thin composition wrapper — all logic lives in InputField.
 * Use this in registration/profile forms for consistent spacing.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import type { TextInputProps } from 'react-native';

import InputField from '@/components/ui/InputField';

interface FormFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingPress?: () => void;
  required?: boolean;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export default function FormField(props: FormFieldProps) {
  return <InputField {...props} />;
}

const styles = StyleSheet.create({});
