import { useEffect } from 'react'
import { Globe } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const LANGUAGES = [
  { code: 'en', label: 'English', google: '/en/en' },
  { code: 'sw', label: 'Kiswahili', google: '/en/sw' },
  { code: 'fr', label: 'Français', google: '/en/fr' },
] as const

export type AppLanguage = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'cargolink_lang'

function setTranslateCookie(lang: AppLanguage) {
  const entry = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]
  document.cookie = `googtrans=${entry.google};path=/`
  document.cookie = `googtrans=${entry.google};path=/;domain=${window.location.hostname}`
  localStorage.setItem(STORAGE_KEY, lang)
}

export function initGoogleTranslate() {
  if (document.getElementById('google-translate-script')) return

  const saved = (localStorage.getItem(STORAGE_KEY) as AppLanguage | null) ?? 'en'
  if (saved !== 'en') setTranslateCookie(saved)

  ;(window as Window & { googleTranslateElementInit?: () => void }).googleTranslateElementInit = () => {
    new (window as Window & { google?: { translate?: { TranslateElement: new (opts: object, id: string) => void } } })
      .google!.translate!.TranslateElement(
      { pageLanguage: 'en', includedLanguages: 'en,sw,fr', autoDisplay: false },
      'google_translate_element'
    )
  }

  const script = document.createElement('script')
  script.id = 'google-translate-script'
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
  script.async = true
  document.body.appendChild(script)
}

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const current = (localStorage.getItem(STORAGE_KEY) as AppLanguage | null) ?? 'en'

  useEffect(() => {
    initGoogleTranslate()
  }, [])

  const change = (lang: AppLanguage) => {
    if (lang === 'en') {
      document.cookie = 'googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT'
      localStorage.setItem(STORAGE_KEY, 'en')
      window.location.reload()
      return
    }
    setTranslateCookie(lang)
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2">
      {!compact && <Globe className="h-4 w-4 text-charcoal/40" />}
      <Select value={current} onValueChange={(v) => change(v as AppLanguage)}>
        <SelectTrigger className={compact ? 'h-9 w-[120px]' : 'w-[140px]'}>
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div id="google_translate_element" className="hidden" aria-hidden />
    </div>
  )
}
