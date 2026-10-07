import { Quill } from 'react-quill-new';

const Font = Quill.import('formats/font') as { whitelist: string[] };
Font.whitelist = [
  'sans-serif',
  'serif',
  'monospace',
  'arial',
  'times-new-roman',
  'roboto',
  'tahoma',
  'verdana',
];
Quill.register(Font as unknown as Parameters<typeof Quill.register>[0], true);

export const QUILL_FONT_OPTIONS = [
  'sans-serif',
  'serif',
  'monospace',
  'arial',
  'times-new-roman',
  'roboto',
  'tahoma',
  'verdana',
];
