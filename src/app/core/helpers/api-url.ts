import { environment } from '../../../environments/environment';

/** Only the configured API origin and path may receive session credentials. */
export function isApiUrl(url: string): boolean {
  const base = new URL(environment.apiUrl, document.baseURI);
  const target = new URL(url, document.baseURI);
  const path = base.pathname.replace(/\/$/, '');
  return (
    target.origin === base.origin &&
    (target.pathname === path || target.pathname.startsWith(`${path}/`))
  );
}
