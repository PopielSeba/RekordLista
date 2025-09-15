# PPP-Program :: System Checklista

## O projekcie

**PPP-Program** to profesjonalny system zarządzania checklistami logistycznymi stworzony przez Sebastian Popiel.

**Strona internetowa**: https://www.PPP-PROGRAM.pl

## Technologie

Ten projekt został zbudowany z użyciem najnowszych technologii:

- **Vite** - szybki bundler i serwer deweloperski
- **TypeScript** - typowany JavaScript dla lepszej jakości kodu
- **React** - biblioteka do budowania interfejsów użytkownika
- **Supabase** - backend-as-a-service z bazą danych PostgreSQL
- **shadcn-ui** - komponenty UI wysokiej jakości
- **Tailwind CSS** - utility-first CSS framework
- **React DnD** - drag & drop dla React

## Instalacja i uruchomienie

### Wymagania wstępne

- Node.js (zalecana wersja 18+ lub nowsza)
- npm lub yarn

### Instrukcja instalacji

```sh
# Krok 1: Sklonuj repozytorium
git clone <URL_REPOZYTORIUM>

# Krok 2: Przejdź do katalogu projektu
cd ppp-program-checklist

# Krok 3: Zainstaluj zależności
npm install

# Krok 4: Uruchom serwer deweloperski
npm run dev
```

### Budowanie na produkcję

```sh
# Zbuduj aplikację na produkcję
npm run build

# Podgląd buildu produkcyjnego
npm run preview
```

## Konfiguracja bazy danych

Aplikacja używa Supabase jako backendu. Aby skonfigurować własną instancję:

1. Utwórz konto na [Supabase](https://supabase.com)
2. Utwórz nowy projekt
3. Skopiuj URL i Anon Key z ustawień projektu
4. Zaktualizuj `src/integrations/supabase/client.ts` z nowymi danymi

## Deployment

### Hosting na zewnętrznym serwerze

Aplikacja jest gotowa do hostowania na dowolnym serwerze obsługującym pliki statyczne:

1. **Zbuduj aplikację**: `npm run build`
2. **Wrzuć katalog `dist/`** na swój serwer
3. **Skonfiguruj serwer** aby obsługiwał SPA (Single Page Application)

### Konfiguracja serwera

#### Apache (.htaccess)

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

#### Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

#### Node.js (Express)

```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});
```

## Funkcjonalności

- 📋 **Zarządzanie projektami** - tworzenie i zarządzanie projektami logistycznymi
- 🏢 **System działów** - organizacja sprzętu według działów
- 📦 **Sprzęt z akcesoriami** - hierarchiczne zarządzanie sprzętem
- 🔄 **Drag & Drop** - intuicyjne przenoszenie sprzętu między lokalizacjami
- 📊 **System statusów** - śledzenie postępu z kolorowym oznaczeniem
- 🏪 **Magazyny pośrednie** - organizacja przed i po koordynacji
- 🚚 **Centrum koordynacji** - zarządzanie transportem
- 📄 **Drukowanie checklisty** - eksport do formatu do druku
- 📝 **System logów** - szczegółowe logi wszystkich zmian
- 👥 **Zarządzanie użytkownikami** - role i uprawnienia
- 🔐 **Bezpieczeństwo** - Row Level Security (RLS)

## Wsparcie

W przypadku pytań lub problemów, skontaktuj się:

- **Strona internetowa**: https://www.PPP-PROGRAM.pl
- **Autor**: Sebastian Popiel

## Licencja

Wszystkie prawa zastrzeżone © PPP-Program by Sebastian Popiel
