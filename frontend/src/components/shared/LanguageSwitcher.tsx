import { useEffect } from 'react'
import { Globe } from 'lucide-react'
import { cn } from '@/utils/cn'

const LANGUAGES = [
  { code: 'en', label: 'English', google: '/en/en' },
  { code: 'sw', label: 'Kiswahili', google: '/en/sw' },
  { code: 'fr', label: 'Français', google: '/en/fr' },
] as const

export type AppLanguage = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'cargolink_lang'

function setTranslateCookie(lang: AppLanguage) {
  const entry = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]
  const cookie = lang === 'en' ? '' : `googtrans=${entry.google}`
  document.cookie = cookie
    ? `${cookie};path=/;max-age=31536000`
    : 'googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT'
  localStorage.setItem(STORAGE_KEY, lang)
}

export function initGoogleTranslate() {
  if ((window as Window & { __cargolinkTranslateInit?: boolean }).__cargolinkTranslateInit) return
  ;(window as Window & { __cargolinkTranslateInit?: boolean }).__cargolinkTranslateInit = true

  const saved = (localStorage.getItem(STORAGE_KEY) as AppLanguage | null) ?? 'en'
  if (saved !== 'en') setTranslateCookie(saved)

  ;(window as Window & { googleTranslateElementInit?: () => void }).googleTranslateElementInit = () => {
    const host = document.getElementById('google_translate_element')
    if (!host || host.childElementCount > 0) return
    new (window as Window & { google?: { translate?: { TranslateElement: new (opts: object, id: string) => void } } })
      .google!.translate!.TranslateElement(
      { pageLanguage: 'en', includedLanguages: 'en,sw,fr', autoDisplay: false },
      'google_translate_element'
    )
  }

  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script')
    script.id = 'google-translate-script'
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.body.appendChild(script)
  }
}

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const current = (localStorage.getItem(STORAGE_KEY) as AppLanguage | null) ?? 'en'

  useEffect(() => {
    initGoogleTranslate()
  }, [])

  const change = (lang: AppLanguage) => {
    if (lang === current) return
    setTranslateCookie(lang)
    window.location.assign(window.location.pathname + window.location.search)
  }

  return (
    <div className={cn('notranslate flex items-center gap-2', compact && 'shrink-0')}>
      {!compact && <Globe className="h-4 w-4 text-charcoal/40" />}
      <select
        value={current}
        onChange={(e) => change(e.target.value as AppLanguage)}
        className={cn(
          'notranslate rounded-lg border border-forest/15 bg-white px-2 py-2 text-sm text-charcoal',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40',
          compact ? 'h-9 w-[120px]' : 'w-[140px]'
        )}
        aria-label="Select language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
