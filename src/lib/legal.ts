import * as WebBrowser from 'expo-web-browser';
import { WEBSITE_URL } from '@/constants/config';
import { Brand } from '@/constants/theme';

/** Opens the website's Terms or Privacy page in an in-app browser, so the form underneath keeps its state. */
export const openLegal = (page: 'terms' | 'privacy') =>
  WebBrowser.openBrowserAsync(`${WEBSITE_URL}/${page}`, {
    toolbarColor: Brand.bg,
    controlsColor: Brand.primary,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
