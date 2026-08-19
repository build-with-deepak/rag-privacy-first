import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Attaches the demo session token to every API call and clears the session
 * on a 401 — this app has no router, so the App component reacts to the
 * auth signal flipping and shows the login card again.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const token = auth.token;
  const authed =
    token && !req.url.includes('/api/auth/')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.handleUnauthorized();
      }
      return throwError(() => err);
    }),
  );
};
