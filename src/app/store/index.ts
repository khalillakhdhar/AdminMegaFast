import { ActionReducerMap } from "@ngrx/store";
import { LayoutState, layoutReducer } from "./layouts/layouts.reducer";
import { AuthenticationState, authenticationReducer } from "./Authentication/authentication.reducer";


export interface RootReducerState {
    layout: LayoutState;
    auth: AuthenticationState;
}

export const rootReducer: ActionReducerMap<RootReducerState> = {
    layout: layoutReducer,
    auth: authenticationReducer
}
// Note: other feature reducers were intentionally removed from the root reducer per user's request to disable them for now. Originals remain in the repo if needed.
