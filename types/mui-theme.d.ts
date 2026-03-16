import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    semantic: {
      surface: {
        default: string;
        subtle: string;
        card: string;
        input: string;
      };
      border: {
        subtle: string;
        card: string;
        field: string;
      };
      text: {
        muted: string;
        faint: string;
      };
      auth: {
        pageBackground: string;
        cardBackground: string;
        fieldBackground: string;
        utilityButtonBg: string;
        cardBoxShadow: string;
      };
      sidebar: {
        background: string;
      };
      avatar: {
        background: string;
      };
      questionView: {
        background: string;
        border: string;
        questionTextColor: string;
      };
      solution: {
        background: string;
        border: string;
      };
      choice: {
        unselectedBorder: string;
      };
      table: {
        headColor: string;
        rowBorder: string;
        headBorder: string;
      };
      editor: {
        asteriskColor: string;
        wrapperBackground: string;
      };
      choiceEditor: {
        background: string;
        border: string;
      };
      choiceItem: {
        background: string;
        border: string;
      };
      nav: {
        pillUnselectedText: string;
      };
    };
  }

  interface PaletteOptions {
    semantic?: {
      surface?: {
        default?: string;
        subtle?: string;
        card?: string;
        input?: string;
      };
      border?: {
        subtle?: string;
        card?: string;
        field?: string;
      };
      text?: {
        muted?: string;
        faint?: string;
      };
      auth?: {
        pageBackground?: string;
        cardBackground?: string;
        fieldBackground?: string;
        utilityButtonBg?: string;
        cardBoxShadow?: string;
      };
      sidebar?: {
        background?: string;
      };
      avatar?: {
        background?: string;
      };
      questionView?: {
        background?: string;
        border?: string;
        questionTextColor?: string;
      };
      solution?: {
        background?: string;
        border?: string;
      };
      choice?: {
        unselectedBorder?: string;
      };
      table?: {
        headColor?: string;
        rowBorder?: string;
        headBorder?: string;
      };
      editor?: {
        asteriskColor?: string;
        wrapperBackground?: string;
      };
      choiceEditor?: {
        background?: string;
        border?: string;
      };
      choiceItem?: {
        background?: string;
        border?: string;
      };
      nav?: {
        pillUnselectedText?: string;
      };
    };
  }
}
