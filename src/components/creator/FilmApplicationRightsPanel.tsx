import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import {
  FILM_LEGAL_DECLARATIONS,
  FILM_RIGHTS_CATEGORIES,
  type FilmLegalDeclarationId,
  type FilmRightsCategoryId,
} from '../../constants/filmApplication'

export interface ApplicationDocument {
  id: string
  docType: string
  fileUrl: string
}

interface FilmApplicationRightsPanelProps {
  rightsDeclaration: Record<string, boolean>
  onRightsChange: (id: FilmRightsCategoryId | FilmLegalDeclarationId, checked: boolean) => void
  applicationDocs: ApplicationDocument[]
  uploadingDocType: string | null
  onUploadDocument: (docType: string, file: File) => void | Promise<void>
  onRemoveDocument: (id: string) => void
}

function docTypeLabel(docType: string) {
  return CREATOR_DOC_TYPES.find((entry) => entry.value === docType)?.label ?? docType
}

export function FilmApplicationRightsPanel({
  rightsDeclaration,
  onRightsChange,
  applicationDocs,
  uploadingDocType,
  onUploadDocument,
  onRemoveDocument,
}: FilmApplicationRightsPanelProps) {
  const { t } = useTranslation('creator')

  return (
    <div className="space-y-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div>
        <h3 className="text-base font-semibold text-amber-100">{t('rights.title')}</h3>
        <p className="mt-1 text-sm text-plooy-muted">{t('rights.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {FILM_RIGHTS_CATEGORIES.map((entry) => {
          const uploaded = applicationDocs.find((doc) => doc.docType === entry.docType)
          return (
            <div key={entry.id} className="rounded-lg border border-white/10 bg-[#0d0f14] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={rightsDeclaration[entry.id] === true}
                  onChange={(event) => onRightsChange(entry.id, event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-plooy-gold"
                />
                <span className="text-sm leading-relaxed text-white/90">{entry.declaration}</span>
              </label>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                <div>
                  <p className="text-xs font-medium text-plooy-muted">{entry.docLabel}</p>
                  {uploaded ? (
                    <a
                      href={uploaded.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-plooy-gold hover:underline"
                    >
                      {t('rights.docUploaded')}
                    </a>
                  ) : (
                    <p className="text-xs text-red-300/80">{t('rights.docRequired')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {uploaded && (
                    <button
                      type="button"
                      onClick={() => onRemoveDocument(uploaded.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {t('rights.remove')}
                    </button>
                  )}
                  <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5">
                    {uploadingDocType === entry.docType
                      ? t('rights.uploading')
                      : uploaded
                        ? t('rights.replace')
                        : t('rights.uploadDoc')}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      disabled={uploadingDocType !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void onUploadDocument(entry.docType, file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <p className="text-sm font-medium text-white">{t('rights.legalDeclarations')}</p>
        {FILM_LEGAL_DECLARATIONS.map((entry) => (
          <label key={entry.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5">
            <input
              type="checkbox"
              checked={rightsDeclaration[entry.id] === true}
              onChange={(event) => onRightsChange(entry.id, event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-plooy-gold"
            />
            <span className="text-sm text-white/80">{entry.text}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function isFilmApplicationReady(
  rightsDeclaration: Record<string, boolean>,
  applicationDocs: ApplicationDocument[],
) {
  const rightsOk = FILM_RIGHTS_CATEGORIES.every((entry) => rightsDeclaration[entry.id] === true)
  const legalOk = FILM_LEGAL_DECLARATIONS.every((entry) => rightsDeclaration[entry.id] === true)
  const docsOk = FILM_RIGHTS_CATEGORIES.every((entry) =>
    applicationDocs.some((doc) => doc.docType === entry.docType),
  )
  return rightsOk && legalOk && docsOk
}

export function missingApplicationMessage(
  rightsDeclaration: Record<string, boolean>,
  applicationDocs: ApplicationDocument[],
) {
  for (const entry of FILM_RIGHTS_CATEGORIES) {
    if (!rightsDeclaration[entry.id]) {
      return i18n.t('creator:validation.approveDeclaration', { label: entry.docLabel })
    }
    if (!applicationDocs.some((doc) => doc.docType === entry.docType)) {
      return i18n.t('creator:validation.uploadDocument', { label: entry.docLabel })
    }
  }
  for (const entry of FILM_LEGAL_DECLARATIONS) {
    if (!rightsDeclaration[entry.id]) return i18n.t('creator:validation.approveLegal')
  }
  return null
}

export function docTypeLabelForApplication(docType: string) {
  return docTypeLabel(docType)
}
