// Site footer — v5. Format requested by the owner:
//   "2026 Jherico Balasa Ministry. {Name_Of_Page_Visited} All rights reserved. All Glory to God"
export default function SiteFooter({ pageName, showHelp = true }: { pageName: string; showHelp?: boolean }) {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';
  return (
    <footer className="text-center text-xs text-gray-600 pb-8 mt-8" data-testid="site-footer">
      <p>
        © {new Date().getFullYear()} Jherico Balasa Ministry. {pageName}. All rights reserved. All Glory to God.
      </p>
      {showHelp && (
        <p className="mt-1">
          Need help?{' '}
          <a href={`mailto:${email}`} className="text-[var(--green)] hover:underline">{email}</a>
        </p>
      )}
    </footer>
  );
}
