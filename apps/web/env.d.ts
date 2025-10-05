/// <reference types="vite/client" />
interface ImportMetaEnv {
readonly VITE_FHIR_BASE_URL:string
readonly VITE_OIDC_AUTHORITY:string
readonly VITE_OIDC_CLIENT_ID:string
readonly VITE_OIDC_SCOPES:string
readonly VITE_FEATURE_VOICE_NOTES:string
readonly VITE_FEATURE_HANDOFF_PRO:string
readonly VITE_FEATURE_BCMA_PRO:string
}
interface ImportMeta { readonly env: ImportMetaEnv }