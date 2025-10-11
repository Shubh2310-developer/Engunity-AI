export interface EditorTheme {
  id: string;
  name: string;
  type: 'light' | 'dark';
  monacoTheme: string;
}

export const EDITOR_THEMES: EditorTheme[] = [
  {
    id: 'vs-dark',
    name: 'Dark',
    type: 'dark',
    monacoTheme: 'vs-dark',
  },
  {
    id: 'light',
    name: 'Light',
    type: 'light',
    monacoTheme: 'light',
  },
  {
    id: 'hc-black',
    name: 'High Contrast',
    type: 'dark',
    monacoTheme: 'hc-black',
  },
];

export const getTheme = (themeId: string): EditorTheme => {
  return EDITOR_THEMES.find(t => t.id === themeId) || EDITOR_THEMES[0];
};
