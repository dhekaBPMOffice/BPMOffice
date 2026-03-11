import { type Branding } from "@/types/database";

export interface OfficeBranding {
  logo_url?: string | null;
  primary_color?: string;
  header_html?: string | null;
  footer_html?: string | null;
}

export interface DocumentWrapperProps {
  children: React.ReactNode;
  officeBranding?: OfficeBranding | Branding | null;
}

export function DocumentWrapper({ children, officeBranding }: DocumentWrapperProps) {
  return (
    <div className="document-wrapper">
      {officeBranding?.header_html ? (
        <header
          className="document-header border-b pb-4 mb-4"
          dangerouslySetInnerHTML={{ __html: officeBranding.header_html }}
        />
      ) : (
        <header className="document-header border-b pb-4 mb-4 flex items-center gap-3">
          {officeBranding?.logo_url && (
            <img
              src={officeBranding.logo_url}
              alt="Logo"
              className="h-12 w-auto object-contain"
            />
          )}
          <div
            className="h-1 flex-1"
            style={{
              backgroundColor: officeBranding?.primary_color ?? "#0097a7",
            }}
          />
        </header>
      )}

      <main className="document-content">{children}</main>

      {officeBranding?.footer_html && (
        <footer
          className="document-footer border-t pt-4 mt-4 text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: officeBranding.footer_html }}
        />
      )}
    </div>
  );
}
