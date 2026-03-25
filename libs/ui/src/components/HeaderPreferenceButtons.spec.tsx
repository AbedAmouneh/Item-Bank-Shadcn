import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { useLanguage } from '../hooks/UseLanguage';
import { useSwitchTheme } from '../hooks/theme';
import HeaderPreferenceButtons from './HeaderPreferenceButtons';

jest.mock('../hooks/UseLanguage');
jest.mock('../hooks/theme');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseLanguage = jest.mocked(useLanguage);
const mockUseSwitchTheme = jest.mocked(useSwitchTheme);

describe('HeaderPreferenceButtons', () => {
  it('toggles theme and language from English to Arabic', () => {
    const setLanguage = jest.fn();
    const switchTheme = jest.fn();

    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage,
    });
    mockUseSwitchTheme.mockReturnValue({
      colorScheme: 'light',
      mode: 'light',
      switchTheme,
    });

    render(<HeaderPreferenceButtons />);

    fireEvent.click(screen.getByLabelText('table_actions.theme'));
    fireEvent.click(screen.getByLabelText('table_actions.language'));

    expect(switchTheme).toHaveBeenCalledTimes(1);
    expect(setLanguage).toHaveBeenCalledWith('ar');
  });

  it('toggles language from Arabic to English', () => {
    const setLanguage = jest.fn();

    mockUseLanguage.mockReturnValue({
      language: 'ar',
      setLanguage,
    });
    mockUseSwitchTheme.mockReturnValue({
      colorScheme: 'dark',
      mode: 'dark',
      switchTheme: jest.fn(),
    });

    render(<HeaderPreferenceButtons />);

    fireEvent.click(screen.getByLabelText('table_actions.language'));

    expect(setLanguage).toHaveBeenCalledWith('en');
  });
});
