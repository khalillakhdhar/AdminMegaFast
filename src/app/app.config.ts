import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection,
} from "@angular/core";
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";

// AngularFire imports
import { AngularFireModule } from "@angular/fire/compat";
import { AngularFireAuthModule } from "@angular/fire/compat/auth";
import { AngularFirestoreModule } from "@angular/fire/compat/firestore";
import { environment } from "../environments/environment";

// Other module imports
import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { provideToastr } from "ngx-toastr";
import { provideStore } from "@ngrx/store";
import { rootReducer } from "./store";
import { routes } from "./app.routes";
import { provideRouter } from "@angular/router";
import { provideAnimations } from "@angular/platform-browser/animations";
import { BsDropdownConfig } from "ngx-bootstrap/dropdown";
import { BsModalService, ModalModule } from "ngx-bootstrap/modal";
import { GlobalErrorHandler } from "./core/services/global-error-handler.service";

export function createTranslateLoader(http: HttpClient): any {
  return new TranslateHttpLoader(http, "assets/i18n/", ".json");
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideStore(rootReducer),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(
      AngularFireModule.initializeApp(environment.firebaseConfig),
      AngularFireAuthModule,
      AngularFirestoreModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient],
        },
      }),
      ModalModule.forRoot()
    ),
    provideAnimations(),
    provideToastr(),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    {
      provide: BsDropdownConfig,
      useValue: { isAnimated: true, autoClose: true },
    },
    BsModalService,
  ],
};
