# Instrukcja Deployment - PPP-Program

## Przygotowanie do deploymentu

Aplikacja PPP-Program jest gotowa do hostowania na zewnętrznym serwerze. Poniżej znajdziesz instrukcje dla różnych platform hostingowych.

## 1. Budowanie aplikacji

```bash
# Zainstaluj zależności
npm install

# Zbuduj aplikację na produkcję
npm run build
```

Po wykonaniu tych komend, katalog `dist/` będzie zawierał gotową aplikację do wrzucenia na serwer.

## 2. Hosting na różnych platformach

### A) Klasyczny hosting (Apache/Nginx)

#### Apache
1. Wrzuć zawartość katalogu `dist/` do katalogu głównego serwera (np. `public_html/`)
2. Plik `.htaccess` został już przygotowany w `public/.htaccess`
3. Skopiuj go do katalogu głównego na serwerze

#### Nginx
Dodaj do konfiguracji Nginx:
```nginx
server {
    listen 80;
    server_name www.ppp-program.pl ppp-program.pl;
    
    root /path/to/your/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Kompresja
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache statycznych plików
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### B) Netlify
1. Zaloguj się na [Netlify](https://netlify.com)
2. Przeciągnij katalog `dist/` na dashboard
3. Plik `_redirects` został już przygotowany w `public/_redirects`

### C) Vercel
```bash
# Zainstaluj Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### D) Hostinger / MyDevil / inne
1. Wrzuć zawartość `dist/` przez FTP do `public_html/`
2. Upewnij się, że `.htaccess` jest skopiowany
3. Sprawdź czy hosting obsługuje SPA (Single Page Applications)

## 3. Konfiguracja bazy danych (Supabase)

Aplikacja używa Supabase. Dane połączenia są już skonfigurowane w `src/integrations/supabase/client.ts`.

Jeśli chcesz użyć własnej instancji Supabase:
1. Utwórz projekt na [Supabase](https://supabase.com)
2. Zaimportuj schemat bazy z plików w `supabase/migrations/`
3. Zaktualizuj URL i klucze w `client.ts`

## 4. Zmienne środowiskowe

Aplikacja nie używa zmiennych środowiskowych - wszystkie konfiguracje są hardcoded dla bezpieczeństwa.

## 5. SSL/HTTPS

Dla bezpieczeństwa zalecamy używanie HTTPS. Większość hostingów oferuje darmowe certyfikaty SSL.

## 6. Monitoring i analiza

Po wdrożeniu możesz dodać:
- Google Analytics
- Monitoring błędów (Sentry)
- Monitoring wydajności

## 7. Aktualizacje

Aby zaktualizować aplikację:
1. Pobierz najnowszy kod
2. Wykonaj `npm run build`
3. Zamień pliki na serwerze

## 8. Wsparcie techniczne

W przypadku problemów:
- Sprawdź logi serwera
- Upewnij się, że wszystkie pliki zostały przesłane
- Sprawdź czy `.htaccess` działa poprawnie
- Kontakt: sebastian@ppp-program.pl

## 9. Optymalizacja wydajności

- Aplikacja używa lazy loading
- Obrazy są zoptymalizowane
- CSS i JS są minifikowane
- Gzip compression jest włączona

## 10. Kompatybilność przeglądarek

Aplikacja wspiera:
- Chrome (ostatnie 2 wersje)
- Firefox (ostatnie 2 wersje)  
- Safari (ostatnie 2 wersje)
- Edge (ostatnie 2 wersje)

---

**PPP-Program by Sebastian Popiel**  
https://www.PPP-PROGRAM.pl